import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Activity, ActivityType, EntityType } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivityFeedQueryDto } from './dto/activity-feed-query.dto';
import { EntityActivityQueryDto } from './dto/entity-activity-query.dto';
import { UsersService } from '../users/users.service';

export interface PaginatedActivityResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    unseenCount: number;
  };
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new activity
   */
  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    const activity = this.activityRepository.create(createActivityDto);
    const saved = await this.activityRepository.save(activity);
    this.logger.debug(`Created activity: ${saved.id} (${saved.activityType})`);
    return saved;
  }

  /**
   * Get personalized activity feed for a user
   * Includes activities from followed artists and user's own activities
   */
  async getFeed(
    userId: string,
    query: ActivityFeedQueryDto,
  ): Promise<PaginatedActivityResponse> {
    const { page = 1, limit = 20, activityType, unseenOnly = false } = query;
    const skip = (page - 1) * limit;

    // Get user's followed artists
    const followedArtists = await this.getFollowedArtists(userId);

    // Build query
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where(
        '(activity.userId = :userId OR activity.userId IN (:...followedArtistIds))',
        {
          userId,
          followedArtistIds: followedArtists.length > 0 ? followedArtists : [''],
        },
      )
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Apply filters
    if (activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType,
      });
    }

    if (unseenOnly) {
      queryBuilder.andWhere('activity.isSeen = :isSeen', { isSeen: false });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    // Get unseen count
    const unseenCount = await this.getUnseenCount(userId, followedArtists);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        unseenCount,
      },
    };
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(
    userId: string,
    query: ActivityFeedQueryDto,
  ): Promise<PaginatedActivityResponse> {
    const { page = 1, limit = 20, activityType, unseenOnly = false } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.userId = :userId', { userId })
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType,
      });
    }

    if (unseenOnly) {
      queryBuilder.andWhere('activity.isSeen = :isSeen', { isSeen: false });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    const unseenCount = await this.getUnseenCountForUser(userId);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        unseenCount,
      },
    };
  }

  /**
   * Mark activity as seen
   */
  async markAsSeen(activityId: string, userId: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, userId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    activity.isSeen = true;
    return this.activityRepository.save(activity);
  }

  /**
   * Mark all activities as seen for a user
   */
  async markAllAsSeen(userId: string): Promise<{ count: number }> {
    const result = await this.activityRepository.update(
      { userId, isSeen: false },
      { isSeen: true },
    );

    return { count: result.affected || 0 };
  }

  /**
   * Get activities for a playlist (including smart playlist refreshes)
   */
  async getPlaylistActivities(
    playlistId: string,
    query: EntityActivityQueryDto,
  ): Promise<PaginatedActivityResponse> {
    const { page = 1, limit = 20, activityType } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where(
        new Brackets((qb) => {
          qb.where(
            'activity.entityType = :playlistType AND activity.entityId = :playlistId',
            {
              playlistType: EntityType.PLAYLIST,
              playlistId,
            },
          ).orWhere(
            "activity.entityType = :smartType AND activity.metadata ->> 'playlistId' = :playlistId",
            {
              smartType: EntityType.SMART_PLAYLIST,
              playlistId,
            },
          );
        }),
      )
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (activityType) {
      queryBuilder.andWhere('activity.activityType = :activityType', {
        activityType,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        unseenCount: 0,
      },
    };
  }

  /**
   * Get unseen count for user's feed (including followed artists)
   */
  private async getUnseenCount(
    userId: string,
    followedArtists: string[],
  ): Promise<number> {
    const followedArtistIds =
      followedArtists.length > 0 ? followedArtists : [''];

    return this.activityRepository.count({
      where: [
        { userId, isSeen: false },
        ...(followedArtists.length > 0
          ? [{ userId: In(followedArtists), isSeen: false }]
          : []),
      ],
    });
  }

  /**
   * Get unseen count for a specific user
   */
  private async getUnseenCountForUser(userId: string): Promise<number> {
    return this.activityRepository.count({
      where: { userId, isSeen: false },
    });
  }

  /**
   * Get list of artist IDs that the user follows
   * TODO: This should be replaced with actual follow system
   * For now, returns empty array - follow system needs to be implemented
   */
  private async getFollowedArtists(userId: string): Promise<string[]> {
    // TODO: Implement actual follow system
    // For now, return empty array - users don't follow anyone yet
    // When follow system is implemented, query the follows table
    this.logger.debug(`Getting followed artists for user: ${userId}`);
    return [];
  }

  /**
   * Track new track activity
   */
  async trackNewTrack(
    artistId: string,
    trackId: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    return this.create({
      userId: artistId,
      activityType: ActivityType.NEW_TRACK,
      entityType: EntityType.TRACK,
      entityId: trackId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track tip sent activity
   */
  async trackTipSent(
    userId: string,
    tipId: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    return this.create({
      userId,
      activityType: ActivityType.TIP_SENT,
      entityType: EntityType.TIP,
      entityId: tipId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track tip received activity
   */
  async trackTipReceived(
    artistId: string,
    tipId: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    return this.create({
      userId: artistId,
      activityType: ActivityType.TIP_RECEIVED,
      entityType: EntityType.TIP,
      entityId: tipId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track artist followed activity
   */
  async trackArtistFollowed(
    userId: string,
    artistId: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    return this.create({
      userId,
      activityType: ActivityType.ARTIST_FOLLOWED,
      entityType: EntityType.ARTIST,
      entityId: artistId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track new follower activity
   */
  async trackNewFollower(
    artistId: string,
    followerId: string,
    metadata?: Record<string, any>,
  ): Promise<Activity> {
    return this.create({
      userId: artistId,
      activityType: ActivityType.NEW_FOLLOWER,
      entityType: EntityType.ARTIST,
      entityId: followerId,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
