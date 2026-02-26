import { Controller, Get, Post, Param, NotFoundException, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { WaveformService } from './waveform.service';
import { TrackWaveform } from './entities/track-waveform.entity';
import { TracksService } from '../tracks/tracks.service';

@Controller('api/waveform')
export class WaveformController {
  constructor(
    private readonly waveformService: WaveformService,
    private readonly tracksService: TracksService,
  ) {}

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
    const track = await this.tracksService.findOne(trackId);
    
    if (!track.audioUrl && !track.filename) {
      throw new NotFoundException('Track audio file not found');
    }

    const audioPath = track.filename || track.audioUrl;

    try {
      await this.waveformService.regenerate(trackId, audioPath);
      return { message: 'Waveform regeneration started' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to regenerate waveform');
    }
  }
}
