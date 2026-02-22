import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './entities/playlist.entity';
import { SmartPlaylist } from './entities/smart-playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { Track } from '../tracks/entities/track.entity';
import {
  PlaylistCollaborator,
  PlaylistCollaboratorRole,
  PlaylistCollaboratorStatus,
} from './entities/playlist-collaborator.entity';
import { CreateSmartPlaylistDto } from './dto/create-smart-playlist.dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityType, EntityType } from '../activities/entities/activity.entity';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';
import { Follow, FollowingType } from '../follows/entities/follow.entity';

type SmartPlaylistCriteriaType =
  | 'genre'
  | 'artist'
  | 'date_range'
  | 'most_tipped'
  | 'recently_played'
  | 'followed_artists_latest';

interface SmartPlaylistCriteriaBase {
  type: SmartPlaylistCriteriaType;
  limit: number;
}

interface GenreCriteria extends SmartPlaylistCriteriaBase {
  type: 'genre';
  genres: string[];
}

interface ArtistCriteria extends SmartPlaylistCriteriaBase {
  type: 'artist';
  artistIds: string[];
}

interface DateRangeCriteria extends SmartPlaylistCriteriaBase {
  type: 'date_range';
  from?: Date;
  to?: Date;
}

interface MostTippedCriteria extends SmartPlaylistCriteriaBase {
  type: 'most_tipped';
}

interface RecentlyPlayedCriteria extends SmartPlaylistCriteriaBase {
  type: 'recently_played';
}

interface FollowedArtistsCriteria extends SmartPlaylistCriteriaBase {
  type: 'followed_artists_latest';
}

type SmartPlaylistCriteria =
  | GenreCriteria
  | ArtistCriteria
  | DateRangeCriteria
  | MostTippedCriteria
  | RecentlyPlayedCriteria
  | FollowedArtistsCriteria;

@Injectable()
export class SmartPlaylistsService {
  private readonly logger = new Logger(SmartPlaylistsService.name);
  private readonly defaultLimit = 50;
  private readonly maxLimit = 200;

  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(SmartPlaylist)
    private readonly smartPlaylistRepository: Repository<SmartPlaylist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(PlaylistCollaborator)
    private readonly collaboratorRepository: Repository<PlaylistCollaborator>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async previewTracks(
    userId: string,
    criteria: Record<string, any>,
  ): Promise<Track[]> {
    const normalized = this.normalizeCriteria(criteria);
    return this.getTracksForCriteria(normalized, userId);
  }

  async createSmartPlaylist(
    userId: string,
    dto: CreateSmartPlaylistDto,
  ): Promise<Playlist> {
    const normalized = this.normalizeCriteria(dto.criteria);
    const tracks = await this.getTracksForCriteria(normalized, userId);
    const totalDuration = tracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0,
    );

    const playlist = this.playlistRepository.create({
      userId,
      name: dto.name,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
      coverImage: dto.coverImage,
      trackCount: tracks.length,
      totalDuration,
      approvalRequired: false,
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);

    await this.ensureOwnerCollaborator(savedPlaylist.id, userId);

    const smartPlaylist = this.smartPlaylistRepository.create({
      playlistId: savedPlaylist.id,
      criteria: normalized,
      autoUpdate: dto.autoUpdate ?? true,
      lastUpdated: tracks.length ? new Date() : null,
    });

    await this.smartPlaylistRepository.save(smartPlaylist);
    await this.replacePlaylistTracks(savedPlaylist.id, tracks);

    const playlistWithTracks = await this.playlistRepository.findOne({
      where: { id: savedPlaylist.id },
      relations: [
        'user',
        'playlistTracks',
        'playlistTracks.track',
        'playlistTracks.track.artist',
        'smartPlaylist',
      ],
    });

    if (playlistWithTracks?.playlistTracks) {
      playlistWithTracks.playlistTracks.sort((a, b) => a.position - b.position);
    }

    return playlistWithTracks || savedPlaylist;
  }

  async refreshAll(): Promise<void> {
    const smartPlaylists = await this.smartPlaylistRepository.find({
      where: { autoUpdate: true },
    });

    for (const smartPlaylist of smartPlaylists) {
      try {
        await this.refreshSmartPlaylist(smartPlaylist);
      } catch (error) {
        this.logger.warn(
          `Failed to refresh smart playlist ${smartPlaylist.id}: ${error.message}`,
        );
      }
    }
  }

