import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Playlist } from "./entities/playlist.entity";
import { PlaylistTrack } from "./entities/playlist-track.entity";
import { Track } from "../tracks/entities/track.entity";
import { CreatePlaylistDto } from "./dto/create-playlist.dto";
import { UpdatePlaylistDto } from "./dto/update-playlist.dto";
import { AddTrackDto } from "./dto/add-track.dto";
import { ReorderTracksDto } from "./dto/reorder-tracks.dto";
import { DuplicatePlaylistDto } from "./dto/duplicate-playlist.dto";
import {
  PlaylistPaginationDto,
  PaginatedPlaylistResponse,
} from "./dto/pagination.dto";

@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  /**
   * Create a new playlist
   */
  async create(
    userId: string,
    createPlaylistDto: CreatePlaylistDto,
  ): Promise<Playlist> {
    const playlist = this.playlistRepository.create({
      ...createPlaylistDto,
      userId,
      trackCount: 0,
      totalDuration: 0,
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);
    this.logger.log(`Playlist created: ${savedPlaylist.id} by user ${userId}`);

    return savedPlaylist;
  }

  /**
   * Get all playlists with pagination and filtering
   */
  async findAll(
    userId: string,
    paginationDto: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10, isPublic } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder("playlist")
      .leftJoinAndSelect("playlist.user", "user")
      .where("playlist.userId = :userId", { userId });

    if (isPublic !== undefined) {
      queryBuilder.andWhere("playlist.isPublic = :isPublic", { isPublic });
    }

    queryBuilder.orderBy("playlist.createdAt", "DESC").skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get all public playlists
   */
  async findPublic(
    paginationDto: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder("playlist")
      .leftJoinAndSelect("playlist.user", "user")
      .where("playlist.isPublic = :isPublic", { isPublic: true })
      .orderBy("playlist.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a playlist by ID with tracks
   */
  async findOne(id: string, userId?: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id },
      relations: [
        "user",
        "playlistTracks",
        "playlistTracks.track",
        "playlistTracks.track.artist",
      ],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }

    // Check if user has access (owner or public)
    if (userId && playlist.userId !== userId && !playlist.isPublic) {
      throw new ForbiddenException("You do not have access to this playlist");
    }

    // Sort tracks by position
    if (playlist.playlistTracks) {
      playlist.playlistTracks.sort((a, b) => a.position - b.position);
    }

    return playlist;
  }

  /**
   * Update a playlist
   */
  async update(
    id: string,
    userId: string,
    updatePlaylistDto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    const playlist = await this.findOne(id, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only update your own playlists");
    }

    Object.assign(playlist, updatePlaylistDto);
    const updatedPlaylist = await this.playlistRepository.save(playlist);

    this.logger.log(`Playlist updated: ${id}`);
    return updatedPlaylist;
  }

  /**
   * Delete a playlist
   */
  async remove(id: string, userId: string): Promise<void> {
    const playlist = await this.findOne(id, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only delete your own playlists");
    }

    await this.playlistRepository.remove(playlist);
    this.logger.log(`Playlist deleted: ${id}`);
  }

  /**
   * Add a track to a playlist
   */
  async addTrack(
    playlistId: string,
    userId: string,
    addTrackDto: AddTrackDto,
  ): Promise<Playlist> {
    const playlist = await this.findOne(playlistId, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only modify your own playlists");
    }

    // Check if track exists
    const track = await this.trackRepository.findOne({
      where: { id: addTrackDto.trackId },
    });

    if (!track) {
      throw new NotFoundException(
        `Track with ID ${addTrackDto.trackId} not found`,
      );
    }

    // Check if track is already in playlist
    const existingPlaylistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId,
        trackId: addTrackDto.trackId,
      },
    });

    if (existingPlaylistTrack) {
      throw new BadRequestException("Track is already in this playlist");
    }

    // Determine position
    let position: number;
    if (addTrackDto.position !== undefined) {
      // Insert at specific position
      position = addTrackDto.position;

      // Shift existing tracks
      await this.playlistTrackRepository
        .createQueryBuilder()
        .update(PlaylistTrack)
        .set({ position: () => "position + 1" })
        .where("playlistId = :playlistId", { playlistId })
        .andWhere("position >= :position", { position })
        .execute();
    } else {
      // Add to end
      const maxPosition = await this.playlistTrackRepository
        .createQueryBuilder("pt")
        .select("MAX(pt.position)", "max")
        .where("pt.playlistId = :playlistId", { playlistId })
        .getRawOne();

      position = maxPosition?.max !== null ? maxPosition.max + 1 : 0;
    }

    // Create playlist track
    const playlistTrack = this.playlistTrackRepository.create({
      playlistId,
      trackId: addTrackDto.trackId,
      position,
    });

    await this.playlistTrackRepository.save(playlistTrack);

    // Update playlist metadata
    playlist.trackCount += 1;
    playlist.totalDuration += track.duration || 0;
    await this.playlistRepository.save(playlist);

    this.logger.log(
      `Track ${addTrackDto.trackId} added to playlist ${playlistId} at position ${position}`,
    );

    return this.findOne(playlistId, userId);
  }

  /**
   * Remove a track from a playlist
   */
  async removeTrack(
    playlistId: string,
    trackId: string,
    userId: string,
  ): Promise<Playlist> {
    const playlist = await this.findOne(playlistId, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only modify your own playlists");
    }

    const playlistTrack = await this.playlistTrackRepository.findOne({
      where: {
        playlistId,
        trackId,
      },
      relations: ["track"],
    });

    if (!playlistTrack) {
      throw new NotFoundException("Track not found in this playlist");
    }

    const removedPosition = playlistTrack.position;

    // Remove the track
    await this.playlistTrackRepository.remove(playlistTrack);

    // Shift remaining tracks
    await this.playlistTrackRepository
      .createQueryBuilder()
      .update(PlaylistTrack)
      .set({ position: () => "position - 1" })
      .where("playlistId = :playlistId", { playlistId })
      .andWhere("position > :position", { position: removedPosition })
      .execute();

    // Update playlist metadata
    playlist.trackCount -= 1;
    if (playlistTrack.track) {
      playlist.totalDuration = Math.max(
        0,
        playlist.totalDuration - (playlistTrack.track.duration || 0),
      );
    }
    await this.playlistRepository.save(playlist);

    this.logger.log(`Track ${trackId} removed from playlist ${playlistId}`);

    return this.findOne(playlistId, userId);
  }

  /**
   * Reorder tracks in a playlist
   */
  async reorderTracks(
    playlistId: string,
    userId: string,
    reorderTracksDto: ReorderTracksDto,
  ): Promise<Playlist> {
    const playlist = await this.findOne(playlistId, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only modify your own playlists");
    }

    // Validate all tracks belong to the playlist
    const trackIds = reorderTracksDto.tracks.map((t) => t.trackId);
    const existingTracks = await this.playlistTrackRepository.find({
      where: {
        playlistId,
        trackId: In(trackIds),
      },
    });

    if (existingTracks.length !== trackIds.length) {
      throw new BadRequestException("Some tracks are not in this playlist");
    }

    // Update positions
    for (const trackPosition of reorderTracksDto.tracks) {
      await this.playlistTrackRepository.update(
        { playlistId, trackId: trackPosition.trackId },
        { position: trackPosition.position },
      );
    }

    this.logger.log(`Tracks reordered in playlist ${playlistId}`);

    return this.findOne(playlistId, userId);
  }

  /**
   * Duplicate a playlist
   */
  async duplicate(
    playlistId: string,
    userId: string,
    duplicateDto?: DuplicatePlaylistDto,
  ): Promise<Playlist> {
    const originalPlaylist = await this.findOne(playlistId);

    // Check if user has access (owner or public)
    if (originalPlaylist.userId !== userId && !originalPlaylist.isPublic) {
      throw new ForbiddenException("You do not have access to this playlist");
    }

    // Create new playlist
    const newPlaylist = this.playlistRepository.create({
      userId,
      name: duplicateDto?.name || `${originalPlaylist.name} (Copy)`,
      description: originalPlaylist.description,
      isPublic: duplicateDto?.isPublic ?? originalPlaylist.isPublic,
      coverImage: originalPlaylist.coverImage,
      trackCount: 0,
      totalDuration: 0,
    });

    const savedPlaylist = await this.playlistRepository.save(newPlaylist);

    // Copy tracks
    if (
      originalPlaylist.playlistTracks &&
      originalPlaylist.playlistTracks.length > 0
    ) {
      const playlistTracks = originalPlaylist.playlistTracks.map((pt, index) =>
        this.playlistTrackRepository.create({
          playlistId: savedPlaylist.id,
          trackId: pt.trackId,
          position: index,
        }),
      );

      await this.playlistTrackRepository.save(playlistTracks);

      // Update metadata
      savedPlaylist.trackCount = playlistTracks.length;
      savedPlaylist.totalDuration = originalPlaylist.totalDuration;
      await this.playlistRepository.save(savedPlaylist);
    }

    this.logger.log(`Playlist ${playlistId} duplicated as ${savedPlaylist.id}`);

    return this.findOne(savedPlaylist.id, userId);
  }

  /**
   * Get playlists by user ID
   */
  async findByUser(
    targetUserId: string,
    requestingUserId?: string,
    paginationDto?: PlaylistPaginationDto,
  ): Promise<PaginatedPlaylistResponse<Playlist>> {
    const { page = 1, limit = 10, isPublic } = paginationDto || {};
    const skip = (page - 1) * limit;

    const queryBuilder = this.playlistRepository
      .createQueryBuilder("playlist")
      .leftJoinAndSelect("playlist.user", "user")
      .where("playlist.userId = :targetUserId", { targetUserId });

    // If not the owner, only show public playlists
    if (requestingUserId !== targetUserId) {
      queryBuilder.andWhere("playlist.isPublic = :isPublic", {
        isPublic: true,
      });
    } else if (isPublic !== undefined) {
      queryBuilder.andWhere("playlist.isPublic = :isPublic", { isPublic });
    }

    queryBuilder.orderBy("playlist.createdAt", "DESC").skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Share playlist - returns shareable link/info
   * In a real app, this might generate a share token or handle permissions
   */
  async share(
    playlistId: string,
    userId: string,
  ): Promise<{
    playlistId: string;
    shareUrl: string;
    isPublic: boolean;
    message: string;
  }> {
    const playlist = await this.findOne(playlistId, userId);

    // Verify ownership
    if (playlist.userId !== userId) {
      throw new ForbiddenException("You can only share your own playlists");
    }

    // Make playlist public if it's not already
    if (!playlist.isPublic) {
      playlist.isPublic = true;
      await this.playlistRepository.save(playlist);
    }

    const shareUrl = `/playlists/${playlistId}`;

    return {
      playlistId: playlist.id,
      shareUrl,
      isPublic: playlist.isPublic,
      message: "Playlist is now public and shareable",
    };
  }
}
