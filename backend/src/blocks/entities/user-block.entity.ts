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

export enum BlockReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE = 'inappropriate',
  OTHER = 'other',
}

@Entity('user_blocks')
@Unique(['blockerId', 'blockedId'])
@Index(['blockerId'])
@Index(['blockedId'])
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  blockerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @Column({ type: 'uuid' })
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @Column({
    type: 'enum',
    enum: BlockReason,
    nullable: true,
  })
  reason: BlockReason;

  @CreateDateColumn()
  createdAt: Date;
}
