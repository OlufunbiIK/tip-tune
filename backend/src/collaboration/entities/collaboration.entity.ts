import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Track } from '../../tracks/entities/track.entity';
import { Artist } from '../../artists/entities/artist.entity';

export enum CollaborationRole {
  PRIMARY = 'primary',
  FEATURED = 'featured',
  PRODUCER = 'producer',
  COMPOSER = 'composer',
  MIXER = 'mixer',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('collaborations')
@Index(['trackId', 'artistId'], { unique: true })
export class Collaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trackId: string;

  @ManyToOne(() => Track, (track) => track.collaborations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column('uuid')
  artistId: string;

  @ManyToOne(() => Artist, (artist) => artist.collaborations)
  @JoinColumn({ name: 'artistId' })
  artist: Artist;

  @Column({
    type: 'enum',
    enum: CollaborationRole,
    default: CollaborationRole.FEATURED,
  })
  role: CollaborationRole;

  @Column('decimal', { precision: 5, scale: 2 })
  splitPercentage: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  invitationMessage: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
