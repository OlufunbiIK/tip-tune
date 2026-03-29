import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { CacheModule } from './cache/cache.module';
import { HealthController } from './health/health.controller';
import { RedisModule } from './redis/redis.module';
// Import your feature modules below as usual — they no longer need to create
// their own Redis clients.
// import { LeaderboardsModule } from './leaderboards/leaderboards.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // ── Redis — registered once, exported globally ───────────────────────────
    // All feature modules that previously imported their own redis.module.ts
    // now rely on the REDIS_CLIENT token provided here.
    RedisModule.forRootAsync(),

    // ── Cache — platform-level service available everywhere ──────────────────
    // CacheService and CacheInterceptor are now injectable application-wide
    // without re-importing CacheModule in every feature module.
    CacheModule,

    // ── Health ───────────────────────────────────────────────────────────────
    TerminusModule,

    // ── Feature modules ──────────────────────────────────────────────────────
    // LeaderboardsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
