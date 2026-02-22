import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { User } from '../../users/entities/user.entity';

export enum PlaylistCollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum PlaylistCollaboratorStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

@Entity('playlist_collaborators')
@Unique(['playlistId', 'userId'])
@Index(['playlistId', 'status'])
@Index(['userId'])
export class PlaylistCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PlaylistCollaboratorRole,
  })
  role: PlaylistCollaboratorRole;

  @Column({
    type: 'enum',
    enum: PlaylistCollaboratorStatus,
    default: PlaylistCollaboratorStatus.PENDING,
  })
  status: PlaylistCollaboratorStatus;

  @CreateDateColumn({ name: 'invited_at' })
  invitedAt: Date;

  @Column({ type: 'timestamp', name: 'accepted_at', nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => Playlist, (playlist) => playlist.collaborators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
