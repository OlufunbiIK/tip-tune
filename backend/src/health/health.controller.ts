import { Inject, Optional, Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorFunction,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { statfsSync } from 'fs';
import { REDIS_CLIENT } from '../leaderboards/redis.module';
import { StellarHealthIndicator } from './stellar-health.indicator';

@Controller()
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly configService: ConfigService,
    private readonly stellarHealthIndicator: StellarHealthIndicator,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  @Get('health')
  @HealthCheck()
  async health() {
    return this.healthCheckService.check([
      ...this.getCriticalChecks(),
      this.getMemoryIndicator,
      this.getDiskIndicator,
      this.getAppIndicator,
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async ready() {
    return this.healthCheckService.check(this.getCriticalChecks());
  }

  @Get('live')
  live() {
    const app = this.getAppPayload();
    return {
      status: 'ok',
      info: { app },
      error: {},
      details: { app },
    };
  }

  private getCriticalChecks(): HealthIndicatorFunction[] {
    const checks: HealthIndicatorFunction[] = [
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.stellarHealthIndicator.isHealthy('stellar'),
    ];

    if (this.isRedisConfigured()) {
      checks.push(async () => {
        try {
          if (!this.redis) {
            throw new Error('Redis client not available');
          }
          const ping = await this.redis.ping();
          const isUp = ping === 'PONG';
          if (!isUp) {
            throw new Error('Redis ping did not return PONG');
          }
          return { redis: { status: 'up' as const } };
        } catch (error: any) {
          throw new HealthCheckError('Redis health check failed', {
            redis: { status: 'down', message: error?.message ?? 'Redis unreachable' },
          });
        }
      });
    } else {
      checks.push(async () => ({
        redis: { status: 'up', configured: false, message: 'Redis not configured' },
      }));
    }

    return checks;
  }

  private getMemoryIndicator = async (): Promise<HealthIndicatorResult> => {
    const usage = process.memoryUsage();
    const heapTotal = usage.heapTotal || 1;
    const heapUsagePercent = Math.round((usage.heapUsed / heapTotal) * 100);

    const memoryResult: {
      status: 'up';
      heapUsed: string;
      threshold: string;
      warning?: string;
    } = {
      status: 'up',
      heapUsed: `${heapUsagePercent}%`,
      threshold: '80%',
    };

    if (heapUsagePercent > 80) {
      memoryResult.warning = 'Heap usage above 80%';
    }

    return {
      memory: memoryResult,
    };
  };

  private getDiskIndicator = async (): Promise<HealthIndicatorResult> => {
    try {
      const healthPath = this.configService.get<string>('HEALTH_DISK_PATH', process.cwd());
      const stats = statfsSync(healthPath);
      const total = stats.blocks * stats.bsize;
      const available = stats.bavail * stats.bsize;
      const freePercent = total > 0 ? Math.round((available / total) * 100) : 100;

      const disk: {
        status: 'up';
        free: string;
        threshold: string;
        path: string;
        warning?: string;
      } = {
        status: 'up',
        free: `${freePercent}%`,
        threshold: '10%',
        path: healthPath,
      };

      if (freePercent < 10) {
        disk.warning = 'Disk free space below 10%';
      }

      return { disk };
    } catch (error: any) {
      return {
        disk: {
          status: 'up' as const,
          warning: 'Unable to read disk usage',
          message: error?.message ?? 'statfs failed',
        },
      };
    }
  };

  private getAppIndicator = async (): Promise<HealthIndicatorResult> => ({
    app: this.getAppPayload(),
  });

  private getAppPayload() {
    const version =
      this.configService.get<string>('APP_VERSION') || process.env.npm_package_version || '0.0.1';
    return {
      status: 'up' as const,
      version,
      uptime: Math.floor(process.uptime()),
    };
  }

  private isRedisConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('REDIS_URL') ||
        this.configService.get<string>('REDIS_HOST') ||
        this.configService.get<string>('REDIS_PORT'),
    );
  }
}
