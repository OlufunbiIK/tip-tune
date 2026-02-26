import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { Track } from '../../tracks/entities/track.entity';

@Entity('embed_views')
@Index(['trackId', 'viewedAt'])
@Index(['referrerDomain', 'viewedAt'])
export class EmbedView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'track_id' })
  @Index()
  trackId: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column({ name: 'referrer_domain', type: 'varchar', length: 255, nullable: true })
  referrerDomain: string | null;

  @CreateDateColumn({ name: 'viewed_at' })
  viewedAt: Date;
}