import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheWarmingService } from './cache-warming.service';
import { CacheMetricsService } from './cache-metrics.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = new Redis({
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', undefined),
          db: config.get<number>('REDIS_DB', 0),
          retryStrategy: (times) => Math.min(times * 100, 3000),
          enableOfflineQueue: false,
          lazyConnect: false,
        });

        client.on('connect', () => console.log('✅ Redis connected'));
        client.on('error', (err) => console.warn(`⚠️ Redis error: ${err.message}`));
        client.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

        return client;
      },
    },
    CacheService,
    CacheInterceptor,
    CacheWarmingService,
    CacheMetricsService,
  ],
  exports: [
    CacheService,
    CacheInterceptor,
    CacheWarmingService,
    CacheMetricsService,
    'REDIS_CLIENT',
  ],
})
export class CacheModule {}