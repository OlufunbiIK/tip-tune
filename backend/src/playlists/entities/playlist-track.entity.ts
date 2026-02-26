import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { Track } from '../../tracks/entities/track.entity';
import { AppBaseEntity } from '../../common/entities/base.entity';

@Entity('playlist_tracks')
@Unique(['playlistId', 'trackId']) // Prevent duplicate tracks in same playlist
@Index(['playlistId', 'position'])
export class PlaylistTrack extends AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  playlistId: string;

  @Column({ type: 'uuid' })
  @Index()
  trackId: string;

  @Column({ type: 'int' })
  position: number; // Order in playlist (0-based or 1-based)

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Playlist, (playlist) => playlist.playlistTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @ManyToOne(() => Track, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trackId' })
  track: Track;
}
