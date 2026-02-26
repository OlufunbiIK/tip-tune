import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import {
  ArtistSubscription,
  SubscriptionStatus,
} from './entities/artist-subscription.entity';
import { SubscriptionTier } from './entities/subscription-tier.entity';

const mockService = () => ({
  createTier: jest.fn(),
  getTiersByArtist: jest.fn(),
  updateTier: jest.fn(),
  deleteTier: jest.fn(),
  subscribe: jest.fn(),
  cancelSubscription: jest.fn(),
  pauseSubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  getMySubscriptions: jest.fn(),
  getArtistSubscribers: jest.fn(),
  getSubscriptionRevenue: jest.fn(),
});

const mockUser = { id: 'user-uuid-1', artistId: 'artist-uuid-1' };
const mockReq = { user: mockUser };

const makeTier = (overrides = {}): SubscriptionTier =>
  ({
    id: 'tier-uuid-1',
    artistId: 'artist-uuid-1',
    name: 'Superfan',
    priceXLM: 10,
    priceUSD: 5,
    perks: [],
    currentSubscribers: 0,
    isActive: true,
    ...overrides,
  } as SubscriptionTier);

const makeSub = (overrides = {}): ArtistSubscription =>
  ({
    id: 'sub-uuid-1',
    userId: 'user-uuid-1',
    tierId: 'tier-uuid-1',
    artistId: 'artist-uuid-1',
    status: SubscriptionStatus.ACTIVE,
    ...overrides,
  } as ArtistSubscription);

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [{ provide: SubscriptionsService, useFactory: mockService }],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SubscriptionsController);
    service = module.get(SubscriptionsService);
  });

  // ─── Tiers ────────────────────────────────────────────────────────────────

  describe('createTier', () => {
    it('should call service.createTier and return result', async () => {
      const dto = {
        artistId: 'artist-uuid-1',
        name: 'VIP',
        priceXLM: 50,
        priceUSD: 25,
      };
      const tier = makeTier(dto);
      service.createTier.mockResolvedValue(tier);

      const result = await controller.createTier(dto as any, mockReq);
      expect(service.createTier).toHaveBeenCalledWith(dto);
      expect(result).toBe(tier);
    });
  });

  describe('getTiersByArtist', () => {
    it('should return tiers for an artist', async () => {
      const tiers = [makeTier()];
      service.getTiersByArtist.mockResolvedValue(tiers);

      const result = await controller.getTiersByArtist('artist-uuid-1');
      expect(service.getTiersByArtist).toHaveBeenCalledWith('artist-uuid-1');
      expect(result).toBe(tiers);
    });
  });

  describe('updateTier', () => {
    it('should call service.updateTier with correct args', async () => {
      const dto = { name: 'Super VIP' };
      const updated = makeTier(dto);
      service.updateTier.mockResolvedValue(updated);

      const result = await controller.updateTier('tier-uuid-1', dto as any, mockReq);
      expect(service.updateTier).toHaveBeenCalledWith(
        'tier-uuid-1',
        'artist-uuid-1',
        dto,
      );
      expect(result).toBe(updated);
    });
  });

  describe('deleteTier', () => {
    it('should call service.deleteTier', async () => {
      service.deleteTier.mockResolvedValue(undefined);
      await controller.deleteTier('tier-uuid-1', mockReq);
      expect(service.deleteTier).toHaveBeenCalledWith(
        'tier-uuid-1',
        'artist-uuid-1',
      );
    });
  });

  // ─── Subscriptions ────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('should subscribe a user to a tier', async () => {
      const dto = { tierId: 'tier-uuid-1', stellarTxHash: 'hash123' };
      const sub = makeSub();
      service.subscribe.mockResolvedValue(sub);

      const result = await controller.subscribe(dto as any, mockReq);
      expect(service.subscribe).toHaveBeenCalledWith('user-uuid-1', dto);
      expect(result).toBe(sub);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription', async () => {
      const cancelled = makeSub({ status: SubscriptionStatus.CANCELLED });
      service.cancelSubscription.mockResolvedValue(cancelled);

      const result = await controller.cancelSubscription('sub-uuid-1', mockReq);
      expect(service.cancelSubscription).toHaveBeenCalledWith(
        'sub-uuid-1',
        'user-uuid-1',
      );
      expect(result).toBe(cancelled);
    });
  });

  describe('pauseSubscription', () => {
    it('should pause a subscription', async () => {
      const paused = makeSub({ status: SubscriptionStatus.PAUSED });
      service.pauseSubscription.mockResolvedValue(paused);

      const result = await controller.pauseSubscription('sub-uuid-1', mockReq);
      expect(service.pauseSubscription).toHaveBeenCalledWith(
        'sub-uuid-1',
        'user-uuid-1',
      );
      expect(result).toBe(paused);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume a subscription', async () => {
      const active = makeSub({ status: SubscriptionStatus.ACTIVE });
      service.resumeSubscription.mockResolvedValue(active);

      const result = await controller.resumeSubscription('sub-uuid-1', mockReq);
      expect(service.resumeSubscription).toHaveBeenCalledWith(
        'sub-uuid-1',
        'user-uuid-1',
      );
      expect(result).toBe(active);
    });
  });

  describe('getMySubscriptions', () => {
    it('should return user subscriptions', async () => {
      const subs = [makeSub()];
      service.getMySubscriptions.mockResolvedValue(subs);

      const result = await controller.getMySubscriptions(mockReq, {});
      expect(service.getMySubscriptions).toHaveBeenCalledWith('user-uuid-1', {});
      expect(result).toBe(subs);
    });
  });

  describe('getArtistSubscribers', () => {
    it('should return subscribers for an artist', async () => {
      const subs = [makeSub()];
      service.getArtistSubscribers.mockResolvedValue(subs);

      const result = await controller.getArtistSubscribers('artist-uuid-1', {});
      expect(service.getArtistSubscribers).toHaveBeenCalledWith(
        'artist-uuid-1',
        {},
      );
      expect(result).toBe(subs);
    });
  });

  describe('getSubscriptionRevenue', () => {
    it('should return revenue data for an artist', async () => {
      const revenue = {
        totalActiveSubscribers: 5,
        monthlyRevenueXLM: 100,
        monthlyRevenueUSD: 50,
        byTier: [],
      };
      service.getSubscriptionRevenue.mockResolvedValue(revenue);

      const result = await controller.getSubscriptionRevenue('artist-uuid-1');
      expect(service.getSubscriptionRevenue).toHaveBeenCalledWith(
        'artist-uuid-1',
      );
      expect(result).toBe(revenue);
    });
  });
});
