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
  generationStatus: string;
  processingDurationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}
