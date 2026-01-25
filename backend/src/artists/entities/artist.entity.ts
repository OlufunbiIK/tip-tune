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
import { Track } from "@/tracks/entities/track.entity";
import { Tip } from "@/tips/tips.entity";
import { TipGoal } from "../../goals/entities/tip-goal.entity";

@Entity("artists")
export class Artist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid", unique: true })
  userId: string;

  @Column()
  artistName: string;

  @Column()
  genre: string;

  @Column({ type: "text" })
  bio: string;

  @Column({ nullable: true })
  profileImage: string;

  @OneToMany(() => Track, (track) => track.artist)
  tracks: Track[];

  @OneToMany(() => Tip, (tip) => tip.toArtist)
  tips: Tip[];

  @OneToMany(() => TipGoal, (goal) => goal.artist)
  goals: TipGoal[];

  @Column({ nullable: true })
  coverImage: string;

  @Column()
  walletAddress: string; // Stellar public key

  @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
  totalTipsReceived: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
