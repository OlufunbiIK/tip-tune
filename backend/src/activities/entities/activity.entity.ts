import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export enum ActivityType {
  NEW_TRACK = "new_track",
  TIP_SENT = "tip_sent",
  TIP_RECEIVED = "tip_received",
  ARTIST_FOLLOWED = "artist_followed",
  NEW_FOLLOWER = "new_follower",
}

export enum EntityType {
  TRACK = "track",
  TIP = "tip",
  ARTIST = "artist",
}

@Entity("activities")
@Index(["userId", "createdAt"])
@Index(["userId", "activityType"])
@Index(["userId", "isSeen"])
@Index(["entityType", "entityId"])
export class Activity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({
    type: "enum",
    enum: EntityType,
  })
  entityType: EntityType;

  @Column({ type: "uuid" })
  entityId: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isSeen: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
