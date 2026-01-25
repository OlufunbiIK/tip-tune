import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { TrackGenre } from "./track-genre.entity";

@Entity("genres")
@Index(["slug"], { unique: true })
@Index(["name"], { unique: true })
@Index(["parentGenreId"])
export class Genre {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "uuid", nullable: true })
  parentGenreId: string;

  @ManyToOne(() => Genre, (genre) => genre.children, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parentGenreId" })
  parent: Genre;

  @OneToMany(() => Genre, (genre) => genre.parent)
  children: Genre[];

  @OneToMany(() => TrackGenre, (trackGenre) => trackGenre.genre)
  trackGenres: TrackGenre[];

  @Column({ type: "int", default: 0 })
  trackCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
