import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity('subscription_revenue')
@Index(['artistId'])
@Index(['subscriptionId'])
export class SubscriptionRevenue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  artistId: string;

  @Column()
  subscriptionId: string;

  @Column('decimal', { precision: 18, scale: 7 })
  amountXLM: number;

  @Column('decimal', { precision: 18, scale: 2 })
  amountUSD: number;

  @Column()
  stellarTxHash: string;

  @CreateDateColumn()
  createdAt: Date;
}