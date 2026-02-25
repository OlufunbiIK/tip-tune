import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackWaveform } from './entities/track-waveform.entity';
import { WaveformService } from './waveform.service';
import { WaveformController } from './waveform.controller';
import { WaveformGeneratorService } from './waveform-generator.service';
import { TracksModule } from '../tracks/tracks.module';

@Module({
  imports: [TypeOrmModule.forFeature([TrackWaveform]), TracksModule],
  controllers: [WaveformController],
  providers: [WaveformService, WaveformGeneratorService],
  exports: [WaveformService],
})
export class WaveformModule {}
