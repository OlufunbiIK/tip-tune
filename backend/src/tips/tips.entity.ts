import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../users/entities/user.entity";
import { Track } from "../tracks/entities/track.entity";

export enum TipStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity("tips")
@Index(["fromUserId", "createdAt"])
@Index(["toArtistId", "createdAt"])
@Index(["status"])
export class Tip {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  fromUserId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "fromUserId" })
  fromUser: User;

  @Column({ type: "uuid" })
  toArtistId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "toArtistId" })
  toArtist: User;

  @Column({ type: "uuid", nullable: true })
  trackId: string;

  @ManyToOne(() => Track, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "trackId" })
  track: Track;

  @Column({ type: "decimal", precision: 18, scale: 7 })
  amount: number;

  @Column({ type: "decimal", precision: 18, scale: 2, nullable: true })
  usdValue: number;

  @Column({ type: "varchar", length: 255, unique: true })
  stellarTxHash: string;

  @Column({
    type: "enum",
    enum: TipStatus,
    default: TipStatus.PENDING,
  })
  status: TipStatus;

  @Column({ type: "text", nullable: true })
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
