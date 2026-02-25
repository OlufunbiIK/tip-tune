import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserBlock, BlockReason } from './entities/user-block.entity';
import { UserMute, MuteType } from './entities/user-mute.entity';
import { User } from '../users/entities/user.entity';
import {
  BlockPaginationQueryDto,
  PaginatedBlockResponseDto,
} from './dto/pagination.dto';

@Injectable()
export class BlocksService {
  private readonly logger = new Logger(BlocksService.name);

  constructor(
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(UserMute)
    private readonly muteRepo: Repository<UserMute>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    reason?: BlockReason,
  ): Promise<UserBlock> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const blockedUser = await this.userRepo.findOne({ where: { id: blockedId } });
    if (!blockedUser) {
      throw new NotFoundException('User to block not found');
    }

    const existing = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    });

    if (existing) {
      throw new ConflictException('User is already blocked');
    }

    const block = this.blockRepo.create({
      blockerId,
      blockedId,
      reason,
    });

    const saved = await this.blockRepo.save(block);
    this.logger.log(`User ${blockerId} blocked user ${blockedId}`);
    return saved;
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    });

    if (!block) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.blockRepo.remove(block);
    this.logger.log(`User ${blockerId} unblocked user ${blockedId}`);
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: { blockerId, blockedId },
    });
    return count > 0;
  }

  /**
   * Check if user A has blocked user B (for tip/comment validation)
   */
  async isBlockedByArtist(artistId: string, userId: string): Promise<boolean> {
    const count = await this.blockRepo.count({
      where: { blockerId: artistId, blockedId: userId },
    });
    return count > 0;
  }

  /**
   * Get paginated list of blocked users
   */
  async getBlockedUsers(
    blockerId: string,
    pagination: BlockPaginationQueryDto,
  ): Promise<PaginatedBlockResponseDto<Partial<User> & { blockedAt: Date; reason?: BlockReason }>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [blocks, total] = await this.blockRepo.findAndCount({
      where: { blockerId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = blocks.map((b) => ({
      id: b.blocked.id,
      username: b.blocked.username,
      profileImage: b.blocked.profileImage,
      walletAddress: b.blocked.walletAddress,
      blockedAt: b.createdAt,
      reason: b.reason,
    }));

    return this.buildPaginatedResponse(data, total, page, limit);
  }

  /**
   * Mute a user
   */
  async muteUser(
    muterId: string,
    mutedId: string,
    muteType: MuteType = MuteType.BOTH,
    expiresAt?: Date,
  ): Promise<UserMute> {
    if (muterId === mutedId) {
      throw new BadRequestException('Cannot mute yourself');
    }

    const mutedUser = await this.userRepo.findOne({ where: { id: mutedId } });
    if (!mutedUser) {
      throw new NotFoundException('User to mute not found');
    }

    const existing = await this.muteRepo.findOne({
      where: { muterId, mutedId },
    });

    if (existing) {
      // Update existing mute
      existing.muteType = muteType;
      existing.expiresAt = expiresAt || null;
      const updated = await this.muteRepo.save(existing);
      this.logger.log(`User ${muterId} updated mute for user ${mutedId}`);
      return updated;
    }

    const mute = this.muteRepo.create({
      muterId,
      mutedId,
      muteType,
      expiresAt,
    });

    const saved = await this.muteRepo.save(mute);
    this.logger.log(`User ${muterId} muted user ${mutedId}`);
    return saved;
  }

  /**
   * Unmute a user
   */
  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    const mute = await this.muteRepo.findOne({
      where: { muterId, mutedId },
    });

    if (!mute) {
      throw new NotFoundException('Mute relationship not found');
    }

    await this.muteRepo.remove(mute);
    this.logger.log(`User ${muterId} unmuted user ${mutedId}`);
  }

  /**
   * Check if a user is muted
   */
  async isMuted(
    muterId: string,
    mutedId: string,
    muteType?: MuteType,
  ): Promise<boolean> {
    const mute = await this.muteRepo.findOne({
      where: { muterId, mutedId },
    });

    if (!mute) {
      return false;
    }

    // Check if mute has expired
    if (mute.expiresAt && new Date(mute.expiresAt) < new Date()) {
      return false;
    }

    // If muteType is specified, check if it matches
    if (muteType) {
      return mute.muteType === muteType || mute.muteType === MuteType.BOTH;
    }

    return true;
  }

  /**
   * Check if notifications should be suppressed
   */
  async shouldSuppressNotification(muterId: string, mutedId: string): Promise<boolean> {
    return this.isMuted(muterId, mutedId, MuteType.NOTIFICATIONS);
  }

  /**
   * Check if activity feed should be filtered
   */
  async shouldFilterActivityFeed(muterId: string, mutedId: string): Promise<boolean> {
    return this.isMuted(muterId, mutedId, MuteType.ACTIVITY_FEED);
  }

  /**
   * Get paginated list of muted users
   */
  async getMutedUsers(
    muterId: string,
    pagination: BlockPaginationQueryDto,
  ): Promise<PaginatedBlockResponseDto<Partial<User> & { mutedAt: Date; muteType: MuteType; expiresAt?: Date }>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [mutes, total] = await this.muteRepo.findAndCount({
      where: { muterId },
      relations: ['muted'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const data = mutes.map((m) => ({
      id: m.muted.id,
      username: m.muted.username,
      profileImage: m.muted.profileImage,
      walletAddress: m.muted.walletAddress,
      mutedAt: m.createdAt,
      muteType: m.muteType,
      expiresAt: m.expiresAt,
    }));

    return this.buildPaginatedResponse(data, total, page, limit);
  }

  /**
   * Get list of muted user IDs for filtering
   */
  async getMutedUserIds(
    muterId: string,
    muteType?: MuteType,
  ): Promise<string[]> {
    const queryBuilder = this.muteRepo
      .createQueryBuilder('mute')
      .select('mute.mutedId')
      .where('mute.muterId = :muterId', { muterId })
      .andWhere('(mute.expiresAt IS NULL OR mute.expiresAt > :now)', { now: new Date() });

    if (muteType && muteType !== MuteType.BOTH) {
      queryBuilder.andWhere('(mute.muteType = :muteType OR mute.muteType = :both)', {
        muteType,
        both: MuteType.BOTH,
      });
    }

    const mutes = await queryBuilder.getMany();
    return mutes.map((m) => m.mutedId);
  }

  /**
   * Get list of blocked user IDs
   */
  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const blocks = await this.blockRepo.find({
      where: { blockerId },
      select: ['blockedId'],
    });
    return blocks.map((b) => b.blockedId);
  }

  /**
   * Cron job to expire temporary mutes
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredMutes(): Promise<void> {
    const now = new Date();
    const expiredMutes = await this.muteRepo.find({
      where: {
        expiresAt: LessThanOrEqual(now),
      },
    });

    if (expiredMutes.length === 0) {
      return;
    }

    this.logger.log(`Removing ${expiredMutes.length} expired mutes`);

    for (const mute of expiredMutes) {
      try {
        await this.muteRepo.remove(mute);
        this.logger.log(`Expired mute removed: ${mute.muterId} -> ${mute.mutedId}`);
      } catch (error) {
        this.logger.error(`Failed to remove expired mute: ${error.message}`);
      }
    }
  }

  private buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedBlockResponseDto<T> {
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
}
