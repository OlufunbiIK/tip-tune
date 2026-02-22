import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries. Some features may be unavailable.');
              return null; // Stop retrying
            }
            const delay = Math.min(times * 100, 2000);
            return delay;
          },
          lazyConnect: true,
        });

        redis.on('error', (err) => {
          logger.warn(`Redis connection error: ${err.message}. Leaderboard features may be unavailable.`);
        });

        redis.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        // Try to connect but don't block app startup
        redis.connect().catch(() => {
          logger.warn('Could not connect to Redis. Leaderboard features will be unavailable.');
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
