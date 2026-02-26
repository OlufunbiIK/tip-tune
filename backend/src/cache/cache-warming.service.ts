import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { CACHE_KEYS, CACHE_TTL } from './cache.constants';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(private readonly cacheService: CacheService) {}

  async onModuleInit() {
    this.logger.log('Running initial cache warm-up...');
    await this.warmGenres();
    await this.warmLeaderboard();
    await this.warmFeatured();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async warmLeaderboard() {
    try {
      // Leaderboard warming — replace with actual repo query
      await this.cacheService.set(
        CACHE_KEYS.LEADERBOARD,
        { warmedAt: Date.now() },
        CACHE_TTL.LEADERBOARD,
      );
      this.logger.debug('Leaderboard cache warmed');
    } catch (err) {
      this.logger.warn(`Leaderboard warm failed: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async warmGenres() {
    try {
      await this.cacheService.set(
        CACHE_KEYS.GENRES,
        { warmedAt: Date.now() },
        CACHE_TTL.GENRES,
      );
      this.logger.debug('Genres cache warmed');
    } catch (err) {
      this.logger.warn(`Genres warm failed: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async warmFeatured() {
    try {
      await this.cacheService.set(
        CACHE_KEYS.FEATURED,
        { warmedAt: Date.now() },
        CACHE_TTL.LONG,
      );
      this.logger.debug('Featured cache warmed');
    } catch (err) {
      this.logger.warn(`Featured warm failed: ${err.message}`);
    }
  }

  async warmKey(key: string, loader: () => Promise<any>, ttl: number): Promise<void> {
    try {
      const value = await loader();
      await this.cacheService.set(key, value, ttl);
      this.logger.debug(`Warmed key: ${key}`);
    } catch (err) {
      this.logger.warn(`Failed to warm key ${key}: ${err.message}`);
    }
  }
}