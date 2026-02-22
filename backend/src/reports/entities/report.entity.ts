import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportEntityType {
  TRACK = 'track',
  COMMENT = 'comment',
  ARTIST_PROFILE = 'artist_profile',
  USER = 'user',
}

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  COPYRIGHT = 'copyright',
  HARASSMENT = 'harassment',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportAction {
  NONE = 'none',
  WARNING = 'warning',
  CONTENT_REMOVED = 'content_removed',
  USER_BANNED = 'user_banned',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_by_id' })
  reportedBy: User;

  @Column({ name: 'reported_by_id' })
  reportedById: string;

  @Column({
    type: 'enum',
    enum: ReportEntityType,
    name: 'entity_type'
  })
  entityType: ReportEntityType;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById: string;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes: string;

  @Column({
    type: 'enum',
    enum: ReportAction,
    default: ReportAction.NONE,
  })
  action: ReportAction;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date;
}
