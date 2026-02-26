import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ArtistStatus } from './artist-status.entity';
import { Artist } from '../../artists/entities/artist.entity';

@Entity('status_histories')
@Index('IDX_status_history_artistId', ['artistId'])
@Index('IDX_status_history_setAt', ['setAt'])
@Index('IDX_status_history_artistId_setAt', ['artistId', 'setAt'])
export class StatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artistId: string;

  @ManyToOne(() => Artist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @Column({ type: 'uuid', nullable: true })
  artistStatusId: string | null;

  @ManyToOne(() => ArtistStatus, (status) => status.history, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'artistStatusId' })
  artistStatus: ArtistStatus | null;

  @Column({ type: 'varchar' })
  statusType: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  statusMessage: string | null;

  @CreateDateColumn()
  setAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clearedAt: Date | null;
}
