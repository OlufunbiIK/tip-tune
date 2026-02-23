import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { EventRSVP } from './event-rsvp.entity';

export enum EventType {
  LIVE_STREAM = 'live_stream',
  CONCERT = 'concert',
  MEET_GREET = 'meet_greet',
  ALBUM_RELEASE = 'album_release',
}

@Entity('artist_events')
@Index(['artistId', 'startTime'])
export class ArtistEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'artist_id' })
  @Index()
  artistId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EventType,
  })
  eventType: EventType;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ length: 255, nullable: true })
  venue: string | null;

  @Column({ name: 'stream_url', length: 500, nullable: true })
  streamUrl: string | null;

  @Column({ name: 'ticket_url', length: 500, nullable: true })
  ticketUrl: string | null;

  @Column({ name: 'is_virtual', default: false })
  isVirtual: boolean;

  @Column({ name: 'rsvp_count', type: 'int', default: 0 })
  rsvpCount: number;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => EventRSVP, (rsvp) => rsvp.event)
  rsvps: EventRSVP[];
}
