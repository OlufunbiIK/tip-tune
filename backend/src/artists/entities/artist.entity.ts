  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Track } from "../../tracks/entities/track.entity";
import { Tip } from "../../tips/entities/tip.entity";
import { Collaboration } from "../../collaboration/entities/collaboration.entity";

export enum ArtistStatus {
  ACTIVE = "active",
  ON_TOUR = "on_tour",
  RECORDING = "recording",
  ON_BREAK = "on_break",
  HIATUS = "hiatus",
  ACCEPTING_REQUESTS = "accepting_requests",
}

@Entity("artists")
export class Artist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid", unique: true })
  userId: string;

  @OneToMany(() => Track, (track) => track.artist)
  tracks: Track[];

  @OneToMany(() => Tip, (tip) => tip.artist)
  tips: Tip[];

  @OneToMany(() => Collaboration, (collaboration) => collaboration.artist)
  collaborations: Collaboration[];

  @Column()
  artistName: string;

  @Column()
  genre: string;

  @Column({ type: "text" })
  bio: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column()
  walletAddress: string; // Stellar public key

  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @Column({
    type: "enum",
    enum: ArtistStatus,
    default: ArtistStatus.ACTIVE,
  })
  status: ArtistStatus;

  @Column({ length: 2, nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ default: false })
  hasLocation: boolean;

  @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
  totalTipsReceived: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
