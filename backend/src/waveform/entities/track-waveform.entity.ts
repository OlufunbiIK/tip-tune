import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ValueTransformer } from 'typeorm';
import { Track } from '../../tracks/entities/track.entity';

export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

const decimalToNumber: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity('track_waveforms')
export class TrackWaveform {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  trackId: string;

  @OneToOne(() => Track)
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column({ type: 'jsonb', default: [] })
  waveformData: number[];

  @Column({ type: 'int', default: 200 })
  dataPoints: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0, transformer: decimalToNumber })
  peakAmplitude: number;

  @Column({ type: 'enum', enum: GenerationStatus, default: GenerationStatus.PENDING })
  generationStatus: GenerationStatus;

  @Column({ type: 'int', nullable: true })
  processingDurationMs: number | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
