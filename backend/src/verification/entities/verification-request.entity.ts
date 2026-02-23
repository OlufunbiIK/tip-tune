import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { Artist } from '../../artists/entities/artist.entity';
import { User } from '../../users/entities/user.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface VerificationDocument {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  encryptedPath: string;
  uploadedAt: Date;
}

export interface SocialProof {
  platform: string;
  url: string;
  username: string;
  followerCount?: number;
  verified: boolean;
}

@Entity('verification_requests')
@Index(['artistId'])
@Index(['status'])
@Index(['submittedAt'])
export class VerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'artist_id' })
  artistId: string;

  @OneToOne(() => Artist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'artist_id' })
  artist: Artist;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({
    type: 'jsonb',
    name: 'documents',
    comment: 'Encrypted identity documents metadata',
  })
  documents: VerificationDocument[];

  @Column({
    type: 'jsonb',
    name: 'social_proof',
    comment: 'Social media verification links',
  })
  socialProof: SocialProof[];

  @Column({ type: 'text', nullable: true, name: 'additional_info' })
  additionalInfo?: string;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by_id' })
  reviewedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes?: string;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
