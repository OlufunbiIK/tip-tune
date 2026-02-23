import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackPlay } from './entities/track-play.entity';
import { PlayCountService } from './play-count.service';
import { PlayCountController } from './play-count.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrackPlay])],
  controllers: [PlayCountController],
  providers: [PlayCountService],
  exports: [PlayCountService],
})
export class PlayCountModule {}
