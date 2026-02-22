import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('tracks')
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'artist_name' })
  artistName: string;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl: string;

  @Column({ name: 'audio_url' })
  audioUrl: string;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({ name: 'genre', nullable: true })
  genre: string;

  @Column({ name: 'embeds_enabled', default: true })
  embedsEnabled: boolean;

  @Column({ name: 'embed_token', nullable: true })
  embedToken: string;

  @Column({ name: 'embed_token_generated_at', nullable: true, type: 'timestamptz' })
  embedTokenGeneratedAt: Date;
}