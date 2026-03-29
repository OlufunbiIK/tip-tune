import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisModule } from '../redis/redis.module';
import { CacheInterceptor } from './cache.interceptor';
import { CacheService } from './cache.service';

/**
 * CacheModule is marked @Global so that CacheService can be injected anywhere
 * without repeating the import in every feature module.
 *
 * RedisModule is NOT imported here — it is registered once in AppModule via
 * RedisModule.forRootAsync() which is already @Global itself. This module
 * simply declares the service layer that wraps the shared Redis client.
 */
@Global()
@Module({
  providers: [
    CacheService,
    CacheInterceptor,
    Reflector,
  ],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}
