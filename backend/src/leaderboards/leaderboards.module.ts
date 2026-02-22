import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Tip } from '../tips/entities/tip.entity';
import { LeaderboardsController } from './leaderboards.controller';
import { LeaderboardsService } from './leaderboards.service';
import { RankingService } from './ranking.service';
import { RedisModule } from './redis.module';
import { LeaderboardsScheduler } from './leaderboards.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Artist, Track, Tip]),
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService, RankingService, LeaderboardsScheduler],
  exports: [LeaderboardsService, RankingService],
})
export class LeaderboardsModule {}
