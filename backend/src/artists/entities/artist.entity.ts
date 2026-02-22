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

  @OneToMany(() => Collaboration, (collab) => collab.artist)
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

  @Column({ type: "decimal", precision: 18, scale: 2, default: 0 })
  totalTipsReceived: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
