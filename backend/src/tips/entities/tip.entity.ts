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
} from "typeorm";
import { Artist } from "../../artists/entities/artist.entity";
import { Track } from "../../tracks/entities/track.entity";
import { TipGoal } from "../../goals/entities/tip-goal.entity";

export enum TipStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  FAILED = "failed",
  REVERSED = "reversed",
}

export enum TipType {
  ARTIST = "artist",
  TRACK = "track",
}

@Entity("tips")
@Unique(["stellarTxHash"]) // Prevent duplicate transactions
@Index(["artistId", "status"])
@Index(["trackId", "status"])
@Index(["createdAt"])
export class Tip {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  artistId: string;

  @Column({ length: 255, nullable: true })
  trackId?: string;

  @Column({ length: 255, nullable: true })
  goalId?: string;

  @Column({ length: 64, unique: true })
  stellarTxHash: string;

  @Column({ length: 56 })
  senderAddress: string;

  @Column({ length: 56 })
  receiverAddress: string;

  @Column({ type: "decimal", precision: 20, scale: 7 })
  amount: number;

  @Column({ length: 20, default: "XLM" })
  asset: string;

  @Column({ length: 255, nullable: true })
  assetIssuer?: string;

  @Column({ type: "text", nullable: true })
  message?: string;

  @Column({ type: "text", nullable: true })
  stellarMemo?: string;

  @Column({
    type: "enum",
    enum: TipStatus,
    default: TipStatus.PENDING,
  })
  status: TipStatus;

  @Column({
    type: "enum",
    enum: TipType,
    default: TipType.ARTIST,
  })
  type: TipType;

  @Column({ type: "timestamp", nullable: true })
  verifiedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  failedAt?: Date;

  @Column({ type: "text", nullable: true })
  failureReason?: string;

  @Column({ type: "timestamp", nullable: true })
  reversedAt?: Date;

  @Column({ type: "text", nullable: true })
  reversalReason?: string;

  @Column({ type: "timestamp", nullable: true })
  stellarTimestamp?: Date;

  @Column({ type: "decimal", precision: 20, scale: 7, nullable: true })
  exchangeRate?: number;

  @Column({ length: 10, nullable: true })
  fiatCurrency?: string;

  @Column({ type: "decimal", precision: 20, scale: 2, nullable: true })
  fiatAmount?: number;

  @Column({ type: "boolean", default: false })
  isAnonymous: boolean;

  @Column({ type: "boolean", default: false })
  isPublic: boolean;

  @Column({ type: "text", nullable: true })
  metadata?: string; // JSON string for additional data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Artist, (artist) => artist.tips, { onDelete: "CASCADE" })
  @JoinColumn({ name: "artistId" })
  artist: Artist;

  @ManyToOne(() => Track, (track) => track.tips, { onDelete: "SET NULL" })
  @JoinColumn({ name: "trackId" })
  track?: Track;

  @ManyToOne(() => TipGoal, (goal) => goal.tips, { onDelete: "SET NULL" })
  @JoinColumn({ name: "goalId" })
  goal?: TipGoal;
}
