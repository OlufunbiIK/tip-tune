import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ArtistBalanceAuditType {
  TIP_CREDIT = 'tip_credit',
  PAYOUT_REQUEST = 'payout_request',
  PAYOUT_PROCESSING = 'payout_processing',
  PAYOUT_COMPLETED = 'payout_completed',
  PAYOUT_FAILED = 'payout_failed',
  MANUAL_ADJUST = 'manual_adjust',
}

@Entity('artist_balance_audits')
@Index(['artistId'])
@Index(['payoutRequestId'])
export class ArtistBalanceAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artistId: string;

  @Column({ type: 'varchar', length: 4 })
  assetCode: 'XLM' | 'USDC';

  @Column({ type: 'enum', enum: ArtistBalanceAuditType })
  eventType: ArtistBalanceAuditType;

  @Column({ type: 'uuid', nullable: true })
  payoutRequestId?: string;

  @Column({ type: 'uuid', nullable: true })
  tipId?: string;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  balanceAfter: number;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  pendingBefore: number;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  pendingAfter: number;

  @CreateDateColumn()
  createdAt: Date;
}
