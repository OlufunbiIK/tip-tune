import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';

export enum ArtistEventType {
  LIVE_STREAM = 'live_stream',
  CONCERT = 'concert',
  MEET_GREET = 'meet_greet',
  ALBUM_RELEASE = 'album_release',
}

@Entity('artist_events')
@Index(['artistId', 'startTime'])
@Index(['startTime'])
export class ArtistEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artistId: string;

  @ManyToOne(() => Artist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ArtistEventType,
  })
  eventType: ArtistEventType;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date | null;

  @Column({ length: 255, nullable: true })
  venue: string | null;

  @Column({ length: 500, nullable: true })
  streamUrl: string | null;

  @Column({ length: 500, nullable: true })
  ticketUrl: string | null;

  @Column({ type: 'boolean', default: false })
  isVirtual: boolean;

  @Column({ type: 'integer', default: 0 })
  rsvpCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

