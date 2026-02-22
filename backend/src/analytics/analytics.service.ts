import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import Redis from 'ioredis';
import { Tip, TipStatus } from '../tips/entities/tip.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Genre } from '../genres/entities/genre.entity';
import { REDIS_CLIENT } from '../leaderboards/redis.module';
import {
  AnalyticsQueryDto,
  AnalyticsPeriod,
  AnalyticsGroupBy,
  TrendsQueryDto,
  RankingsQueryDto,
} from './dto/analytics-query.dto';
import {
  TipSummaryDto,
  TrendsResponseDto,
  RankingsResponseDto,
  GenreDistributionResponseDto,
  ArtistAnalyticsDto,
  ExportReportDto,
  TrendDataPoint,
} from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes default
  private readonly LONG_CACHE_TTL = 3600; // 1 hour for historical data

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Artist)
    private readonly artistRepository: Repository<Artist>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Get date range from period string
   */
  private getDateRange(period: AnalyticsPeriod): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case AnalyticsPeriod.DAY:
        start.setDate(start.getDate() - 1);
        break;
      case AnalyticsPeriod.WEEK:
        start.setDate(start.getDate() - 7);
        break;
      case AnalyticsPeriod.MONTH:
        start.setDate(start.getDate() - 30);
        break;
      case AnalyticsPeriod.QUARTER:
        start.setDate(start.getDate() - 90);
        break;
      case AnalyticsPeriod.YEAR:
        start.setFullYear(start.getFullYear() - 1);
        break;
      case AnalyticsPeriod.ALL:
        start.setFullYear(2020, 0, 1); // Platform launch date
        break;
    }

    return { start, end };
  }

  /**
   * Get cache key for analytics queries
   */
  private getCacheKey(prefix: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');
    return `analytics:${prefix}:${sortedParams}`;
  }

  /**
   * Get tip summary with caching
   */
  async getTipSummary(query: AnalyticsQueryDto): Promise<TipSummaryDto> {
    const cacheKey = this.getCacheKey('summary', query);
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { start, end } = query.startDate && query.endDate
      ? { start: new Date(query.startDate), end: new Date(query.endDate) }
      : this.getDateRange(query.period || AnalyticsPeriod.WEEK);

    const queryBuilder = this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt BETWEEN :start AND :end', { start, end });

    if (query.artistId) {
      queryBuilder.andWhere('tip.artistId = :artistId', { artistId: query.artistId });
    }

    const result = await queryBuilder
      .select([
        'COUNT(tip.id) as totalTips',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COALESCE(AVG(tip.amount), 0) as averageTipAmount',
        'COUNT(DISTINCT tip.senderAddress) as uniqueTippers',
        'COUNT(DISTINCT tip.artistId) as uniqueArtists',
      ])
      .getRawOne();

    const summary: TipSummaryDto = {
      totalTips: parseInt(result.totalTips || 0),
      totalAmount: parseFloat(result.totalAmount || 0),
      averageTipAmount: parseFloat(result.averageTipAmount || 0),
      uniqueTippers: parseInt(result.uniqueTippers || 0),
      uniqueArtists: parseInt(result.uniqueArtists || 0),
      periodStart: start,
      periodEnd: end,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(summary));

    return summary;
  }

  /**
   * Get tip trends over time
   */
  async getTipTrends(query: TrendsQueryDto): Promise<TrendsResponseDto> {
    const cacheKey = this.getCacheKey('trends', query);
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { start, end } = query.startDate && query.endDate
      ? { start: new Date(query.startDate), end: new Date(query.endDate) }
      : this.getDateRange(query.period || AnalyticsPeriod.WEEK);

    const groupBy = query.groupBy || 'day';
    
    // Determine date truncation format based on groupBy
    let dateTrunc: string;
    switch (groupBy) {
      case 'hour':
        dateTrunc = 'hour';
        break;
      case 'week':
        dateTrunc = 'week';
        break;
      case 'month':
        dateTrunc = 'month';
        break;
      default:
        dateTrunc = 'day';
    }

    const queryBuilder = this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt BETWEEN :start AND :end', { start, end });

    if (query.artistId) {
      queryBuilder.andWhere('tip.artistId = :artistId', { artistId: query.artistId });
    }

    const results = await queryBuilder
      .select([
        `DATE_TRUNC('${dateTrunc}', tip.createdAt) as timestamp`,
        'COUNT(tip.id) as tipCount',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COUNT(DISTINCT tip.senderAddress) as uniqueTippers',
      ])
      .groupBy(`DATE_TRUNC('${dateTrunc}', tip.createdAt)`)
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    const data: TrendDataPoint[] = results.map((row) => ({
      timestamp: new Date(row.timestamp),
      tipCount: parseInt(row.tipCount || 0),
      totalAmount: parseFloat(row.totalAmount || 0),
      uniqueTippers: parseInt(row.uniqueTippers || 0),
    }));

    // Calculate summary stats
    const totalTips = data.reduce((sum, d) => sum + d.tipCount, 0);
    const totalAmount = data.reduce((sum, d) => sum + d.totalAmount, 0);
    
    // Calculate growth rate (compare first half to second half)
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    const firstHalfAmount = firstHalf.reduce((sum, d) => sum + d.totalAmount, 0);
    const secondHalfAmount = secondHalf.reduce((sum, d) => sum + d.totalAmount, 0);
    const growthRate = firstHalfAmount > 0 
      ? ((secondHalfAmount - firstHalfAmount) / firstHalfAmount) * 100 
      : 0;

    const response: TrendsResponseDto = {
      data,
      period: query.period || AnalyticsPeriod.WEEK,
      groupBy,
      summary: {
        totalTips,
        totalAmount,
        growthRate: Math.round(growthRate * 100) / 100,
      },
    };

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Get artist rankings
   */
  async getArtistRankings(query: RankingsQueryDto): Promise<RankingsResponseDto> {
    const cacheKey = this.getCacheKey('rankings', query);
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { start, end } = this.getDateRange(query.period || AnalyticsPeriod.WEEK);

    const queryBuilder = this.artistRepository
      .createQueryBuilder('artist')
      .leftJoin('artist.tips', 'tip', 'tip.status = :status AND tip.createdAt BETWEEN :start AND :end', {
        status: TipStatus.VERIFIED,
        start,
        end,
      })
      .leftJoin('artist.user', 'user');

    if (query.genre) {
      queryBuilder.andWhere('artist.genre = :genre', { genre: query.genre });
    }

    const results = await queryBuilder
      .select([
        'artist.id as artistId',
        'artist.artistName as artistName',
        'artist.profileImage as profileImage',
        'artist.genre as genre',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COUNT(tip.id) as totalTips',
        'COALESCE(AVG(tip.amount), 0) as averageTipAmount',
        'COUNT(DISTINCT tip.senderAddress) as uniqueTippers',
      ])
      .groupBy('artist.id')
      .addGroupBy('artist.artistName')
      .addGroupBy('artist.profileImage')
      .addGroupBy('artist.genre')
      .orderBy('totalAmount', 'DESC')
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .getRawMany();

    const rankings = results.map((result, index) => ({
      artistId: result.artistId,
      artistName: result.artistName,
      profileImage: result.profileImage,
      genre: result.genre,
      rank: (query.offset || 0) + index + 1,
      totalTips: parseInt(result.totalTips || 0),
      totalAmount: parseFloat(result.totalAmount || 0),
      averageTipAmount: parseFloat(result.averageTipAmount || 0),
      uniqueTippers: parseInt(result.uniqueTippers || 0),
    }));

    const response: RankingsResponseDto = {
      rankings,
      period: query.period || AnalyticsPeriod.WEEK,
      total: rankings.length,
      updatedAt: new Date(),
    };

    await this.redis.setex(cacheKey, this.LONG_CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Get genre distribution
   */
  async getGenreDistribution(query: AnalyticsQueryDto): Promise<GenreDistributionResponseDto> {
    const cacheKey = this.getCacheKey('genre-distribution', query);
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { start, end } = this.getDateRange(query.period || AnalyticsPeriod.WEEK);

    const results = await this.tipRepository
      .createQueryBuilder('tip')
      .innerJoin('tip.artist', 'artist')
      .where('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'COALESCE(artist.genre, \'Unknown\') as genre',
        'COUNT(tip.id) as tipCount',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COUNT(DISTINCT artist.id) as artistCount',
      ])
      .groupBy('artist.genre')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    const totalAmount = results.reduce((sum, r) => sum + parseFloat(r.totalAmount || 0), 0);

    const distribution = results.map((result) => ({
      genre: result.genre || 'Unknown',
      tipCount: parseInt(result.tipCount || 0),
      totalAmount: parseFloat(result.totalAmount || 0),
      percentage: totalAmount > 0 
        ? Math.round((parseFloat(result.totalAmount || 0) / totalAmount) * 10000) / 100 
        : 0,
      artistCount: parseInt(result.artistCount || 0),
    }));

    const response: GenreDistributionResponseDto = {
      distribution,
      period: query.period || AnalyticsPeriod.WEEK,
      totalAmount,
      updatedAt: new Date(),
    };

    await this.redis.setex(cacheKey, this.LONG_CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Get detailed analytics for a specific artist
   */
  async getArtistAnalytics(artistId: string): Promise<ArtistAnalyticsDto> {
    const cacheKey = `analytics:artist:${artistId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const artist = await this.artistRepository.findOne({
      where: { id: artistId },
    });

    if (!artist) {
      throw new Error('Artist not found');
    }

    // Get overall stats
    const stats = await this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.artistId = :artistId', { artistId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .select([
        'COUNT(tip.id) as totalTips',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COALESCE(AVG(tip.amount), 0) as averageTipAmount',
        'COUNT(DISTINCT tip.senderAddress) as uniqueTippers',
      ])
      .getRawOne();

    // Get top tippers
    const topTippers = await this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.artistId = :artistId', { artistId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .select([
        'tip.senderAddress as userId',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COUNT(tip.id) as tipCount',
      ])
      .groupBy('tip.senderAddress')
      .orderBy('totalAmount', 'DESC')
      .limit(10)
      .getRawMany();

    // Get daily trends for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrends = await this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.artistId = :artistId', { artistId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt >= :start', { start: thirtyDaysAgo })
      .select([
        "DATE_TRUNC('day', tip.createdAt) as timestamp",
        'COUNT(tip.id) as tipCount',
        'COALESCE(SUM(tip.amount), 0) as totalAmount',
        'COUNT(DISTINCT tip.senderAddress) as uniqueTippers',
      ])
      .groupBy("DATE_TRUNC('day', tip.createdAt)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    // Calculate growth rate
    const currentMonth = await this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.artistId = :artistId', { artistId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt >= :start', { start: thirtyDaysAgo })
      .select('COALESCE(SUM(tip.amount), 0) as amount')
      .getRawOne();

    const previousMonth = await this.tipRepository
      .createQueryBuilder('tip')
      .where('tip.artistId = :artistId', { artistId })
      .andWhere('tip.status = :status', { status: TipStatus.VERIFIED })
      .andWhere('tip.createdAt BETWEEN :start AND :end', {
        start: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: thirtyDaysAgo,
      })
      .select('COALESCE(SUM(tip.amount), 0) as amount')
      .getRawOne();

    const currentAmount = parseFloat(currentMonth?.amount || 0);
    const previousAmount = parseFloat(previousMonth?.amount || 0);
    const growthRate = previousAmount > 0 
      ? ((currentAmount - previousAmount) / previousAmount) * 100 
      : 0;

    const analytics: ArtistAnalyticsDto = {
      artistId,
      artistName: artist.artistName,
      totalTips: parseInt(stats.totalTips || 0),
      totalAmount: parseFloat(stats.totalAmount || 0),
      averageTipAmount: parseFloat(stats.averageTipAmount || 0),
      uniqueTippers: parseInt(stats.uniqueTippers || 0),
      tipGrowthRate: Math.round(growthRate * 100) / 100,
      topTippers: topTippers.map((t) => ({
        userId: t.userId,
        username: `User ${t.userId.slice(0, 8)}`,
        totalAmount: parseFloat(t.totalAmount || 0),
        tipCount: parseInt(t.tipCount || 0),
      })),
      dailyTrends: dailyTrends.map((d) => ({
        timestamp: new Date(d.timestamp),
        tipCount: parseInt(d.tipCount || 0),
        totalAmount: parseFloat(d.totalAmount || 0),
        uniqueTippers: parseInt(d.uniqueTippers || 0),
      })),
    };

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * Export analytics report
   */
  async exportReport(
    type: 'tips' | 'artists' | 'genres',
    query: AnalyticsQueryDto,
    format: 'csv' | 'json' | 'xlsx' = 'json',
  ): Promise<ExportReportDto> {
    let data: any[] = [];
    let filename: string;

    const timestamp = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'tips':
        const trends = await this.getTipTrends(query);
        data = trends.data;
        filename = `tip-trends-${timestamp}.${format}`;
        break;
      case 'artists':
        const rankings = await this.getArtistRankings(query);
        data = rankings.rankings;
        filename = `artist-rankings-${timestamp}.${format}`;
        break;
      case 'genres':
        const distribution = await this.getGenreDistribution(query);
        data = distribution.distribution;
        filename = `genre-distribution-${timestamp}.${format}`;
        break;
    }

    // Format data based on export type
    let exportData: any[] | string = data;
    if (format === 'csv') {
      exportData = this.convertToCSV(data);
    }

    return {
      format,
      data: exportData,
      filename,
      generatedAt: new Date(),
    };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Invalidate cache for specific analytics
   */
  async invalidateCache(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`analytics:${pattern}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
    }
  }

  /**
   * Pre-compute and cache common analytics
   */
  async precomputeAnalytics(): Promise<void> {
    this.logger.log('Starting analytics pre-computation');

    try {
      // Pre-compute tip summaries for different periods
      const periods = [AnalyticsPeriod.DAY, AnalyticsPeriod.WEEK, AnalyticsPeriod.MONTH];
      for (const period of periods) {
        await this.getTipSummary({ period });
        await this.getTipTrends({ period, groupBy: AnalyticsGroupBy.DAY });
        await this.getArtistRankings({ period, limit: 100 });
        await this.getGenreDistribution({ period });
      }

      this.logger.log('Analytics pre-computation completed');
    } catch (error) {
      this.logger.error('Error during analytics pre-computation', error);
    }
  }
}
