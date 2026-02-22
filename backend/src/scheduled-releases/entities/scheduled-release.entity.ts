import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Track } from "../../tracks/entities/track.entity";

@Entity("scheduled_releases")
@Index(["releaseDate", "isReleased"])
export class ScheduledRelease {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  trackId: string;

  @ManyToOne(() => Track, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trackId" })
  track: Track;

  @Column({ type: "timestamp" })
  releaseDate: Date;

  @Column({ type: "boolean", default: false })
  isReleased: boolean;

  @Column({ type: "boolean", default: true })
  notifyFollowers: boolean;

  @Column({ type: "integer", default: 0 })
  presaveCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
