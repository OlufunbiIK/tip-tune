import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TrackVersion } from './entities/track-version.entity';
import { Track } from '../tracks/entities/track.entity';
import { CreateVersionDto } from './dto/create-version.dto';
import { VersionPaginationQueryDto } from './dto/pagination.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

const MAX_VERSIONS_PER_TRACK = 5;

@Injectable()
export class VersionsService {
  constructor(
    @InjectRepository(TrackVersion)
    private readonly versionRepository: Repository<TrackVersion>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createVersion(
    trackId: string,
    createVersionDto: CreateVersionDto,
    uploadedBy: string,
  ): Promise<TrackVersion> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['artist'],
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.artist?.walletAddress !== uploadedBy && track.artistId !== uploadedBy) {
      throw new ForbiddenException('Only the track owner can upload new versions');
    }

    const versionCount = await this.versionRepository.count({
      where: { trackId },
    });

    if (versionCount >= MAX_VERSIONS_PER_TRACK) {
      throw new BadRequestException(
        `Maximum of ${MAX_VERSIONS_PER_TRACK} versions allowed per track`,
      );
    }

    const latestVersion = await this.versionRepository.findOne({
      where: { trackId },
      order: { versionNumber: 'DESC' },
    });

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const version = this.versionRepository.create({
      trackId,
      versionNumber: newVersionNumber,
      audioUrl: createVersionDto.audioUrl,
      fileSize: createVersionDto.fileSize,
      duration: createVersionDto.duration,
      changeNote: createVersionDto.changeNote,
      isActive: versionCount === 0,
      uploadedBy,
    });

    const savedVersion = await this.versionRepository.save(version);

    if (versionCount === 0) {
      await this.trackRepository.update(trackId, {
        audioUrl: createVersionDto.audioUrl,
        duration: createVersionDto.duration,
      });
    }

    this.eventEmitter.emit('version.created', {
      trackId,
      versionId: savedVersion.id,
      versionNumber: newVersionNumber,
      changeNote: createVersionDto.changeNote,
      artistId: track.artistId,
    });

    return savedVersion;
  }

  async getVersions(
    trackId: string,
    query: VersionPaginationQueryDto,
  ): Promise<{
    data: TrackVersion[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const track = await this.trackRepository.findOne({ where: { id: trackId } });
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [versions, total] = await this.versionRepository.findAndCount({
      where: { trackId },
      order: { versionNumber: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: versions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActiveVersion(trackId: string): Promise<TrackVersion> {
    const track = await this.trackRepository.findOne({ where: { id: trackId } });
    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const activeVersion = await this.versionRepository.findOne({
      where: { trackId, isActive: true },
    });

    if (!activeVersion) {
      throw new NotFoundException('No active version found for this track');
    }

    return activeVersion;
  }

  async activateVersion(
    trackId: string,
    versionId: string,
    userId: string,
  ): Promise<TrackVersion> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['artist'],
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.artist?.walletAddress !== userId && track.artistId !== userId) {
      throw new ForbiddenException('Only the track owner can activate versions');
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, trackId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    if (version.isActive) {
      return version;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        TrackVersion,
        { trackId, isActive: true },
        { isActive: false },
      );

      await queryRunner.manager.update(
        TrackVersion,
        { id: versionId },
        { isActive: true },
      );

      await queryRunner.manager.update(
        Track,
        { id: trackId },
        {
          audioUrl: version.audioUrl,
          duration: version.duration,
        },
      );

      await queryRunner.commitTransaction();

      return { ...version, isActive: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteVersion(
    trackId: string,
    versionId: string,
    userId: string,
  ): Promise<void> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['artist'],
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (track.artist?.walletAddress !== userId && track.artistId !== userId) {
      throw new ForbiddenException('Only the track owner can delete versions');
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, trackId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    if (version.isActive) {
      throw new BadRequestException('Cannot delete the active version');
    }

    const versionCount = await this.versionRepository.count({
      where: { trackId },
    });

    if (versionCount <= 1) {
      throw new BadRequestException('Cannot delete the only version of a track');
    }

    await this.versionRepository.remove(version);
  }

  async getVersionById(
    trackId: string,
    versionId: string,
  ): Promise<TrackVersion> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, trackId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }
}
