import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Track } from './entities/track.entity';

@Entity('embed_views')
@Index(['trackId', 'referrerDomain'])
export class EmbedView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'track_id' })
  trackId: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column({ name: 'referrer_domain', nullable: true })
  referrerDomain: string;

  @CreateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;
}