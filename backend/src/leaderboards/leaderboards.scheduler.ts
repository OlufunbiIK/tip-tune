import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LeaderboardsService, LeaderboardType } from "./leaderboards.service";
import { Timeframe } from "./ranking.service";

/**
 * Scheduled tasks for updating leaderboards
 * Runs periodic cache refreshes to ensure data is up-to-date
 */
@Injectable()
export class LeaderboardsScheduler {
  private readonly logger = new Logger(LeaderboardsScheduler.name);

  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  /**
   * Refresh all-time leaderboards every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshAllTimeLeaderboards() {
    this.logger.log("Refreshing all-time leaderboards");
    try {
      const types = [
        LeaderboardType.ARTIST_MOST_TIPPED,
        LeaderboardType.ARTIST_MOST_PLAYED,
        LeaderboardType.TIPPER_MOST_GENEROUS,
        LeaderboardType.TIPPER_MOST_ACTIVE,
        LeaderboardType.TRACK_MOST_TIPPED,
        LeaderboardType.TRACK_MOST_PLAYED,
      ];

      for (const type of types) {
        await this.leaderboardsService.getLeaderboard(type, {
          timeframe: Timeframe.ALL_TIME,
          limit: 100,
          offset: 0,
        });
      }
      this.logger.log("All-time leaderboards refreshed successfully");
    } catch (error) {
      this.logger.error("Error refreshing all-time leaderboards", error);
    }
  }

  /**
   * Refresh weekly leaderboards every 15 minutes
   */
  @Cron("0 */15 * * * *")
  async refreshWeeklyLeaderboards() {
    this.logger.log("Refreshing weekly leaderboards");
    try {
      const types = [
        LeaderboardType.ARTIST_MOST_TIPPED,
        LeaderboardType.ARTIST_FASTEST_GROWING,
        LeaderboardType.TRACK_TRENDING,
      ];

      for (const type of types) {
        await this.leaderboardsService.getLeaderboard(type, {
          timeframe: Timeframe.WEEKLY,
          limit: 100,
          offset: 0,
        });
      }
      this.logger.log("Weekly leaderboards refreshed successfully");
    } catch (error) {
      this.logger.error("Error refreshing weekly leaderboards", error);
    }
  }

  /**
   * Refresh monthly leaderboards every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshMonthlyLeaderboards() {
    this.logger.log("Refreshing monthly leaderboards");
    try {
      const types = [
        LeaderboardType.ARTIST_MOST_TIPPED,
        LeaderboardType.ARTIST_MOST_PLAYED,
        LeaderboardType.TIPPER_MOST_GENEROUS,
        LeaderboardType.TRACK_MOST_TIPPED,
      ];

      for (const type of types) {
        await this.leaderboardsService.getLeaderboard(type, {
          timeframe: Timeframe.MONTHLY,
          limit: 100,
          offset: 0,
        });
      }
      this.logger.log("Monthly leaderboards refreshed successfully");
    } catch (error) {
      this.logger.error("Error refreshing monthly leaderboards", error);
    }
  }

  /**
   * Refresh trending tracks every 5 minutes (most dynamic)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshTrendingTracks() {
    this.logger.log("Refreshing trending tracks");
    try {
      await this.leaderboardsService.getLeaderboard(
        LeaderboardType.TRACK_TRENDING,
        {
          timeframe: Timeframe.ALL_TIME,
          limit: 100,
          offset: 0,
        },
      );
      this.logger.log("Trending tracks refreshed successfully");
    } catch (error) {
      this.logger.error("Error refreshing trending tracks", error);
    }
  }
}
