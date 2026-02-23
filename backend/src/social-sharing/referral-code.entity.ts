import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

export enum RewardType {
  XLM_BONUS = 'xlm_bonus',
  BADGE = 'badge',
  SUBSCRIPTION_DISCOUNT = 'subscription_discount',
}

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ unique: true, length: 8 })
  @Index()
  code: string;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'max_usages', nullable: true, type: 'int' })
  maxUsages: number | null;

  @Column({
    name: 'reward_type',
    type: 'enum',
    enum: RewardType,
    default: RewardType.XLM_BONUS,
  })
  rewardType: RewardType;

  @Column({ name: 'reward_value', type: 'decimal', precision: 18, scale: 7 })
  rewardValue: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', nullable: true, type: 'timestamptz' })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Referral, (referral) => referral.referralCode)
  referrals: Referral[];
}

// Circular import workaround — Referral imported below
import { Referral } from './referral.entity';
