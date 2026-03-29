import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ArtistBalance } from './artist-balance.entity';
import { CreatePayoutDto } from './create-payout.dto';
import { PayoutRequest, PayoutStatus } from './payout-request.entity';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

const ARTIST_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const PAYOUT_ID = 'p1a2y3o4-0000-0000-0000-000000000001';
const DEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

const currentUser: CurrentUserData = {
  userId: 'user-123',
  walletAddress: DEST_ADDRESS,
  isArtist: true,
};

function makePayout(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
  return Object.assign(new PayoutRequest(), {
    id: PAYOUT_ID,
    artistId: ARTIST_ID,
    amount: 20,
    assetCode: 'XLM',
    destinationAddress: DEST_ADDRESS,
    status: PayoutStatus.PENDING,
    stellarTxHash: null,
    failureReason: null,
    requestedAt: new Date(),
    processedAt: null,
    ...overrides,
  });
}

function makeBalance(overrides: Partial<ArtistBalance> = {}): ArtistBalance {
  return Object.assign(new ArtistBalance(), {
    id: 'bal-uuid',
    artistId: ARTIST_ID,
    xlmBalance: 100,
    usdcBalance: 50,
    pendingXlm: 0,
    pendingUsdc: 0,
    lastUpdated: new Date(),
    ...overrides,
  });
}

describe('PayoutsController', () => {
  let controller: PayoutsController;
  let service: jest.Mocked<PayoutsService>;

  beforeEach(async () => {
    service = {
      requestPayout: jest.fn(),
      getHistory: jest.fn(),
      getBalance: jest.fn(),
      getStatus: jest.fn(),
      retryPayout: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayoutsController],
      providers: [{ provide: PayoutsService, useValue: service }],
    }).compile();

    controller = module.get<PayoutsController>(PayoutsController);
    jest.clearAllMocks();
  });

  describe('requestPayout', () => {
    const dto: CreatePayoutDto = {
      artistId: ARTIST_ID,
      amount: 20,
      assetCode: 'XLM',
      destinationAddress: DEST_ADDRESS,
    };

    it('should scope payout requests to the authenticated user', async () => {
      const payout = makePayout();
      service.requestPayout.mockResolvedValue(payout);

      await expect(controller.requestPayout(currentUser, dto)).resolves.toEqual(payout);
      expect(service.requestPayout).toHaveBeenCalledWith('user-123', dto);
    });

    it('should propagate BadRequestException', async () => {
      service.requestPayout.mockRejectedValue(new BadRequestException('below threshold'));

      await expect(controller.requestPayout(currentUser, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate ConflictException', async () => {
      service.requestPayout.mockRejectedValue(new ConflictException('duplicate'));

      await expect(controller.requestPayout(currentUser, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getHistory', () => {
    it('should scope history to the authenticated artist', async () => {
      const payouts = [makePayout(), makePayout({ id: 'uuid-2', status: PayoutStatus.COMPLETED })];
      service.getHistory.mockResolvedValue(payouts);

      await expect(controller.getHistory(currentUser, ARTIST_ID)).resolves.toEqual(payouts);
      expect(service.getHistory).toHaveBeenCalledWith('user-123', ARTIST_ID);
    });
  });

  describe('getBalance', () => {
    it('should return the owned artist balance', async () => {
      const balance = makeBalance();
      service.getBalance.mockResolvedValue(balance);

      await expect(controller.getBalance(currentUser, ARTIST_ID)).resolves.toEqual(balance);
      expect(service.getBalance).toHaveBeenCalledWith('user-123', ARTIST_ID);
    });

    it('should propagate ForbiddenException', async () => {
      service.getBalance.mockRejectedValue(new ForbiddenException());

      await expect(controller.getBalance(currentUser, ARTIST_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getStatus', () => {
    it('should scope payout status lookups to the authenticated artist', async () => {
      const payout = makePayout();
      service.getStatus.mockResolvedValue(payout);

      await expect(controller.getStatus(currentUser, PAYOUT_ID)).resolves.toEqual(payout);
      expect(service.getStatus).toHaveBeenCalledWith('user-123', PAYOUT_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.getStatus.mockRejectedValue(new NotFoundException());

      await expect(controller.getStatus(currentUser, PAYOUT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('retryPayout', () => {
    it('should scope retries to the authenticated artist', async () => {
      const payout = makePayout({ status: PayoutStatus.PENDING, failureReason: null });
      service.retryPayout.mockResolvedValue(payout);

      await expect(controller.retryPayout(currentUser, PAYOUT_ID)).resolves.toEqual(payout);
      expect(service.retryPayout).toHaveBeenCalledWith('user-123', PAYOUT_ID);
    });

    it('should propagate BadRequestException', async () => {
      service.retryPayout.mockRejectedValue(
        new BadRequestException('Only failed payouts can be retried'),
      );

      await expect(controller.retryPayout(currentUser, PAYOUT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
