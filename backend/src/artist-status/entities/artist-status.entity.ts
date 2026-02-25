import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';
import { StatusHistory } from './status-history.entity';

export enum StatusType {
  ACTIVE = 'active',
  ON_TOUR = 'on_tour',
  RECORDING = 'recording',
  ON_BREAK = 'on_break',
  HIATUS = 'hiatus',
  ACCEPTING_REQUESTS = 'accepting_requests',
}

@Entity('artist_statuses')
@Index('IDX_artist_status_artistId', ['artistId'], { unique: true })
@Index('IDX_artist_status_updatedAt', ['updatedAt'])
export class ArtistStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artistId: string;

  @ManyToOne(() => Artist, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @Column({
    type: 'enum',
    enum: StatusType,
    default: StatusType.ACTIVE,
  })
  statusType: StatusType;

  @Column({ type: 'varchar', length: 160, nullable: true })
  statusMessage: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji: string | null;

  @Column({ type: 'boolean', default: true })
  showOnProfile: boolean;

  @Column({ type: 'timestamp', nullable: true })
  autoResetAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => StatusHistory, (history) => history.artistStatus)
  history: StatusHistory[];
}
