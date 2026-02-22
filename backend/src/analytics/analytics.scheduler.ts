import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod, AnalyticsGroupBy } from './dto/analytics-query.dto';

/**
 * Scheduled tasks for pre-computing and caching analytics data
 */
@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Pre-compute daily analytics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async precomputeDailyAnalytics() {
    this.logger.log('Pre-computing daily analytics');
    try {
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.DAY });
      await this.analyticsService.getTipTrends({ 
        period: AnalyticsPeriod.DAY, 
        groupBy: AnalyticsGroupBy.HOUR 
      });
      this.logger.log('Daily analytics pre-computed successfully');
    } catch (error) {
      this.logger.error('Error pre-computing daily analytics', error);
    }
  }

  /**
   * Pre-compute weekly analytics every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async precomputeWeeklyAnalytics() {
    this.logger.log('Pre-computing weekly analytics');
    try {
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.WEEK });
      await this.analyticsService.getTipTrends({ 
        period: AnalyticsPeriod.WEEK, 
        groupBy: AnalyticsGroupBy.DAY 
      });
      await this.analyticsService.getArtistRankings({ 
        period: AnalyticsPeriod.WEEK, 
        limit: 100 
      });
      await this.analyticsService.getGenreDistribution({ period: AnalyticsPeriod.WEEK });
      this.logger.log('Weekly analytics pre-computed successfully');
    } catch (error) {
      this.logger.error('Error pre-computing weekly analytics', error);
    }
  }

  /**
   * Pre-compute monthly analytics every 12 hours
   */
  @Cron('0 0 */12 * * *')
  async precomputeMonthlyAnalytics() {
    this.logger.log('Pre-computing monthly analytics');
    try {
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.MONTH });
      await this.analyticsService.getTipTrends({ 
        period: AnalyticsPeriod.MONTH, 
        groupBy: AnalyticsGroupBy.DAY 
      });
      await this.analyticsService.getArtistRankings({ 
        period: AnalyticsPeriod.MONTH, 
        limit: 100 
      });
      await this.analyticsService.getGenreDistribution({ period: AnalyticsPeriod.MONTH });
      this.logger.log('Monthly analytics pre-computed successfully');
    } catch (error) {
      this.logger.error('Error pre-computing monthly analytics', error);
    }
  }

  /**
   * Pre-compute quarterly and yearly analytics daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async precomputeLongTermAnalytics() {
    this.logger.log('Pre-computing long-term analytics');
    try {
      // Quarterly
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.QUARTER });
      await this.analyticsService.getTipTrends({ 
        period: AnalyticsPeriod.QUARTER, 
        groupBy: AnalyticsGroupBy.WEEK 
      });
      await this.analyticsService.getArtistRankings({ 
        period: AnalyticsPeriod.QUARTER, 
        limit: 100 
      });

      // Yearly
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.YEAR });
      await this.analyticsService.getTipTrends({ 
        period: AnalyticsPeriod.YEAR, 
        groupBy: AnalyticsGroupBy.MONTH 
      });
      await this.analyticsService.getArtistRankings({ 
        period: AnalyticsPeriod.YEAR, 
        limit: 100 
      });
      await this.analyticsService.getGenreDistribution({ period: AnalyticsPeriod.YEAR });

      this.logger.log('Long-term analytics pre-computed successfully');
    } catch (error) {
      this.logger.error('Error pre-computing long-term analytics', error);
    }
  }

  /**
   * Refresh all-time analytics weekly
   */
  @Cron(CronExpression.EVERY_WEEK)
  async precomputeAllTimeAnalytics() {
    this.logger.log('Pre-computing all-time analytics');
    try {
      await this.analyticsService.getTipSummary({ period: AnalyticsPeriod.ALL });
      await this.analyticsService.getArtistRankings({ 
        period: AnalyticsPeriod.ALL, 
        limit: 100 
      });
      await this.analyticsService.getGenreDistribution({ period: AnalyticsPeriod.ALL });
      this.logger.log('All-time analytics pre-computed successfully');
    } catch (error) {
      this.logger.error('Error pre-computing all-time analytics', error);
    }
  }
}
