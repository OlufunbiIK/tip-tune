import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Track } from "../../tracks/entities/track.entity";

@Entity("presaves")
@Unique(["userId", "trackId"])
@Index(["trackId", "notified"])
export class PreSave {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  trackId: string;

  @ManyToOne(() => Track, { onDelete: "CASCADE" })
  @JoinColumn({ name: "trackId" })
  track: Track;

  @Column({ type: "boolean", default: false })
  notified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
