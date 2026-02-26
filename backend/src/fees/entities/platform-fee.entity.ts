import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tip } from '../../tips/entities/tip.entity';

export enum FeeCollectionStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  WAIVED = 'waived',
}

@Entity('platform_fees')
@Index(['tipId'])
@Index(['createdAt'])
export class PlatformFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tipId: string;

  @ManyToOne(() => Tip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipId' })
  tip: Tip;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  feePercentage: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  feeAmountXLM: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  feeAmountUSD: string | null;

  @Column({
    type: 'enum',
    enum: FeeCollectionStatus,
    default: FeeCollectionStatus.PENDING,
  })
  collectionStatus: FeeCollectionStatus;

  @Column({ length: 64, nullable: true })
  stellarTxHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  collectedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

