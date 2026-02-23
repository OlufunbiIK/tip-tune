import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';
import { ArtistBalance } from './entities/artist-balance.entity';
import { CreatePayoutDto } from './dto/create-payout.dto';

const ARTIST_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const PAYOUT_ID = 'p1a2y3o4-0000-0000-0000-000000000001';
const DEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

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
  });

  afterEach(() => jest.clearAllMocks());

  // ── POST /api/payouts/request ───────────────────────────────────────────────

  describe('requestPayout', () => {
    const dto: CreatePayoutDto = {
      artistId: ARTIST_ID,
      amount: 20,
      assetCode: 'XLM',
      destinationAddress: DEST_ADDRESS,
    };

    it('creates and returns a payout', async () => {
      const payout = makePayout();
      service.requestPayout.mockResolvedValue(payout);
      await expect(controller.requestPayout(dto)).resolves.toEqual(payout);
      expect(service.requestPayout).toHaveBeenCalledWith(dto);
    });

    it('propagates BadRequestException', async () => {
      service.requestPayout.mockRejectedValue(new BadRequestException('below threshold'));
      await expect(controller.requestPayout(dto)).rejects.toThrow(BadRequestException);
    });

    it('propagates ConflictException', async () => {
      service.requestPayout.mockRejectedValue(new ConflictException('duplicate'));
      await expect(controller.requestPayout(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── GET /api/payouts/history/:artistId ─────────────────────────────────────

  describe('getHistory', () => {
    it('returns history list', async () => {
      const list = [makePayout(), makePayout({ id: 'uuid2', status: PayoutStatus.COMPLETED })];
      service.getHistory.mockResolvedValue(list);
      await expect(controller.getHistory(ARTIST_ID)).resolves.toEqual(list);
    });

    it('returns empty array when no history', async () => {
      service.getHistory.mockResolvedValue([]);
      await expect(controller.getHistory(ARTIST_ID)).resolves.toEqual([]);
    });
  });

  // ── GET /api/payouts/balance/:artistId ─────────────────────────────────────

  describe('getBalance', () => {
    it('returns artist balance', async () => {
      const balance = makeBalance();
      service.getBalance.mockResolvedValue(balance);
      await expect(controller.getBalance(ARTIST_ID)).resolves.toEqual(balance);
    });

    it('propagates NotFoundException', async () => {
      service.getBalance.mockRejectedValue(new NotFoundException());
      await expect(controller.getBalance(ARTIST_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── GET /api/payouts/:payoutId/status ──────────────────────────────────────

  describe('getStatus', () => {
    it('returns payout status', async () => {
      const payout = makePayout();
      service.getStatus.mockResolvedValue(payout);
      await expect(controller.getStatus(PAYOUT_ID)).resolves.toEqual(payout);
    });

    it('propagates NotFoundException', async () => {
      service.getStatus.mockRejectedValue(new NotFoundException());
      await expect(controller.getStatus(PAYOUT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── POST /api/payouts/:payoutId/retry ──────────────────────────────────────

  describe('retryPayout', () => {
    it('retries and returns updated payout', async () => {
      const payout = makePayout({ status: PayoutStatus.PENDING, failureReason: null });
      service.retryPayout.mockResolvedValue(payout);
      await expect(controller.retryPayout(PAYOUT_ID)).resolves.toEqual(payout);
      expect(service.retryPayout).toHaveBeenCalledWith(PAYOUT_ID);
    });

    it('propagates BadRequestException for non-failed payout', async () => {
      service.retryPayout.mockRejectedValue(
        new BadRequestException('Only failed payouts can be retried'),
      );
      await expect(controller.retryPayout(PAYOUT_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
