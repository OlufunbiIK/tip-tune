import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { CreateTrackDto } from './dto/create-track.dto';
import { TrackFilterDto } from './dto/pagination.dto';
import { StorageService } from '../storage/storage.service';
import { ActivitiesService } from '../activities/activities.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackUploadedEvent } from './events/track-uploaded.event';
import { TrackPlayedEvent } from './events/track-played.event';
import { LicensingService } from "@/track-listening-right-management/licensing.service";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);

  constructor(
    @InjectRepository(Track)
    private tracksRepository: Repository<Track>,
    private storageService: StorageService,
    @Inject(forwardRef(() => ActivitiesService))
    private activitiesService: ActivitiesService,
    private eventEmitter: EventEmitter2,
    private licensingService: LicensingService,
  ) {}

  async create(
    createTrackDto: CreateTrackDto,
    file?: Express.Multer.File,
  ): Promise<Track> {
    try {
      let audioUrl = createTrackDto.audioUrl;
      let filename: string;
      let url: string;
      let streamingUrl: string;
      let fileSize: bigint;
      let mimeType: string;

      if (file) {
        // Save file first
        const fileResult = await this.storageService.saveFile(file);
        const fileInfo = await this.storageService.getFileInfo(
          fileResult.filename,
        );

        filename = fileResult.filename;
        url = fileResult.url;
        streamingUrl = await this.storageService.getStreamingUrl(
          fileResult.filename,
        );
        fileSize = BigInt(fileInfo.size);
        mimeType = fileInfo.mimeType;
        audioUrl = url;
      }

      // Create track record
      const track = this.tracksRepository.create({
        ...createTrackDto,
        audioUrl,
        filename,
        url,
        streamingUrl,
        fileSize,
        mimeType,
      });

      const savedTrack = await this.tracksRepository.save(track);
      this.logger.log(`Track created successfully: ${savedTrack.id}`);

      try {
        await this.licensingService.assignDefaultLicense(savedTrack.id);
        this.logger.log(`Default license assigned to track: ${savedTrack.id}`);
      } catch (error) {
        this.logger.warn(`Failed to assign default license: ${error.message}`);
      }

      if (savedTrack.artistId) {
        this.eventEmitter.emit(
          "track.uploaded",
          new TrackUploadedEvent(savedTrack.id, savedTrack.artistId),
        );
      }

      // Track activity for new track
      if (savedTrack.artistId) {
        try {
          await this.activitiesService.trackNewTrack(
            savedTrack.artistId,
            savedTrack.id,
            {
              trackTitle: savedTrack.title,
              genre: savedTrack.genre,
              album: savedTrack.album,
            },
          );
        } catch (error) {
          // Log but don't fail track creation if activity tracking fails
          this.logger.warn(
            `Failed to track activity for new track: ${error.message}`,
          );
        }
      }

      return savedTrack;
    } catch (error) {
      this.logger.error(`Failed to create track: ${error.message}`);
      throw error;
    }
  }

  async findAll(filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
      ...filters
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tracksRepository
      .createQueryBuilder("track")
      .leftJoinAndSelect("track.artist", "artist")
      .orderBy(`track.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    // Apply filters
    if (filters.artistId) {
      queryBuilder.andWhere("track.artistId = :artistId", {
        artistId: filters.artistId,
      });
    }
    if (filters.genre) {
      queryBuilder.andWhere("track.genre = :genre", { genre: filters.genre });
    }
    if (filters.album) {
      queryBuilder.andWhere("track.album ILIKE :album", {
        album: `%${filters.album}%`,
      });
    }
    if (filters.isPublic !== undefined) {
      queryBuilder.andWhere("track.isPublic = :isPublic", {
        isPublic: filters.isPublic,
      });
    }
    if (filters.releaseDate) {
      queryBuilder.andWhere("track.releaseDate = :releaseDate", {
        releaseDate: filters.releaseDate,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(filter: TrackFilterDto): Promise<PaginatedResult<Track>> {
    return this.findAll({ ...filter, isPublic: true });
  }

  async findOne(id: string): Promise<Track> {
    const track = await this.tracksRepository.findOne({
      where: { id },
      relations: ["artist", "license"],
    });

    if (!track) {
      throw new NotFoundException(`Track with ID ${id} not found`);
    }

    return track;
  }

  async update(
    id: string,
    updateTrackDto: Partial<CreateTrackDto>,
  ): Promise<Track> {
    const track = await this.findOne(id);

    Object.assign(track, updateTrackDto);

    const updatedTrack = await this.tracksRepository.save(track);
    this.logger.log(`Track updated successfully: ${id}`);

    return updatedTrack;
  }

  async remove(id: string): Promise<void> {
    const track = await this.findOne(id);

    try {
      // Delete file from storage if it exists
      if (track.filename) {
        await this.storageService.deleteFile(track.filename);
      }

      // Delete track record
      await this.tracksRepository.remove(track);

      this.logger.log(`Track deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete track: ${error.message}`);
      throw error;
    }
  }

  async incrementPlayCount(id: string): Promise<Track> {
    const track = await this.findOne(id);

    track.plays += 1;

    const updatedTrack = await this.tracksRepository.save(track);

    if (updatedTrack.artistId) {
      this.eventEmitter.emit(
        "track.played",
        new TrackPlayedEvent(updatedTrack.id, updatedTrack.artistId, null),
      );
    }

    return updatedTrack;
  }

  async addTips(id: string, amount: number): Promise<Track> {
    const track = await this.findOne(id);

    track.totalTips += amount;

    const updatedTrack = await this.tracksRepository.save(track);

    return updatedTrack;
  }

  async findByArtist(
    artistId: string,
    filter: TrackFilterDto,
  ): Promise<PaginatedResult<Track>> {
    return this.findAll({ ...filter, artistId });
  }

  async findByGenre(
    genre: string,
    filter: TrackFilterDto,
  ): Promise<PaginatedResult<Track>> {
    return this.findAll({ ...filter, genre });
  }

  async search(
    query: string,
    filter: TrackFilterDto,
  ): Promise<PaginatedResult<Track>> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tracksRepository
      .createQueryBuilder("track")
      .leftJoinAndSelect("track.artist", "artist")
      .where("track.title ILIKE :query", { query: `%${query}%` })
      .orWhere("track.album ILIKE :query", { query: `%${query}%` })
      .orderBy(`track.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
