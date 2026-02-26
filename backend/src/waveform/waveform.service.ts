import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackWaveform, GenerationStatus } from './entities/track-waveform.entity';
import { WaveformGeneratorService } from './waveform-generator.service';

@Injectable()
export class WaveformService {
  private readonly logger = new Logger(WaveformService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectRepository(TrackWaveform)
    private waveformRepository: Repository<TrackWaveform>,
    private generatorService: WaveformGeneratorService,
  ) {}

  async generateForTrack(trackId: string, audioFilePath: string, dataPoints: number = 200): Promise<TrackWaveform> {
    const startTime = Date.now();
    
    await this.waveformRepository.upsert(
      {
        trackId,
        dataPoints,
        generationStatus: GenerationStatus.PROCESSING,
      },
      ['trackId']
    );
    
    let waveform = await this.waveformRepository.findOne({ where: { trackId } });

    try {
      const { waveformData, peakAmplitude } = await this.generatorService.generateWaveform(audioFilePath, dataPoints);
      
      waveform.waveformData = waveformData;
      waveform.peakAmplitude = peakAmplitude;
      waveform.generationStatus = GenerationStatus.COMPLETED;
      waveform.processingDurationMs = Date.now() - startTime;
      waveform.retryCount = 0;

      return await this.waveformRepository.save(waveform);
    } catch (error) {
      this.logger.error(`Waveform generation failed for track ${trackId}: ${error.message}`);
      
      waveform.retryCount = (waveform.retryCount || 0) + 1;
      waveform.generationStatus = waveform.retryCount > this.MAX_RETRIES 
        ? GenerationStatus.FAILED 
        : GenerationStatus.PENDING;
      
      await this.waveformRepository.save(waveform);

      if (waveform.retryCount <= this.MAX_RETRIES) {
        // TODO: Replace with durable job queue (Bull/BullMQ)
        setTimeout(() => {
          this.generateForTrack(trackId, audioFilePath, dataPoints).catch(err => {
            this.logger.error(`Retry failed for track ${trackId}: ${err.message}`);
          });
        }, 5000 * waveform.retryCount);
      }

      throw error;
    }
  }

  async getByTrackId(trackId: string): Promise<TrackWaveform> {
    const waveform = await this.waveformRepository.findOne({ where: { trackId } });
    if (!waveform) {
      throw new NotFoundException(`Waveform not found for track ${trackId}`);
    }
    return waveform;
  }

  async getStatus(trackId: string): Promise<{ status: GenerationStatus; retryCount: number }> {
    const waveform = await this.waveformRepository.findOne({ 
      where: { trackId },
      select: ['generationStatus', 'retryCount']
    });
    
    if (!waveform) {
      throw new NotFoundException(`Waveform not found for track ${trackId}`);
    }

    return {
      status: waveform.generationStatus,
      retryCount: waveform.retryCount || 0,
    };
  }

  async regenerate(trackId: string, audioFilePath: string): Promise<TrackWaveform> {
    const waveform = await this.waveformRepository.findOne({ where: { trackId } });
    
    if (waveform) {
      waveform.retryCount = 0;
      await this.waveformRepository.save(waveform);
    }

    return this.generateForTrack(trackId, audioFilePath, waveform?.dataPoints || 200);
  }
}
