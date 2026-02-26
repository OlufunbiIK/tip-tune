import { SubscriptionTier } from './entities/subscription-tier.entity';
import {
  ArtistSubscription,
  SubscriptionStatus,
} from './entities/artist-subscription.entity';

describe('SubscriptionTier Entity', () => {
  it('should instantiate with default values', () => {
    const tier = new SubscriptionTier();
    // TypeORM handles DB defaults, but entity shape should exist
    expect(tier).toBeDefined();
  });

  it('should hold all required fields', () => {
    const tier = Object.assign(new SubscriptionTier(), {
      id: 'uuid-1',
      artistId: 'artist-1',
      name: 'Superfan',
      description: 'Top tier fans',
      priceXLM: 10.5,
      priceUSD: 5.0,
      perks: ['Exclusive content', 'Early access'],
      maxSubscribers: 100,
      currentSubscribers: 42,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    });

    expect(tier.id).toBe('uuid-1');
    expect(tier.artistId).toBe('artist-1');
    expect(tier.name).toBe('Superfan');
    expect(tier.priceXLM).toBe(10.5);
    expect(tier.perks).toHaveLength(2);
    expect(tier.currentSubscribers).toBe(42);
    expect(tier.isActive).toBe(true);
  });

  it('should support null maxSubscribers (unlimited)', () => {
    const tier = Object.assign(new SubscriptionTier(), {
      maxSubscribers: null,
    });
    expect(tier.maxSubscribers).toBeNull();
  });
});

describe('ArtistSubscription Entity', () => {
  it('should instantiate correctly', () => {
    const sub = new ArtistSubscription();
    expect(sub).toBeDefined();
  });

  it('should hold all required fields', () => {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const sub = Object.assign(new ArtistSubscription(), {
      id: 'sub-uuid-1',
      userId: 'user-1',
      artistId: 'artist-1',
      tierId: 'tier-1',
      status: SubscriptionStatus.ACTIVE,
      stellarTxHash: 'abc123def456',
      startDate: now,
      nextBillingDate: nextMonth,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(sub.id).toBe('sub-uuid-1');
    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub.cancelledAt).toBeNull();
    expect(sub.stellarTxHash).toBe('abc123def456');
  });

  it('should support all SubscriptionStatus values', () => {
    expect(SubscriptionStatus.ACTIVE).toBe('active');
    expect(SubscriptionStatus.CANCELLED).toBe('cancelled');
    expect(SubscriptionStatus.EXPIRED).toBe('expired');
    expect(SubscriptionStatus.PAUSED).toBe('paused');
  });

  it('should set cancelledAt when status is cancelled', () => {
    const sub = Object.assign(new ArtistSubscription(), {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
    });
    expect(sub.cancelledAt).toBeInstanceOf(Date);
  });
});
