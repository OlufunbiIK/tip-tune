import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum FeeCollectionStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  WAIVED = 'waived',
}

@Entity('platform_fees')
@Index(['tipId'])
@Index(['collectionStatus'])
export class PlatformFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tip_id', type: 'uuid' })
  tipId: string;

  @Column({ name: 'fee_percentage', type: 'decimal', precision: 5, scale: 2 })
  feePercentage: number;

  @Column({ name: 'fee_amount_xlm', type: 'decimal', precision: 18, scale: 7 })
  feeAmountXLM: number;

  @Column({ name: 'fee_amount_usd', type: 'decimal', precision: 18, scale: 4 })
  feeAmountUSD: number;

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
}
