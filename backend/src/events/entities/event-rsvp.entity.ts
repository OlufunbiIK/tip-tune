import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { ArtistEvent } from './artist-event.entity';
import { User } from '../../users/entities/user.entity';

@Entity('event_rsvps')
@Unique(['eventId', 'userId'])
@Index(['eventId'])
@Index(['userId'])
export class EventRSVP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => ArtistEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: ArtistEvent;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'boolean', default: true })
  reminderEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

