import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ScheduledRelease } from "./entities/scheduled-release.entity";
import { PreSave } from "./entities/presave.entity";
import { Track } from "../tracks/entities/track.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { FollowsService } from "../follows/follows.service";

@Injectable()
export class PreSavesService {
  private readonly logger = new Logger(PreSavesService.name);

  constructor(
    @InjectRepository(ScheduledRelease)
    private scheduledReleaseRepository: Repository<ScheduledRelease>,
    @InjectRepository(PreSave)
    private preSaveRepository: Repository<PreSave>,
    @InjectRepository(Track)
    private trackRepository: Repository<Track>,
    private notificationsService: NotificationsService,
    private followsService: FollowsService
  ) {}

  async createScheduledRelease(
    trackId: string,
    releaseDate: Date,
    notifyFollowers: boolean = true
  ): Promise<ScheduledRelease> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ["artist"],
    });

    if (!track) {
      throw new NotFoundException("Track not found");
    }

    if (new Date(releaseDate) <= new Date()) {
      throw new BadRequestException("Release date must be in the future");
    }

    // Mark track as scheduled (not publicly visible yet)
    await this.trackRepository.update(trackId, {
      isPublic: false,
    });

    const scheduledRelease = this.scheduledReleaseRepository.create({
      trackId,
      releaseDate: new Date(releaseDate),
      notifyFollowers,
    });

    return this.scheduledReleaseRepository.save(scheduledRelease);
  }

  async getScheduledRelease(id: string): Promise<ScheduledRelease> {
    const release = await this.scheduledReleaseRepository.findOne({
      where: { id },
      relations: ["track", "track.artist"],
    });

    if (!release) {
      throw new NotFoundException("Scheduled release not found");
    }

    return release;
  }

  async getScheduledReleaseByTrackId(
    trackId: string
  ): Promise<ScheduledRelease | null> {
    return this.scheduledReleaseRepository.findOne({
      where: { trackId, isReleased: false },
      relations: ["track", "track.artist"],
    });
  }

  async updateScheduledRelease(
    id: string,
    releaseDate?: Date,
    notifyFollowers?: boolean
  ): Promise<ScheduledRelease> {
    const release = await this.getScheduledRelease(id);

    if (release.isReleased) {
      throw new BadRequestException("Cannot update already released track");
    }

    if (releaseDate && new Date(releaseDate) <= new Date()) {
      throw new BadRequestException("Release date must be in the future");
    }

    if (releaseDate) {
      release.releaseDate = new Date(releaseDate);
    }

    if (notifyFollowers !== undefined) {
      release.notifyFollowers = notifyFollowers;
    }

    return this.scheduledReleaseRepository.save(release);
  }

  async cancelScheduledRelease(id: string): Promise<void> {
    const release = await this.getScheduledRelease(id);

    if (release.isReleased) {
      throw new BadRequestException("Cannot cancel already released track");
    }

    // Delete all pre-saves
    await this.preSaveRepository.delete({ trackId: release.trackId });

    // Delete the scheduled release
    await this.scheduledReleaseRepository.delete(id);
  }

  async getUpcomingReleases(limit: number = 20): Promise<ScheduledRelease[]> {
    return this.scheduledReleaseRepository.find({
      where: { isReleased: false },
      relations: ["track", "track.artist"],
      order: { releaseDate: "ASC" },
      take: limit,
    });
  }

  async getArtistScheduledReleases(
    artistId: string
  ): Promise<ScheduledRelease[]> {
    return this.scheduledReleaseRepository
      .createQueryBuilder("sr")
      .leftJoinAndSelect("sr.track", "track")
      .leftJoinAndSelect("track.artist", "artist")
      .where("artist.id = :artistId", { artistId })
      .andWhere("sr.isReleased = :isReleased", { isReleased: false })
      .orderBy("sr.releaseDate", "ASC")
      .getMany();
  }

  // Cron job runs every minute to check for releases
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledReleases(): Promise<void> {
    this.logger.log("Checking for scheduled releases...");

    const releasesToPublish = await this.scheduledReleaseRepository.find({
      where: {
        releaseDate: LessThanOrEqual(new Date()),
        isReleased: false,
      },
      relations: ["track", "track.artist"],
    });

    if (releasesToPublish.length === 0) {
      this.logger.log("No releases to publish");
      return;
    }

    this.logger.log(`Publishing ${releasesToPublish.length} releases`);

    for (const release of releasesToPublish) {
      try {
        await this.releaseTrack(release);
      } catch (error) {
        this.logger.error(
          `Failed to release track ${release.trackId}: ${error.message}`
        );
      }
    }
  }

  private async releaseTrack(release: ScheduledRelease): Promise<void> {
    // Mark track as public
    await this.trackRepository.update(release.trackId, {
      isPublic: true,
    });

    // Mark release as completed
    release.isReleased = true;
    await this.scheduledReleaseRepository.save(release);

    // Notify pre-savers
    await this.notifyPreSavers(release);

    // Notify followers if enabled
    if (release.notifyFollowers) {
      await this.notifyFollowers(release);
    }

    this.logger.log(
      `Successfully released track ${release.track.title} (${release.trackId})`
    );
  }

  private async notifyPreSavers(release: ScheduledRelease): Promise<void> {
    const preSaves = await this.preSaveRepository.find({
      where: { trackId: release.trackId, notified: false },
      relations: ["user"],
    });

    for (const preSave of preSaves) {
      try {
        await this.notificationsService.create({
          userId: preSave.userId,
          type: "track_released",
          title: "Track Released!",
          message: `${release.track.title} by ${release.track.artist.artistName} is now available!`,
          data: {
            trackId: release.trackId,
            artistId: release.track.artist.id,
          },
        });

        preSave.notified = true;
        await this.preSaveRepository.save(preSave);
      } catch (error) {
        this.logger.error(
          `Failed to notify user ${preSave.userId}: ${error.message}`
        );
      }
    }
  }

  private async notifyFollowers(release: ScheduledRelease): Promise<void> {
    const result = await this.followsService.getFollowers(
      release.track.artist.id,
      { page: 1, limit: 100 }
    );

    const followers = result.data;

    for (const follower of followers) {
      try {
        // Skip if user already pre-saved (they'll get the pre-save notification)
        const hasPreSaved = await this.preSaveRepository.findOne({
          where: {
            userId: follower.id,
            trackId: release.trackId,
          },
        });

        if (!hasPreSaved) {
          await this.notificationsService.create({
            userId: follower.id,
            type: "new_release",
            title: "New Release",
            message: `${release.track.artist.artistName} just released ${release.track.title}!`,
            data: {
              trackId: release.trackId,
              artistId: release.track.artist.id,
            },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to notify follower ${follower.id}: ${error.message}`
        );
      }
    }
  }

  async getAnalytics(trackId: string) {
    const release = await this.getScheduledReleaseByTrackId(trackId);

    if (!release) {
      throw new NotFoundException("No scheduled release found for this track");
    }

    const totalPreSaves = await this.preSaveRepository.count({
      where: { trackId },
    });

    const notifiedPreSaves = await this.preSaveRepository.count({
      where: { trackId, notified: true },
    });

    const recentPreSaves = await this.preSaveRepository.count({
      where: {
        trackId,
        createdAt: LessThanOrEqual(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ),
      },
    });

    return {
      trackId,
      releaseDate: release.releaseDate,
      isReleased: release.isReleased,
      totalPreSaves,
      notifiedPreSaves,
      recentPreSaves,
      daysUntilRelease: release.isReleased
        ? 0
        : Math.ceil(
            (release.releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
    };
  }

  // Pre-save related methods
  async createPreSave(userId: string, trackId: string): Promise<PreSave> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
    });
    if (!track) {
      throw new NotFoundException("Track not found");
    }

    const existing = await this.preSaveRepository.findOne({
      where: { userId, trackId },
    });

    if (existing) {
      return existing;
    }

    const preSave = this.preSaveRepository.create({ userId, trackId });
    return this.preSaveRepository.save(preSave);
  }

  async removePreSave(userId: string, trackId: string): Promise<void> {
    await this.preSaveRepository.delete({ userId, trackId });
  }

  async getTrackPreSaves(trackId: string): Promise<PreSave[]> {
    return this.preSaveRepository.find({
      where: { trackId },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async getUserPreSaves(userId: string): Promise<PreSave[]> {
    return this.preSaveRepository.find({
      where: { userId },
      relations: ["track"],
      order: { createdAt: "DESC" },
    });
  }

  async hasPreSaved(userId: string, trackId: string): Promise<boolean> {
    const count = await this.preSaveRepository.count({
      where: { userId, trackId },
    });
    return count > 0;
  }
}
