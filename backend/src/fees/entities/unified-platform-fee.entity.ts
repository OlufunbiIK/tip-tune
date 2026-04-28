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
@Index(['collectionStatus'])
@Index(['createdAt'])
export class UnifiedPlatformFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tip_id', type: 'uuid' })
  tipId: string;

  @ManyToOne(() => Tip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tip_id' })
  tip: Tip;

  @Column({ name: 'fee_percentage', type: 'decimal', precision: 5, scale: 2 })
  feePercentage: number;

  @Column({ name: 'fee_amount_xlm', type: 'decimal', precision: 20, scale: 7 })
  feeAmountXLM: number;

  @Column({ name: 'fee_amount_usd', type: 'decimal', precision: 20, scale: 4, nullable: true })
  feeAmountUSD: number | null;

  @Column({
    name: 'collection_status',
    type: 'enum',
    enum: FeeCollectionStatus,
    default: FeeCollectionStatus.PENDING,
  })
  collectionStatus: FeeCollectionStatus;

  @Column({ name: 'stellar_tx_hash', type: 'varchar', length: 64, nullable: true })
  stellarTxHash: string | null;

  @Column({ name: 'collected_at', type: 'timestamp', nullable: true })
  collectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
