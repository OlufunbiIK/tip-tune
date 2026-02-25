import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Follow, FollowingType } from './entities/follow.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { ArtistsService } from '../artists/artists.service';
  FollowPaginationQueryDto,
} from './dto/pagination.dto';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserFollowedEvent } from './events/user-followed.event';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(Artist)
    private readonly artistRepo: Repository<Artist>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly artistsService: ArtistsService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  /**
   * Follow an artist
   */
  async follow(
    artistId: string,
    followerId: string,
    notificationsEnabled = true,
  ): Promise<Follow> {
    await this.artistsService.findOne(artistId);

    const existing = await this.followRepo.findOne({
      where: {
        followerId,
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
    });

    if (existing) {
      throw new ConflictException('Already following this artist');
    }

    const follow = this.followRepo.create({
      followerId,
      followingId: artistId,
      followingType: FollowingType.ARTIST,
      notificationsEnabled,
    });

    const saved = await this.followRepo.save(follow);
    this.logger.log(`User ${followerId} followed artist ${artistId}`);

    this.eventEmitter.emit(
      'user.followed',
      new UserFollowedEvent(followerId, artistId),
    );

    return saved;
  }

  /**
   * Unfollow an artist
   */
  async unfollow(artistId: string, followerId: string): Promise<void> {
    const follow = await this.followRepo.findOne({
      where: {
        followerId,
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.followRepo.remove(follow);
    this.logger.log(`User ${followerId} unfollowed artist ${artistId}`);
  }

  /**
   * Get paginated list of followers for an artist
   */
  async getFollowers(
    artistId: string,
    pagination: FollowPaginationQueryDto,
  ): Promise<PaginatedFollowResponseDto<Partial<User>>> {
    await this.artistsService.findOne(artistId);

    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [follows, total] = await this.followRepo.findAndCount({
      where: {
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = follows.map((f) => {
      const { id, username, walletAddress, profileImage } = f.follower;
      return { id, username, walletAddress, profileImage };
    });

    return this.buildPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get follower count for an artist
   */
  async getFollowerCount(artistId: string): Promise<number> {
    await this.artistsService.findOne(artistId);
    return this.followRepo.count({
      where: {
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
    });
  }

  /**
   * Get paginated list of who a user is following
   */
  async getFollowing(
    userId: string,
    pagination: FollowPaginationQueryDto,
  ): Promise<
    PaginatedFollowResponseDto<{
      id: string;
      followingType: FollowingType;
      followingId: string;
      notificationsEnabled: boolean;
      createdAt: Date;
      following: Partial<Artist> | Partial<User>;
    }>
  > {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { followerId: userId },
      order: { createdAt: 'DESC' },
      skip: ((pagination.page ?? 1) - 1) * (pagination.limit ?? 10),
      take: pagination.limit ?? 10,
    });

    const artistIds = follows
      .filter((f) => f.followingType === FollowingType.ARTIST)
      .map((f) => f.followingId);
    const userIds = follows
      .filter((f) => f.followingType === FollowingType.USER)
      .map((f) => f.followingId);

    const artists =
      artistIds.length > 0
        ? await this.artistRepo.findBy({ id: In(artistIds) })
        : [];
    const users =
      userIds.length > 0 ? await this.userRepo.findBy({ id: In(userIds) }) : [];

    const artistMap = new Map(artists.map((a) => [a.id, a]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = follows.map((f) => {
      const following =
        f.followingType === FollowingType.ARTIST
          ? artistMap.get(f.followingId)
          : userMap.get(f.followingId);
      const sanitized = following
        ? this.sanitizeFollowing(following, f.followingType)
        : null;
      return {
        id: f.id,
        followingType: f.followingType,
        followingId: f.followingId,
        notificationsEnabled: f.notificationsEnabled,
        createdAt: f.createdAt,
        following: sanitized ?? { id: f.followingId },
      };
    });

    return this.buildPaginatedResponse(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 10,
    );
  }

  /**
   * Check if the current user follows an artist
   */
  async check(
    artistId: string,
    userId: string,
  ): Promise<{ following: boolean; notificationsEnabled?: boolean }> {
    await this.artistsService.findOne(artistId);

    const follow = await this.followRepo.findOne({
      where: {
        followerId: userId,
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
    });

    if (!follow) {
      return { following: false };
    }

    return {
      following: true,
      notificationsEnabled: follow.notificationsEnabled,
    };
  }

  /**
   * Update notification preferences for a follow relationship
   */
  async updateNotificationPreferences(
    artistId: string,
    userId: string,
    notificationsEnabled: boolean,
  ): Promise<Follow> {
    const follow = await this.followRepo.findOne({
      where: {
        followerId: userId,
        followingId: artistId,
        followingType: FollowingType.ARTIST,
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    follow.notificationsEnabled = notificationsEnabled;
    return this.followRepo.save(follow);
  }

  private buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedFollowResponseDto<T> {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private sanitizeFollowing(
    entity: Artist | User,
    type: FollowingType,
  ): Partial<Artist> | Partial<User> {
    if (type === FollowingType.ARTIST) {
      const a = entity as Artist;
      return {
        id: a.id,
        artistName: a.artistName,
        genre: a.genre,
        profileImage: a.profileImage,
        coverImage: a.coverImage,
      };
    }
    const u = entity as User;
    return {
      id: u.id,
      username: u.username,
      profileImage: u.profileImage,
      walletAddress: u.walletAddress,
    };
  }
}
