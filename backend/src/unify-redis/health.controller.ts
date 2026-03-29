import { Controller, Get } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { CacheService } from '../cache/cache.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redisHealthIndicator(),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Redis health indicator (manual — avoids @nestjs/terminus RedisIndicator
  // dependency on a specific Redis client type)
  // ---------------------------------------------------------------------------

  private async redisHealthIndicator() {
    const key = 'redis';
    const alive = await this.cache.ping();
    const metrics = this.cache.metrics;

    if (!alive) {
      return {
        [key]: {
          status: 'down',
          degraded: true,
          metrics,
        },
      };
    }

    return {
      [key]: {
        status: 'up',
        metrics,
      },
    };
  }
}
