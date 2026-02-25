import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackWaveform } from './entities/track-waveform.entity';
import { WaveformService } from './waveform.service';
import { WaveformController } from './waveform.controller';
import { WaveformGeneratorService } from './waveform-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrackWaveform])],
  controllers: [WaveformController],
  providers: [WaveformService, WaveformGeneratorService],
  exports: [WaveformService],
})
export class WaveformModule {}
