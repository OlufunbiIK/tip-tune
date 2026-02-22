import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LicenseRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('license_requests')
export class LicenseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'track_id' })
  trackId: string;

  @Column({ name: 'requester_id' })
  requesterId: string;

  @Column({ type: 'text' })
  intendedUse: string;

  @Column({
    type: 'enum',
    enum: LicenseRequestStatus,
    default: LicenseRequestStatus.PENDING,
  })
  status: LicenseRequestStatus;

  @Column({ type: 'text', nullable: true })
  responseMessage: string;

  @Column({ nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
