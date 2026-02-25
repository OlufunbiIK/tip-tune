import { GenerationStatus } from '../entities/track-waveform.entity';

export class CreateWaveformDto {
  trackId: string;
  dataPoints?: number;
}

export class WaveformResponseDto {
  id: string;
  trackId: string;
  waveformData: number[];
  dataPoints: number;
  peakAmplitude: number;
  generationStatus: GenerationStatus;
  processingDurationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}
