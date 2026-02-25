import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SubscriptionStatus } from "./artist-subscription.entity";
import { SubscriptionTier } from "./subscription-tier.entity";
import { User } from "@/users/entities/user.entity";
import { Artist } from "@/artists/entities/artist.entity";

@Entity('artist_subscriptions')
@Index(['artistId'])
@Index(['userId'])
@Index(['tierId'])
@Index(['status'])
@Index(
  ['userId', 'artistId'],
  { unique: true, where: "status = 'active'" } // Prevent double active sub
)
export class ArtistSubscription {
  @PrimaryGeneratedColumn       ('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  artistId: string;

  @ManyToOne(() => Artist)
  @JoinColumn({ name: 'artistId' })
  artist: Artist    ;

  @Column()
  tierId: string;

  @ManyToOne(() => SubscriptionTier)
  @JoinColumn({ name: 'tierId' })
  tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ unique: true })
  stellarTxHash: string; // Prevent duplicate usage

  @Column()
  startDate: Date;

  @Column()
  nextBillingDate: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;
}