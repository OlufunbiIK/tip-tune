import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PlaylistTrack } from './playlist-track.entity';
import { PlaylistCollaborator } from './playlist-collaborator.entity';
import { SmartPlaylist } from './smart-playlist.entity';

@Entity('playlists')
@Index(['userId', 'isPublic'])
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false, name: 'is_public' })
  isPublic: boolean;

  @Column({ default: false, name: 'approval_required' })
  approvalRequired: boolean;

  @Column({ length: 500, nullable: true, name: 'cover_image' })
  coverImage: string;

  @Column({ type: 'int', default: 0, name: 'track_count' })
  trackCount: number;

  @Column({ type: 'int', default: 0, name: 'total_duration' })
  totalDuration: number; // in seconds

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => PlaylistTrack, (playlistTrack) => playlistTrack.playlist, {
    cascade: true,
  })
  playlistTracks: PlaylistTrack[];

  @OneToMany(
    () => PlaylistCollaborator,
    (collaborator) => collaborator.playlist,
  )
  collaborators: PlaylistCollaborator[];

  @OneToOne(() => SmartPlaylist, (smartPlaylist) => smartPlaylist.playlist)
  smartPlaylist: SmartPlaylist;
}
