import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { Track } from "../../tracks/entities/track.entity";
import { Genre } from "./genre.entity";

@Entity("track_genres")
@Unique(["trackId", "genreId"])
@Index(["trackId"])
@Index(["genreId"])
export class TrackGenre {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  trackId: string;

  @ManyToOne(() => Track, (track) => track.trackGenres, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trackId" })
  track: Track;

  @Column({ type: "uuid" })
  genreId: string;

  @ManyToOne(() => Genre, (genre) => genre.trackGenres, { onDelete: "CASCADE" })
  @JoinColumn({ name: "genreId" })
  genre: Genre;
}
