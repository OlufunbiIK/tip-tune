import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
} from 'typeorm';

@Entity('subscription_tiers')
@Check(`"price_xlm" >= 0`)
@Check(`"price_usd" >= 0`)
@Check(`"current_subscribers" >= 0`)
export class SubscriptionTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'artist_id' })
  artistId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'price_xlm', type: 'decimal', precision: 18, scale: 7 })
  priceXLM: number;

  @Column({ name: 'price_usd', type: 'decimal', precision: 10, scale: 2 })
  priceUSD: number;

  @Column({ type: 'jsonb', default: [] })
  perks: string[];

  @Column({ name: 'max_subscribers', type: 'int', nullable: true })
  maxSubscribers: number | null;

  @Column({ name: 'current_subscribers', type: 'int', default: 0 })
  currentSubscribers: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations (referenced by string to avoid circular deps)
  @OneToMany('ArtistSubscription', 'tier')
  subscriptions: any[];
}
