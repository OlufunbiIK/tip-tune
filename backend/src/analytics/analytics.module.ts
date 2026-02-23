import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsScheduler } from './analytics.scheduler';
import { Tip } from '../tips/entities/tip.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Genre } from '../genres/entities/genre.entity';
import { RedisModule } from '../leaderboards/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, Artist, Track, Genre]),
    RedisModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
