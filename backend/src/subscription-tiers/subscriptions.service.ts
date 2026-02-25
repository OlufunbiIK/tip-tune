import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { SubscriptionTier } from '../subscription-tiers/subscription-tier.entity';
import {
  ArtistSubscription,
  SubscriptionStatus,
} from '../subscription-tiers/artist-subscription.entity';
import { SubscriptionRevenue } from '../subscription-tiers/SubscriptionRevenue.entity';
import {
  CreateSubscriptionTierDto,
  UpdateSubscriptionTierDto,
  CreateArtistSubscriptionDto,
  SubscriptionQueryDto,
} from './subscriptions.dto';
import { StellarService } from '../stellar/stellar.service';
import { CronExpression } from '@nestjs/schedule/dist/enums/cron-expression.enum';
import { Cron } from '@nestjs/schedule/dist/decorators/cron.decorator';
// Add import for addMonths utility
import { addMonths } from 'date-fns';
import { SubscribeDto } from './SubscribeDto';
@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionTier)
    private readonly tierRepo: Repository<SubscriptionTier>,
    @InjectRepository(ArtistSubscription)
    private readonly subscriptionRepo: Repository<ArtistSubscription>,
    private readonly dataSource: DataSource,
    private readonly stellarService: StellarService,
  ) {}

  // ─── Tier CRUD ──────────────────────────────────────────────────────────────

  async createTier(dto: CreateSubscriptionTierDto): Promise<SubscriptionTier> {
    const tier = this.tierRepo.create({
      ...dto,
      perks: dto.perks ?? [],
      isActive: dto.isActive ?? true,
      currentSubscribers: 0,
    });
    return this.tierRepo.save(tier);
  }

  async getTiersByArtist(artistId: string): Promise<SubscriptionTier[]> {
    return this.tierRepo.find({
      where: { artistId, isActive: true },
      order: { priceXLM: 'ASC' },
    });
  }

  async getTierById(tierId: string): Promise<SubscriptionTier> {
    const tier = await this.tierRepo.findOne({ where: { id: tierId } });
    if (!tier) throw new NotFoundException(`Tier ${tierId} not found`);
    return tier;
  }

  async updateTier(
    tierId: string,
    artistId: string,
    dto: UpdateSubscriptionTierDto,
  ): Promise<SubscriptionTier> {
    const tier = await this.getTierById(tierId);
    if (tier.artistId !== artistId) {
      throw new ForbiddenException('You do not own this tier');
    }
    Object.assign(tier, dto);
    return this.tierRepo.save(tier);
  }

  async deleteTier(tierId: string, artistId: string): Promise<void> {
    const tier = await this.getTierById(tierId);
    if (tier.artistId !== artistId) {
      throw new ForbiddenException('You do not own this tier');
    }
    if (tier.currentSubscribers > 0) {
      throw new ConflictException(
        'Cannot delete a tier with active subscribers',
      );
    }
    await this.tierRepo.remove(tier);
  }

  // ─── Subscription Management ─────────────────────────────────────────────


  async cancelSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<ArtistSubscription> {
    const subscription = await this.findSubscriptionOrFail(
      subscriptionId,
      userId,
    );

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    return this.dataSource.transaction(async (manager) => {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      const saved = await manager.save(ArtistSubscription, subscription);

      if (
        ['active', 'paused'].includes(
          subscription.status as unknown as string,
        )
      ) {
        // decrement already done by re-reading status before save above
      }

      await manager.decrement(
        SubscriptionTier,
        { id: subscription.tierId },
        'currentSubscribers',
        1,
      );

      return saved;
    });
  }

  async pauseSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<ArtistSubscription> {
    const subscription = await this.findSubscriptionOrFail(
      subscriptionId,
      userId,
    );

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    subscription.status = SubscriptionStatus.PAUSED;
    return this.subscriptionRepo.save(subscription);
  }

  async resumeSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<ArtistSubscription> {
    const subscription = await this.findSubscriptionOrFail(
      subscriptionId,
      userId,
    );

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    return this.subscriptionRepo.save(subscription);
  }

  async getMySubscriptions(
    userId: string,
    query: SubscriptionQueryDto,
  ): Promise<ArtistSubscription[]> {
    const where: any = { userId };
    if (query.status) where.status = query.status;

    return this.subscriptionRepo.find({
      where,
      relations: ['tier'],
      order: { createdAt: 'DESC' },
    });
  }

  async getArtistSubscribers(
    artistId: string,
    query: SubscriptionQueryDto,
  ): Promise<ArtistSubscription[]> {
    const where: any = { artistId };
    if (query.status) where.status = query.status;
    else where.status = SubscriptionStatus.ACTIVE;

    return this.subscriptionRepo.find({
      where,
      relations: ['tier'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Revenue Tracking ────────────────────────────────────────────────────

  async getSubscriptionRevenue(artistId: string): Promise<{
    totalActiveSubscribers: number;
    monthlyRevenueXLM: number;
    monthlyRevenueUSD: number;
    byTier: Array<{
      tierId: string;
      tierName: string;
      subscribers: number;
      monthlyXLM: number;
      monthlyUSD: number;
    }>;
  }> {
    const tiers = await this.tierRepo.find({ where: { artistId } });

    const results = await Promise.all(
      tiers.map(async (tier) => {
        const count = await this.subscriptionRepo.count({
          where: { tierId: tier.id, status: SubscriptionStatus.ACTIVE },
        });
        return {
          tierId: tier.id,
          tierName: tier.name,
          subscribers: count,
          monthlyXLM: count * Number(tier.priceXLM),
          monthlyUSD: count * Number(tier.priceUSD),
        };
      }),
    );

    const totalActiveSubscribers = results.reduce(
      (sum, r) => sum + r.subscribers,
      0,
    );
    const monthlyRevenueXLM = results.reduce((sum, r) => sum + r.monthlyXLM, 0);
    const monthlyRevenueUSD = results.reduce((sum, r) => sum + r.monthlyUSD, 0);

    return {
      totalActiveSubscribers,
      monthlyRevenueXLM,
      monthlyRevenueUSD,
      byTier: results,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async findSubscriptionOrFail(
    subscriptionId: string,
    userId: string,
  ): Promise<ArtistSubscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }
    if (subscription.userId !== userId) {
      throw new ForbiddenException('You do not own this subscription');
    }
    return subscription;
  }

  async subscribe(dto: SubscribeDto, userId: string) {
  return this.dataSource.transaction(async manager => {

    const tier = await manager.findOne(SubscriptionTier, {
      where: { id: dto.tierId, isActive: true },
      lock: { mode: 'pessimistic_write' },
    });

    if (!tier) throw new NotFoundException('Tier not found');

    // Prevent duplicate active subscription (extra safety)
    const existing = await manager.findOne(ArtistSubscription, {
      where: {
        userId,
        artistId: tier.artistId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing)
      throw new BadRequestException('Already subscribed');

    // Cap enforcement
    if (
      tier.maxSubscribers &&
      tier.currentSubscribers >= tier.maxSubscribers
    ) {
      throw new BadRequestException('Subscriber limit reached');
    }

    // Verify Stellar transaction
    await this.stellarService.verifyTransaction(
      dto.stellarTxHash,
      tier.priceXLM.toString(),
      tier.artistId,
      'XLM',
    );

    const subscription = manager.create(ArtistSubscription, {
      userId,
      artistId: tier.artistId,
      tierId: tier.id,
      stellarTxHash: dto.stellarTxHash,
      startDate: new Date(),
      nextBillingDate: addMonths(new Date(), 1),
    });

    await manager.save(subscription);

    // Increment safely
    tier.currentSubscribers += 1;
    await manager.save(tier);

    // Create revenue record
    await manager.save(SubscriptionRevenue, {
      artistId: tier.artistId,
      subscriptionId: subscription.id,
      amountXLM: tier.priceXLM,
      amountUSD: tier.priceUSD,
      stellarTxHash: dto.stellarTxHash,
    });

    return subscription;
  });
}
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async processBilling() {
  const dueSubs = await this.subscriptionRepo.find({
    where: {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: LessThanOrEqual(new Date()),
    },
    relations: ['tier'],
  });

  for (const sub of dueSubs) {
    try {
      // await this.billingService.charge(sub);

      sub.nextBillingDate = addMonths(new Date(), 1);
      await this.subscriptionRepo.save(sub);

    } catch (err) {
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepo.save(sub);

      await this.tierRepo.decrement(
        { id: sub.tierId },
        'currentSubscribers',
        1,
      );
    }
  }
}
}
