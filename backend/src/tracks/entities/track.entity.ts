import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Artist } from "../../artists/entities/artist.entity";
import { Tip } from "../../tips/entities/tip.entity";
import { TrackGenre } from "../../genres/entities/track-genre.entity";
import { Collaboration } from "../../collaboration/entities/collaboration.entity";

@Entity("tracks")
export class Track {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "int" })
  duration: number; // in seconds

  @Column({ length: 500 })
  audioUrl: string;

  @Column({ length: 500, nullable: true })
  coverArtUrl: string;

  @Column({ length: 100, nullable: true })
  genre: string;

  @Column({ type: "date", nullable: true })
  releaseDate: Date;

  @Column({ type: "int", default: 0 })
  plays: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalTips: number;

  @Column({ type: "int", default: 0 })
  tipCount: number;

  @Column({ length: 255, nullable: true })
  filename: string;

  @Column({ length: 500, nullable: true })
  url: string;

  @Column({ length: 500, nullable: true })
  streamingUrl: string;

  @Column({ type: "bigint", nullable: true })
  fileSize: bigint;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  album: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: "uuid", nullable: true })
  artistId: string;

  @ManyToOne(() => Artist, (artist) => artist.tracks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "artistId" })
  artist: Artist;

  @OneToMany(() => Tip, (tip) => tip.track)
  tips: Tip[];

  @OneToMany(() => TrackGenre, (trackGenre) => trackGenre.track)
  trackGenres: TrackGenre[];

  @OneToMany(() => Collaboration, (collab) => collab.track)
  collaborations: Collaboration[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
