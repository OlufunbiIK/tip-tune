import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/entities/user.entity";

export enum NotificationType {
  TIP_RECEIVED = "TIP_RECEIVED",
  BADGE_EARNED = "BADGE_EARNED",
  SYSTEM = "SYSTEM",
  GENERAL = "GENERAL",
  COLLABORATION_INVITE = "COLLABORATION_INVITE",
  COLLABORATION_RESPONSE = "COLLABORATION_RESPONSE",
  VERIFICATION_UPDATE = "VERIFICATION_UPDATE",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ type: "jsonb", nullable: true })
  data: any;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