  async refreshSmartPlaylist(smartPlaylist: SmartPlaylist): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: smartPlaylist.playlistId },
    });

    if (!playlist) {
      this.logger.warn(
        `Playlist not found for smart playlist ${smartPlaylist.id}`,
      );
      return;
    }

    const normalized = this.normalizeCriteria(smartPlaylist.criteria);
    const tracks = await this.getTracksForCriteria(normalized, playlist.userId);

    const existingTracks = await this.playlistTrackRepository.find({
      where: { playlistId: playlist.id },
      order: { position: 'ASC' },
    });

    const existingIds = existingTracks.map((track) => track.trackId);
    const nextIds = tracks.map((track) => track.id);
    const hasChanges =
      existingIds.length !== nextIds.length ||
      existingIds.some((trackId, index) => trackId !== nextIds[index]);

    if (!hasChanges) {
      return;
    }

    const totalDuration = tracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0,
    );

    await this.playlistTrackRepository.manager.transaction(async (manager) => {
      await manager.delete(PlaylistTrack, { playlistId: playlist.id });

      if (tracks.length > 0) {
        const playlistTracks = tracks.map((track, index) =>
          manager.create(PlaylistTrack, {
            playlistId: playlist.id,
            trackId: track.id,
            position: index,
          }),
        );
        await manager.save(playlistTracks);
      }

      playlist.trackCount = tracks.length;
      playlist.totalDuration = totalDuration;
      await manager.save(playlist);

      smartPlaylist.lastUpdated = new Date();
      await manager.save(smartPlaylist);
    });

    await this.safeCreateActivity({
      userId: playlist.userId,
      activityType: ActivityType.SMART_PLAYLIST_REFRESHED,
      entityType: EntityType.SMART_PLAYLIST,
      entityId: smartPlaylist.id,
      metadata: {
        playlistId: playlist.id,
        trackCount: tracks.length,
      },
    });
  }

  private async replacePlaylistTracks(
    playlistId: string,
    tracks: Track[],
  ): Promise<void> {
    if (tracks.length === 0) {
      return;
    }

    const playlistTracks = tracks.map((track, index) =>
      this.playlistTrackRepository.create({
        playlistId,
        trackId: track.id,
        position: index,
      }),
    );

    await this.playlistTrackRepository.save(playlistTracks);
  }

  private normalizeCriteria(criteria: Record<string, any>): SmartPlaylistCriteria {
    if (!criteria || typeof criteria !== 'object') {
      throw new BadRequestException('Criteria must be a valid object');
    }

    const type = String(criteria.type || '').trim() as SmartPlaylistCriteriaType;
    if (!type) {
      throw new BadRequestException('Criteria type is required');
    }

    const limit = this.normalizeLimit(criteria.limit);

    switch (type) {
      case 'genre': {
        const genres = this.normalizeStringArray(
          criteria.genres ?? criteria.genre,
        );
        if (genres.length === 0) {
          throw new BadRequestException('At least one genre is required');
        }
        return { type, genres, limit };
      }
      case 'artist': {
        const artistIds = this.normalizeStringArray(
          criteria.artistIds ?? criteria.artistId,
        );
        if (artistIds.length === 0) {
          throw new BadRequestException('At least one artist is required');
        }
        return { type, artistIds, limit };
      }
      case 'date_range': {
        const from = criteria.from ? new Date(criteria.from) : undefined;
        const to = criteria.to ? new Date(criteria.to) : undefined;
        if (!from && !to) {
          throw new BadRequestException(
            'Date range requires a from or to value',
          );
        }
        if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
          throw new BadRequestException('Invalid date range');
        }
        return { type, from, to, limit };
      }
      case 'most_tipped':
      case 'recently_played':
      case 'followed_artists_latest':
        return { type, limit };
      default:
        throw new BadRequestException(`Unsupported criteria type: ${type}`);
    }
  }

  private normalizeLimit(limit?: number): number {
    if (!limit) {
      return this.defaultLimit;
    }
    if (typeof limit !== 'number' || Number.isNaN(limit)) {
      throw new BadRequestException('Limit must be a number');
    }
    if (limit < 1) {
      throw new BadRequestException('Limit must be at least 1');
    }
    return Math.min(limit, this.maxLimit);
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => String(entry).trim())
        .filter((entry) => entry.length > 0);
    }
    return [String(value).trim()].filter((entry) => entry.length > 0);
  }

  private async getTracksForCriteria(
    criteria: SmartPlaylistCriteria,
    userId: string,
  ): Promise<Track[]> {
    const queryBuilder = this.trackRepository
      .createQueryBuilder('track')
      .leftJoinAndSelect('track.artist', 'artist');

    queryBuilder.andWhere('track.isPublic = :isPublic', { isPublic: true });

    if (criteria.type === 'genre') {
      queryBuilder.andWhere('track.genre IN (:...genres)', {
        genres: criteria.genres,
      });
    } else if (criteria.type === 'artist') {
      queryBuilder.andWhere('track.artistId IN (:...artistIds)', {
        artistIds: criteria.artistIds,
      });
    } else if (criteria.type === 'date_range') {
      if (criteria.from) {
        queryBuilder.andWhere('track.releaseDate >= :from', {
          from: criteria.from,
        });
      }
      if (criteria.to) {
        queryBuilder.andWhere('track.releaseDate <= :to', { to: criteria.to });
      }
    } else if (criteria.type === 'followed_artists_latest') {
      const followedArtists = await this.followRepository.find({
        where: {
          followerId: userId,
          followingType: FollowingType.ARTIST,
        },
      });
      const artistIds = followedArtists.map((follow) => follow.followingId);
      if (artistIds.length === 0) {
        return [];
      }
      queryBuilder.andWhere('track.artistId IN (:...artistIds)', {
        artistIds,
      });
    }

    if (criteria.type === 'most_tipped') {
      queryBuilder.orderBy('track.totalTips', 'DESC');
    } else if (criteria.type === 'recently_played') {
      queryBuilder.orderBy('track.updatedAt', 'DESC');
    } else {
      queryBuilder.orderBy('track.createdAt', 'DESC');
    }

    queryBuilder.take(criteria.limit);

    return queryBuilder.getMany();
  }

  private async ensureOwnerCollaborator(
    playlistId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.collaboratorRepository.findOne({
      where: {
        playlistId,
        userId,
        role: PlaylistCollaboratorRole.OWNER,
        status: PlaylistCollaboratorStatus.ACCEPTED,
      },
    });

    if (existing) {
      return;
    }

    const collaborator = this.collaboratorRepository.create({
      playlistId,
      userId,
      role: PlaylistCollaboratorRole.OWNER,
      status: PlaylistCollaboratorStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    await this.collaboratorRepository.save(collaborator);
  }

  private async safeCreateActivity(
    data: Omit<CreateActivityDto, 'id'>,
  ): Promise<void> {
    try {
      await this.activitiesService.create(data);
    } catch (error) {
      this.logger.warn(`Failed to create activity: ${error.message}`);
    }
  }
}
