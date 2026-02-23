import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum PlaySource {
  SEARCH = 'search',
  PLAYLIST = 'playlist',
  ARTIST_PROFILE = 'artist_profile',
  TIP_FEED = 'tip_feed',
  DIRECT = 'direct',
}

@Entity('track_plays')
@Index(['trackId', 'userId', 'playedAt'])
@Index(['trackId', 'sessionId', 'playedAt'])
@Index(['ipHash', 'trackId', 'playedAt'])
export class TrackPlay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'track_id', type: 'uuid' })
  @Index()
  trackId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 128 })
  sessionId: string;

  @Column({ name: 'listen_duration', type: 'integer' })
  listenDuration: number;

  @Column({ name: 'completed_full', type: 'boolean', default: false })
  completedFull: boolean;

  @Column({
    type: 'enum',
    enum: PlaySource,
    default: PlaySource.DIRECT,
  })
  source: PlaySource;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64 })
  ipHash: string;

  @Column({ name: 'counted_as_play', type: 'boolean', default: false })
  countedAsPlay: boolean;

  @CreateDateColumn({ name: 'played_at' })
  playedAt: Date;
}
