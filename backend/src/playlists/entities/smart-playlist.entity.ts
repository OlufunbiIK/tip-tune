import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Playlist } from './playlist.entity';

@Entity('smart_playlists')
@Index(['playlistId'])
export class SmartPlaylist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'jsonb' })
  criteria: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'auto_update' })
  autoUpdate: boolean;

  @Column({ type: 'timestamp', name: 'last_updated', nullable: true })
  lastUpdated: Date | null;

  @OneToOne(() => Playlist, (playlist) => playlist.smartPlaylist, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;
}
