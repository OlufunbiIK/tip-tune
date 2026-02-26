import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tip } from '../../tips/entities/tip.entity';
import { User } from '../../users/entities/user.entity';

export enum ModerationResult {
  APPROVED = 'approved',
  FILTERED = 'filtered',
  FLAGGED = 'flagged',
  BLOCKED = 'blocked',
}

export enum ReviewAction {
  APPROVE = 'approve',
  BLOCK = 'block',
}

@Entity('message_moderation_logs')
export class MessageModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tipId: string;

  @ManyToOne(() => Tip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipId' })
  tip: Tip;

  @Column({ type: 'text' })
  originalMessage: string;

  @Column({
    type: 'enum',
    enum: ModerationResult,
  })
  moderationResult: ModerationResult;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filterReason: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidenceScore: string;

  @Column({ type: 'boolean', default: false })
  wasManuallyReviewed: boolean;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User | null;

  @Column({
    type: 'enum',
    enum: ReviewAction,
    nullable: true,
  })
  reviewAction: ReviewAction | null;

  @CreateDateColumn()
  createdAt: Date;
}

