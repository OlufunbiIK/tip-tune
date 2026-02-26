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
import { SubscriptionTier } from './subscription-tier.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

@Entity('artist_subscriptions')
@Index(['userId', 'tierId'], { unique: false })
@Index(['artistId', 'status'])
export class ArtistSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'artist_id' })
  artistId: string;

  @Column({ name: 'tier_id' })
  tierId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ name: 'stellar_tx_hash', nullable: true })
  stellarTxHash: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'next_billing_date', type: 'timestamptz' })
  nextBillingDate: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => SubscriptionTier, (tier) => tier.subscriptions, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'tier_id' })
  tier: SubscriptionTier;
}
