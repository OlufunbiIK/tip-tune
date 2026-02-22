import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { User } from '../../users/entities/user.entity';

export enum PlaylistChangeAction {
  ADD_TRACK = 'add_track',
  REMOVE_TRACK = 'remove_track',
  REORDER_TRACKS = 'reorder_tracks',
}

export enum PlaylistChangeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('playlist_change_requests')
@Index(['playlistId', 'status'])
@Index(['requestedById'])
export class PlaylistChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid', name: 'requested_by_id' })
  requestedById: string;

  @Column({
    type: 'enum',
    enum: PlaylistChangeAction,
  })
  action: PlaylistChangeAction;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: PlaylistChangeStatus,
    default: PlaylistChangeStatus.PENDING,
  })
  status: PlaylistChangeStatus;

  @Column({ type: 'uuid', name: 'reviewed_by_id', nullable: true })
  reviewedById: string | null;

  @Column({ type: 'timestamp', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Playlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User | null;
}
