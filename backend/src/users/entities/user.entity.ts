import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255, unique: true })
  @Index()
  username: string;

  @Column({ length: 255, unique: true })
  @Index()
  email: string;

  @Column({ length: 255, name: "wallet_address" })
  walletAddress: string;

  @Column({ length: 500, nullable: true, name: "profile_image" })
  profileImage: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({ default: false, name: "is_artist" })
  isArtist: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
