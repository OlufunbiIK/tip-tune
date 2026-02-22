import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ActivityType {
  NEW_TRACK = 'new_track',
  TIP_SENT = 'tip_sent',
  TIP_RECEIVED = 'tip_received',
  ARTIST_FOLLOWED = 'artist_followed',
  NEW_FOLLOWER = 'new_follower',
  PLAYLIST_TRACK_ADDED = 'playlist_track_added',
  PLAYLIST_TRACK_REMOVED = 'playlist_track_removed',
  PLAYLIST_COLLABORATOR_INVITED = 'playlist_collaborator_invited',
  PLAYLIST_COLLABORATOR_ACCEPTED = 'playlist_collaborator_accepted',
  PLAYLIST_COLLABORATOR_REJECTED = 'playlist_collaborator_rejected',
  PLAYLIST_COLLABORATOR_ROLE_UPDATED = 'playlist_collaborator_role_updated',
  PLAYLIST_COLLABORATOR_REMOVED = 'playlist_collaborator_removed',
  PLAYLIST_CHANGE_REQUESTED = 'playlist_change_requested',
  PLAYLIST_CHANGE_APPROVED = 'playlist_change_approved',
  PLAYLIST_CHANGE_REJECTED = 'playlist_change_rejected',
  SMART_PLAYLIST_REFRESHED = 'smart_playlist_refreshed',
}

export enum EntityType {
  TRACK = 'track',
  TIP = 'tip',
  ARTIST = 'artist',
  PLAYLIST = 'playlist',
  SMART_PLAYLIST = 'smart_playlist',
}

@Entity('activities')
@Index(['userId', 'createdAt'])
@Index(['userId', 'activityType'])
@Index(['userId', 'isSeen'])
@Index(['entityType', 'entityId'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({
    type: 'enum',
    enum: EntityType,
  })
  entityType: EntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isSeen: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
