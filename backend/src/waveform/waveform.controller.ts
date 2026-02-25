import { Controller, Get, Post, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { WaveformService } from './waveform.service';
import { TrackWaveform } from './entities/track-waveform.entity';

@Controller('api/waveform')
export class WaveformController {
  constructor(private readonly waveformService: WaveformService) {}

  @Get(':trackId')
  async getWaveform(@Param('trackId') trackId: string): Promise<TrackWaveform> {
    return this.waveformService.getByTrackId(trackId);
  }

  @Get(':trackId/status')
  async getStatus(@Param('trackId') trackId: string) {
    return this.waveformService.getStatus(trackId);
  }

  @Post(':trackId/regenerate')
  async regenerate(@Param('trackId') trackId: string): Promise<{ message: string }> {
    // Note: In production, you'd need to fetch the audio file path from the Track entity
    // This is a simplified version - integrate with your tracks service
    throw new NotFoundException('Regeneration requires track audio file path - integrate with tracks service');
  }
}
