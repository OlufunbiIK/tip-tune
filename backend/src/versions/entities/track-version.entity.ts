import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Track } from '../../tracks/entities/track.entity';

@Entity('track_versions')
@Index(['trackId', 'versionNumber'], { unique: true })
export class TrackVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trackId: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ length: 500 })
  audioUrl: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'int' })
  duration: number;

  @Column({ type: 'text', nullable: true })
  changeNote: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ length: 100 })
  uploadedBy: string;
}
