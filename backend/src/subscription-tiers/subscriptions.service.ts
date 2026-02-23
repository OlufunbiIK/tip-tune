import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SubscriptionTier } from './entities/subscription-tier.entity';
import {
  ArtistSubscription,
  SubscriptionStatus,
} from './entities/artist-subscription.entity';
import {
  CreateSubscriptionTierDto,
  UpdateSubscriptionTierDto,
  CreateArtistSubscriptionDto,
  SubscriptionQueryDto,
} from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionTier)
    private readonly tierRepo: Repository<SubscriptionTier>,
    @InjectRepository(ArtistSubscription)
    private readonly subscriptionRepo: Repository<ArtistSubscription>,
    private readonly dataSource: DataSource,
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

  async subscribe(
    userId: string,
    dto: CreateArtistSubscriptionDto,
  ): Promise<ArtistSubscription> {
    const tier = await this.getTierById(dto.tierId);

    if (!tier.isActive) {
      throw new BadRequestException('This subscription tier is no longer active');
    }

    // Enforce subscriber cap
    if (
      tier.maxSubscribers !== null &&
      tier.currentSubscribers >= tier.maxSubscribers
    ) {
      throw new ConflictException(
        `This tier has reached its maximum subscriber limit of ${tier.maxSubscribers}`,
      );
    }

    // Check for existing active subscription to same tier
    const existing = await this.subscriptionRepo.findOne({
      where: {
        userId,
        tierId: dto.tierId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (existing) {
      throw new ConflictException(
        'You already have an active subscription to this tier',
      );
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    return this.dataSource.transaction(async (manager) => {
      const subscription = manager.create(ArtistSubscription, {
        userId,
        artistId: tier.artistId,
        tierId: dto.tierId,
        stellarTxHash: dto.stellarTxHash,
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        nextBillingDate,
      });
      const saved = await manager.save(ArtistSubscription, subscription);

      // Increment subscriber count
      await manager.increment(
        SubscriptionTier,
        { id: dto.tierId },
        'currentSubscribers',
        1,
      );

      return saved;
    });
  }

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
}
