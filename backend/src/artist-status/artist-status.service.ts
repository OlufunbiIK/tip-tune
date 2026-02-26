import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArtistStatus, StatusType } from './entities/artist-status.entity';
import { StatusHistory } from './entities/status-history.entity';
import { Artist } from '../artists/entities/artist.entity';
import { SetArtistStatusDto } from './dto/set-artist-status.dto';
import { ArtistStatusResponseDto } from './dto/artist-status-response.dto';
import { StatusHistoryResponseDto } from './dto/status-history-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { Follow, FollowingType } from '../follows/entities/follow.entity';

const MAX_HISTORY_ENTRIES = 20;

@Injectable()
export class ArtistStatusService {
  private readonly logger = new Logger(ArtistStatusService.name);

  constructor(
    @InjectRepository(ArtistStatus)
    private readonly statusRepository: Repository<ArtistStatus>,
    @InjectRepository(StatusHistory)
    private readonly historyRepository: Repository<StatusHistory>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Set or update artist status
   */
  async setStatus(
    artistId: string,
    dto: SetArtistStatusDto,
  ): Promise<ArtistStatusResponseDto> {
    // Verify artist exists
    const artist = await this.artistRepository.findOne({ where: { id: artistId } });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Parse autoResetAt if provided
    let autoResetAt: Date | null = null;
    if (dto.autoResetAt) {
      autoResetAt = new Date(dto.autoResetAt);
      if (Number.isNaN(autoResetAt.getTime())) {
        throw new BadRequestException('Invalid autoResetAt timestamp');
      }
      if (autoResetAt <= new Date()) {
        throw new BadRequestException('autoResetAt must be in the future');
      }
    }

    // Get or create status
    let status = await this.statusRepository.findOne({
      where: { artistId },
    });

    const previousStatusType = status?.statusType;

    if (!status) {
      status = this.statusRepository.create({
        artistId,
        statusType: dto.statusType,
        statusMessage: dto.statusMessage ?? null,
        emoji: dto.emoji ?? null,
        showOnProfile: dto.showOnProfile ?? true,
        autoResetAt,
      });
    } else {
      status.statusType = dto.statusType;
      status.statusMessage = dto.statusMessage ?? null;
      status.emoji = dto.emoji ?? null;
      status.showOnProfile = dto.showOnProfile ?? true;
      status.autoResetAt = autoResetAt;
    }

    const savedStatus = await this.statusRepository.save(status);

    // Add to history
    await this.addHistoryEntry(artistId, status.id, dto.statusType, dto.statusMessage ?? null);

    // Notify followers if status changed to certain types
    if (previousStatusType !== dto.statusType) {
      await this.notifyFollowersOfStatusChange(
        artistId,
        artist.artistName,
        dto.statusType,
        dto.statusMessage,
      );
    }

    return ArtistStatusResponseDto.fromEntity(savedStatus);
  }

  /**
   * Get current status for an artist
   */
  async getStatus(artistId: string): Promise<ArtistStatusResponseDto> {
    const status = await this.statusRepository.findOne({
      where: { artistId },
    });

    if (!status) {
      throw new NotFoundException('Artist status not found');
    }

    return ArtistStatusResponseDto.fromEntity(status);
  }

  /**
   * Clear status for an artist
   */
  async clearStatus(artistId: string): Promise<void> {
    const status = await this.statusRepository.findOne({
      where: { artistId },
    });

    if (!status) {
      throw new NotFoundException('Artist status not found');
    }

    // Mark history entry as cleared
    await this.historyRepository.update(
      {
        artistStatusId: status.id,
        clearedAt: null,
      },
      { clearedAt: new Date() },
    );

    // Reset to default status
    status.statusType = StatusType.ACTIVE;
    status.statusMessage = null;
    status.emoji = null;
    status.autoResetAt = null;

    await this.statusRepository.save(status);
  }

  /**
   * Get status history (last 20 entries, FIFO)
   */
  async getStatusHistory(artistId: string): Promise<StatusHistoryResponseDto[]> {
    const artist = await this.artistRepository.findOne({ where: { id: artistId } });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const history = await this.historyRepository.find({
      where: { artistId },
      order: { setAt: 'DESC' },
      take: MAX_HISTORY_ENTRIES,
    });

    return history.map((h) => StatusHistoryResponseDto.fromEntity(h));
  }

  /**
   * Auto-clear statuses when autoResetAt passes
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoClearExpiredStatuses(): Promise<void> {
    try {
      const now = new Date();

      const expiredStatuses = await this.statusRepository.find({
        where: {
          autoResetAt: LessThanOrEqual(now),
        },
      });

      for (const status of expiredStatuses) {
        this.logger.log(`Auto-clearing expired status for artist ${status.artistId}`);

        // Mark history as cleared
        await this.historyRepository.update(
          {
            artistStatusId: status.id,
            clearedAt: null,
          },
          { clearedAt: new Date() },
        );

        // Reset status
        status.statusType = StatusType.ACTIVE;
        status.statusMessage = null;
        status.emoji = null;
        status.autoResetAt = null;
        await this.statusRepository.save(status);
      }

      if (expiredStatuses.length > 0) {
        this.logger.log(
          `Auto-cleared ${expiredStatuses.length} expired artist statuses`,
        );
      }
    } catch (error) {
      this.logger.error('Error auto-clearing expired statuses', error);
    }
  }

  /**
   * Check if artist status should be shown on profile
   */
  async getPublicStatus(artistId: string): Promise<ArtistStatusResponseDto | null> {
    const status = await this.statusRepository.findOne({
      where: { artistId },
    });

    if (!status || !status.showOnProfile) {
      return null;
    }

    return ArtistStatusResponseDto.fromEntity(status);
  }

  /**
   * Private: Add entry to status history
   */
  private async addHistoryEntry(
    artistId: string,
    artistStatusId: string,
    statusType: StatusType | string,
    statusMessage: string | null,
  ): Promise<void> {
    // Get current history count for this artist
    const count = await this.historyRepository.count({
      where: { artistId },
    });

    // If at max, delete oldest entry
    if (count >= MAX_HISTORY_ENTRIES) {
      const oldest = await this.historyRepository.findOne({
        where: { artistId },
        order: { setAt: 'ASC' },
      });
      if (oldest) {
        await this.historyRepository.remove(oldest);
      }
    }

    // Add new entry
    const entry = this.historyRepository.create({
      artistId,
      artistStatusId,
      statusType,
      statusMessage,
    });

    await this.historyRepository.save(entry);
  }

  /**
   * Private: Notify followers of status change for relevant statuses
   */
  private async notifyFollowersOfStatusChange(
    artistId: string,
    artistName: string,
    statusType: StatusType | string,
    statusMessage: string | null,
  ): Promise<void> {
    // Only notify for specific statuses
    const notifiableStatuses = [StatusType.ON_TOUR, StatusType.ACCEPTING_REQUESTS];

    if (!notifiableStatuses.includes(statusType as StatusType)) {
      return;
    }

    try {
      // Get all followers
      const followers = await this.followRepository.find({
        where: {
          followingId: artistId,
          followingType: FollowingType.ARTIST,
        },
        relations: ['follower'],
      });

      // Build notification
      let title = '';
      let message = '';

      if (statusType === StatusType.ON_TOUR) {
        title = `${artistName} is on tour!`;
        message = statusMessage
          ? `${artistName} is on tour: ${statusMessage}`
          : `${artistName} is now on tour!`;
      } else if (statusType === StatusType.ACCEPTING_REQUESTS) {
        title = `${artistName} is accepting requests!`;
        message = statusMessage
          ? `${artistName} is accepting custom requests: ${statusMessage}`
          : `${artistName} is now accepting custom requests!`;
      }

      // Notify each follower
      for (const follow of followers) {
        try {
          await this.notificationsService.create({
            userId: follow.followerId,
            type: NotificationType.GENERAL,
            title,
            message,
            data: {
              artistId,
              statusType,
              artistName,
            },
          });
        } catch (error) {
          this.logger.error(
            `Error notifying follower ${follow.followerId} of status change`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error notifying followers of artist ${artistId} status change`,
        error,
      );
    }
  }
}
