import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MuteType {
  NOTIFICATIONS = 'notifications',
  ACTIVITY_FEED = 'activity_feed',
  BOTH = 'both',
}

@Entity('user_mutes')
@Unique(['muterId', 'mutedId'])
@Index(['muterId'])
@Index(['mutedId'])
@Index(['expiresAt'])
export class UserMute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  muterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'muterId' })
  muter: User;

  @Column({ type: 'uuid' })
  mutedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mutedId' })
  muted: User;

  @Column({
    type: 'enum',
    enum: MuteType,
    default: MuteType.BOTH,
  })
  muteType: MuteType;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
