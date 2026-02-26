import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionTier } from './entities/subscription-tier.entity';
import {
  ArtistSubscription,
  SubscriptionStatus,
} from './entities/artist-subscription.entity';

// ─── Factories ───────────────────────────────────────────────────────────────

const makeTier = (overrides: Partial<SubscriptionTier> = {}): SubscriptionTier =>
  ({
    id: 'tier-uuid-1',
    artistId: 'artist-uuid-1',
    name: 'Superfan',
    description: 'Best tier',
    priceXLM: 10,
    priceUSD: 5,
    perks: ['Exclusive content'],
    maxSubscribers: null,
    currentSubscribers: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    subscriptions: [],
    ...overrides,
  } as SubscriptionTier);

const makeSubscription = (
  overrides: Partial<ArtistSubscription> = {},
): ArtistSubscription =>
  ({
    id: 'sub-uuid-1',
    userId: 'user-uuid-1',
    artistId: 'artist-uuid-1',
    tierId: 'tier-uuid-1',
    status: SubscriptionStatus.ACTIVE,
    stellarTxHash: 'abc123',
    startDate: new Date(),
    nextBillingDate: new Date(),
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tier: undefined as any,
    ...overrides,
  } as ArtistSubscription);

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockTierRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
});

const mockSubscriptionRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: any) => Promise<any>) => cb(mockManager)),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let tierRepo: ReturnType<typeof mockTierRepo>;
  let subscriptionRepo: ReturnType<typeof mockSubscriptionRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(SubscriptionTier), useFactory: mockTierRepo },
        {
          provide: getRepositoryToken(ArtistSubscription),
          useFactory: mockSubscriptionRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
    tierRepo = module.get(getRepositoryToken(SubscriptionTier));
    subscriptionRepo = module.get(getRepositoryToken(ArtistSubscription));
  });

  // ─── createTier ─────────────────────────────────────────────────────────

  describe('createTier', () => {
    it('should create and save a tier with defaults', async () => {
      const dto = {
        artistId: 'artist-uuid-1',
        name: 'Superfan',
        priceXLM: 10,
        priceUSD: 5,
      };
      const tier = makeTier();
      tierRepo.create.mockReturnValue(tier);
      tierRepo.save.mockResolvedValue(tier);

      const result = await service.createTier(dto as any);

      expect(tierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          perks: [],
          isActive: true,
          currentSubscribers: 0,
        }),
      );
      expect(tierRepo.save).toHaveBeenCalledWith(tier);
      expect(result).toBe(tier);
    });

    it('should use provided perks and isActive', async () => {
      const dto = {
        artistId: 'a',
        name: 'VIP',
        priceXLM: 50,
        priceUSD: 25,
        perks: ['Backstage access'],
        isActive: false,
      };
      const tier = makeTier({ perks: ['Backstage access'], isActive: false });
      tierRepo.create.mockReturnValue(tier);
      tierRepo.save.mockResolvedValue(tier);

      await service.createTier(dto as any);

      expect(tierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ perks: ['Backstage access'], isActive: false }),
      );
    });
  });

  // ─── getTiersByArtist ────────────────────────────────────────────────────

  describe('getTiersByArtist', () => {
    it('should return active tiers ordered by price', async () => {
      const tiers = [makeTier(), makeTier({ id: 'tier-2', priceXLM: 50 })];
      tierRepo.find.mockResolvedValue(tiers);

      const result = await service.getTiersByArtist('artist-uuid-1');

      expect(tierRepo.find).toHaveBeenCalledWith({
        where: { artistId: 'artist-uuid-1', isActive: true },
        order: { priceXLM: 'ASC' },
      });
      expect(result).toBe(tiers);
    });
  });

  // ─── getTierById ─────────────────────────────────────────────────────────

  describe('getTierById', () => {
    it('should return a tier when found', async () => {
      const tier = makeTier();
      tierRepo.findOne.mockResolvedValue(tier);

      const result = await service.getTierById('tier-uuid-1');
      expect(result).toBe(tier);
    });

    it('should throw NotFoundException when tier not found', async () => {
      tierRepo.findOne.mockResolvedValue(null);
      await expect(service.getTierById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── updateTier ──────────────────────────────────────────────────────────

  describe('updateTier', () => {
    it('should update a tier owned by the artist', async () => {
      const tier = makeTier();
      tierRepo.findOne.mockResolvedValue(tier);
      tierRepo.save.mockResolvedValue({ ...tier, name: 'Updated' });

      const result = await service.updateTier('tier-uuid-1', 'artist-uuid-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if artist does not own tier', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier());
      await expect(
        service.updateTier('tier-uuid-1', 'other-artist', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteTier ──────────────────────────────────────────────────────────

  describe('deleteTier', () => {
    it('should delete a tier with no subscribers', async () => {
      const tier = makeTier({ currentSubscribers: 0 });
      tierRepo.findOne.mockResolvedValue(tier);
      tierRepo.remove.mockResolvedValue(undefined);

      await service.deleteTier('tier-uuid-1', 'artist-uuid-1');
      expect(tierRepo.remove).toHaveBeenCalledWith(tier);
    });

    it('should throw ConflictException if tier has subscribers', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier({ currentSubscribers: 5 }));
      await expect(
        service.deleteTier('tier-uuid-1', 'artist-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if not the owner', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier());
      await expect(
        service.deleteTier('tier-uuid-1', 'other-artist'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── subscribe ───────────────────────────────────────────────────────────

  describe('subscribe', () => {
    const dto = {
      tierId: 'tier-uuid-1',
      stellarTxHash: 'abc123',
    };

    it('should create a subscription and increment counter', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier());
      subscriptionRepo.findOne.mockResolvedValue(null);
      const sub = makeSubscription();
      mockManager.create.mockReturnValue(sub);
      mockManager.save.mockResolvedValue(sub);
      mockManager.increment.mockResolvedValue(undefined);

      const result = await service.subscribe('user-uuid-1', dto as any);

      expect(mockManager.increment).toHaveBeenCalledWith(
        SubscriptionTier,
        { id: 'tier-uuid-1' },
        'currentSubscribers',
        1,
      );
      expect(result).toBe(sub);
    });

    it('should throw BadRequestException for inactive tier', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier({ isActive: false }));
      await expect(
        service.subscribe('user-uuid-1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when cap is reached', async () => {
      tierRepo.findOne.mockResolvedValue(
        makeTier({ maxSubscribers: 2, currentSubscribers: 2 }),
      );
      await expect(
        service.subscribe('user-uuid-1', dto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate active subscription', async () => {
      tierRepo.findOne.mockResolvedValue(makeTier());
      subscriptionRepo.findOne.mockResolvedValue(makeSubscription());

      await expect(
        service.subscribe('user-uuid-1', dto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow subscription when cap is not reached', async () => {
      tierRepo.findOne.mockResolvedValue(
        makeTier({ maxSubscribers: 10, currentSubscribers: 5 }),
      );
      subscriptionRepo.findOne.mockResolvedValue(null);
      const sub = makeSubscription();
      mockManager.create.mockReturnValue(sub);
      mockManager.save.mockResolvedValue(sub);
      mockManager.increment.mockResolvedValue(undefined);

      await expect(
        service.subscribe('user-uuid-1', dto as any),
      ).resolves.toBe(sub);
    });
  });

  // ─── cancelSubscription ──────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should cancel an active subscription and decrement counter', async () => {
      const sub = makeSubscription({ status: SubscriptionStatus.ACTIVE });
      subscriptionRepo.findOne.mockResolvedValue(sub);
      mockManager.save.mockResolvedValue({
        ...sub,
        status: SubscriptionStatus.CANCELLED,
      });
      mockManager.decrement.mockResolvedValue(undefined);

      const result = await service.cancelSubscription('sub-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(mockManager.decrement).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already cancelled', async () => {
      subscriptionRepo.findOne.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.CANCELLED }),
      );
      await expect(
        service.cancelSubscription('sub-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not the owner', async () => {
      subscriptionRepo.findOne.mockResolvedValue(
        makeSubscription({ userId: 'other-user' }),
      );
      await expect(
        service.cancelSubscription('sub-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for missing subscription', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.cancelSubscription('bad-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── pauseSubscription ───────────────────────────────────────────────────

  describe('pauseSubscription', () => {
    it('should pause an active subscription', async () => {
      const sub = makeSubscription({ status: SubscriptionStatus.ACTIVE });
      subscriptionRepo.findOne.mockResolvedValue(sub);
      subscriptionRepo.save.mockResolvedValue({
        ...sub,
        status: SubscriptionStatus.PAUSED,
      });

      const result = await service.pauseSubscription('sub-uuid-1', 'user-uuid-1');
      expect(result.status).toBe(SubscriptionStatus.PAUSED);
    });

    it('should throw BadRequestException if not active', async () => {
      subscriptionRepo.findOne.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.PAUSED }),
      );
      await expect(
        service.pauseSubscription('sub-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── resumeSubscription ──────────────────────────────────────────────────

  describe('resumeSubscription', () => {
    it('should resume a paused subscription', async () => {
      const sub = makeSubscription({ status: SubscriptionStatus.PAUSED });
      subscriptionRepo.findOne.mockResolvedValue(sub);
      subscriptionRepo.save.mockResolvedValue({
        ...sub,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await service.resumeSubscription('sub-uuid-1', 'user-uuid-1');
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should throw BadRequestException if not paused', async () => {
      subscriptionRepo.findOne.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.ACTIVE }),
      );
      await expect(
        service.resumeSubscription('sub-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getMySubscriptions ──────────────────────────────────────────────────

  describe('getMySubscriptions', () => {
    it('should return subscriptions for the user', async () => {
      const subs = [makeSubscription()];
      subscriptionRepo.find.mockResolvedValue(subs);

      const result = await service.getMySubscriptions('user-uuid-1', {});

      expect(subscriptionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-uuid-1' } }),
      );
      expect(result).toBe(subs);
    });

    it('should filter by status when provided', async () => {
      subscriptionRepo.find.mockResolvedValue([]);
      await service.getMySubscriptions('user-uuid-1', {
        status: SubscriptionStatus.CANCELLED,
      });

      expect(subscriptionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-uuid-1',
            status: SubscriptionStatus.CANCELLED,
          },
        }),
      );
    });
  });

  // ─── getArtistSubscribers ────────────────────────────────────────────────

  describe('getArtistSubscribers', () => {
    it('should return active subscribers by default', async () => {
      subscriptionRepo.find.mockResolvedValue([]);
      await service.getArtistSubscribers('artist-uuid-1', {});

      expect(subscriptionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            artistId: 'artist-uuid-1',
            status: SubscriptionStatus.ACTIVE,
          },
        }),
      );
    });
  });

  // ─── getSubscriptionRevenue ──────────────────────────────────────────────

  describe('getSubscriptionRevenue', () => {
    it('should calculate revenue across all tiers', async () => {
      const tiers = [
        makeTier({ id: 'tier-1', priceXLM: 10, priceUSD: 5 }),
        makeTier({ id: 'tier-2', priceXLM: 50, priceUSD: 25 }),
      ];
      tierRepo.find.mockResolvedValue(tiers);
      subscriptionRepo.count
        .mockResolvedValueOnce(3)  // tier-1 has 3 subs
        .mockResolvedValueOnce(1); // tier-2 has 1 sub

      const result = await service.getSubscriptionRevenue('artist-uuid-1');

      expect(result.totalActiveSubscribers).toBe(4);
      expect(result.monthlyRevenueXLM).toBe(80);  // 3*10 + 1*50
      expect(result.monthlyRevenueUSD).toBe(40);  // 3*5 + 1*25
      expect(result.byTier).toHaveLength(2);
    });

    it('should return zeros when no tiers', async () => {
      tierRepo.find.mockResolvedValue([]);
      const result = await service.getSubscriptionRevenue('artist-uuid-1');
      expect(result.totalActiveSubscribers).toBe(0);
      expect(result.monthlyRevenueXLM).toBe(0);
    });
  });
});
