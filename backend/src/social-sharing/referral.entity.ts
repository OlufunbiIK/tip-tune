import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ReferralCode } from './referral-code.entity';

@Entity('referrals')
@Unique(['referrerId', 'referredUserId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id' })
  @Index()
  referrerId: string;

  @Column({ name: 'referred_user_id' })
  @Index()
  referredUserId: string;

  @Column({ name: 'referral_code_id' })
  referralCodeId: string;

  @ManyToOne(() => ReferralCode, (code) => code.referrals, { eager: false })
  @JoinColumn({ name: 'referral_code_id' })
  referralCode: ReferralCode;

  @Column({ name: 'reward_claimed', default: false })
  rewardClaimed: boolean;

  @Column({ name: 'reward_claimed_at', nullable: true, type: 'timestamptz' })
  rewardClaimedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
