import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { CacheMetrics } from './cache.types';

@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger(CacheMetricsService.name);
  private history: CacheMetrics[] = [];

  constructor(private readonly cacheService: CacheService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  collectMetrics() {
    const metrics = this.cacheService.getMetrics();
    this.history.push(metrics);

    // Keep last 60 entries (1 hour of history)
    if (this.history.length > 60) this.history.shift();

    this.logger.log(
      `Cache metrics — Hit rate: ${metrics.hitRate.toFixed(1)}% | ` +
      `Hits: ${metrics.hits} | Misses: ${metrics.misses} | ` +
      `Memory keys: ${metrics.keyCount}`,
    );

    // Warn if hit rate drops below 50%
    if (metrics.totalRequests > 100 && metrics.hitRate < 50) {
      this.logger.warn(`Low cache hit rate: ${metrics.hitRate.toFixed(1)}%`);
    }
  }

  getCurrentMetrics(): CacheMetrics {
    return this.cacheService.getMetrics();
  }

  getHistory(): CacheMetrics[] {
    return this.history;
  }

  getAverageHitRate(): number {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((acc, m) => acc + m.hitRate, 0);
    return sum / this.history.length;
  }
}