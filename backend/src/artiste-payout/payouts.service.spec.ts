import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PayoutsService } from './payouts.service';
import { PayoutRequest, PayoutStatus } from './entities/payout-request.entity';
import { ArtistBalance } from './entities/artist-balance.entity';
import { CreatePayoutDto } from './dto/create-payout.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ARTIST_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const DEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

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

function makePayout(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
  return Object.assign(new PayoutRequest(), {
    id: 'pay-uuid',
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

function makeQueryRunner(balance: ArtistBalance) {
  const repo = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(balance),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((d) => Object.assign(new PayoutRequest(), d)),
    save: jest.fn((e) => Promise.resolve({ ...e, id: 'new-pay-uuid' })),
    findOne: jest.fn(),
  };

  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn().mockReturnValue(repo),
    },
    _repo: repo,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PayoutsService', () => {
  let service: PayoutsService;
  let payoutRepo: jest.Mocked<any>;
  let balanceRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    payoutRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((d) => Object.assign(new PayoutRequest(), d)),
      save: jest.fn(),
      update: jest.fn(),
    };

    balanceRepo = {
      findOne: jest.fn(),
      create: jest.fn((d) => Object.assign(new ArtistBalance(), d)),
      save: jest.fn(),
      update: jest.fn(),
    };

    dataSource = { createQueryRunner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(ArtistBalance), useValue: balanceRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: { get: (key: string, def: any) => def },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
    // Stub address verification to always pass
    jest.spyOn(service as any, 'verifyArtistAddress').mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── getOrCreateBalance ──────────────────────────────────────────────────────

  describe('getOrCreateBalance', () => {
    it('returns existing balance', async () => {
      const b = makeBalance();
      balanceRepo.findOne.mockResolvedValue(b);
      await expect(service.getOrCreateBalance(ARTIST_ID)).resolves.toEqual(b);
      expect(balanceRepo.save).not.toHaveBeenCalled();
    });

    it('creates balance when missing', async () => {
      balanceRepo.findOne.mockResolvedValue(null);
      const created = makeBalance({ xlmBalance: 0 });
      balanceRepo.save.mockResolvedValue(created);
      const result = await service.getOrCreateBalance(ARTIST_ID);
      expect(balanceRepo.save).toHaveBeenCalled();
      expect(result.artistId).toBe(ARTIST_ID);
    });
  });

  // ── getBalance ──────────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns balance', async () => {
      const b = makeBalance();
      balanceRepo.findOne.mockResolvedValue(b);
      await expect(service.getBalance(ARTIST_ID)).resolves.toEqual(b);
    });

    it('throws NotFoundException when no record', async () => {
      balanceRepo.findOne.mockResolvedValue(null);
      await expect(service.getBalance(ARTIST_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── requestPayout ───────────────────────────────────────────────────────────

  describe('requestPayout', () => {
    const dto: CreatePayoutDto = {
      artistId: ARTIST_ID,
      amount: 20,
      assetCode: 'XLM',
      destinationAddress: DEST_ADDRESS,
    };

    it('creates payout and reserves balance', async () => {
      const balance = makeBalance({ xlmBalance: 100, pendingXlm: 0 });
      const qr = makeQueryRunner(balance);
      dataSource.createQueryRunner.mockReturnValue(qr);
      payoutRepo.findOne.mockResolvedValue(null); // no pending

      const result = await service.requestPayout(dto);

      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.artistId).toBe(ARTIST_ID);
    });

    it('rejects below minimum threshold', async () => {
      const lowDto = { ...dto, amount: 5 }; // default min is 10
      await expect(service.requestPayout(lowDto)).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate pending payout', async () => {
      payoutRepo.findOne.mockResolvedValue(makePayout());
      await expect(service.requestPayout(dto)).rejects.toThrow(ConflictException);
    });

    it('rejects when balance insufficient', async () => {
      const balance = makeBalance({ xlmBalance: 5, pendingXlm: 0 });
      const qr = makeQueryRunner(balance);
      dataSource.createQueryRunner.mockReturnValue(qr);
      payoutRepo.findOne.mockResolvedValue(null);

      await expect(service.requestPayout(dto)).rejects.toThrow(BadRequestException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('rejects when no balance record', async () => {
      const qr = makeQueryRunner(null);
      dataSource.createQueryRunner.mockReturnValue(qr);
      payoutRepo.findOne.mockResolvedValue(null);

      await expect(service.requestPayout(dto)).rejects.toThrow(NotFoundException);
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });

    it('accounts for pending XLM when calculating available', async () => {
      const balance = makeBalance({ xlmBalance: 25, pendingXlm: 20 }); // only 5 available
      const qr = makeQueryRunner(balance);
      dataSource.createQueryRunner.mockReturnValue(qr);
      payoutRepo.findOne.mockResolvedValue(null);

      await expect(service.requestPayout({ ...dto, amount: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── getHistory ──────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns payouts for artist ordered desc', async () => {
      const payouts = [makePayout(), makePayout({ status: PayoutStatus.COMPLETED })];
      payoutRepo.find.mockResolvedValue(payouts);
      const result = await service.getHistory(ARTIST_ID);
      expect(result).toHaveLength(2);
    });
  });

  // ── getStatus ───────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns payout by id', async () => {
      const payout = makePayout();
      payoutRepo.findOne.mockResolvedValue(payout);
      await expect(service.getStatus('pay-uuid')).resolves.toEqual(payout);
    });

    it('throws NotFoundException for unknown id', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      await expect(service.getStatus('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── retryPayout ─────────────────────────────────────────────────────────────

  describe('retryPayout', () => {
    it('resets failed payout to pending', async () => {
      const failed = makePayout({ status: PayoutStatus.FAILED, failureReason: 'timeout' });
      payoutRepo.findOne
        .mockResolvedValueOnce(failed)   // first call for payout
        .mockResolvedValueOnce(null)     // no pending duplicate
        .mockResolvedValueOnce({ ...failed, status: PayoutStatus.PENDING }); // after update
      payoutRepo.update.mockResolvedValue(undefined);

      const result = await service.retryPayout('pay-uuid');
      expect(payoutRepo.update).toHaveBeenCalledWith('pay-uuid', expect.objectContaining({
        status: PayoutStatus.PENDING,
      }));
    });

    it('throws BadRequestException if not failed', async () => {
      payoutRepo.findOne.mockResolvedValue(makePayout({ status: PayoutStatus.COMPLETED }));
      await expect(service.retryPayout('pay-uuid')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown payout', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      await expect(service.retryPayout('unknown')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if pending already exists for artist', async () => {
      const failed = makePayout({ status: PayoutStatus.FAILED });
      const pending = makePayout({ id: 'other-uuid' });
      payoutRepo.findOne
        .mockResolvedValueOnce(failed)
        .mockResolvedValueOnce(pending);

      await expect(service.retryPayout('pay-uuid')).rejects.toThrow(ConflictException);
    });
  });

  // ── getPendingPayouts ───────────────────────────────────────────────────────

  describe('getPendingPayouts', () => {
    it('returns pending payouts', async () => {
      const pending = [makePayout(), makePayout({ id: 'uuid2' })];
      payoutRepo.find.mockResolvedValue(pending);
      await expect(service.getPendingPayouts()).resolves.toHaveLength(2);
    });
  });

  // ── markProcessing ──────────────────────────────────────────────────────────

  describe('markProcessing', () => {
    it('updates status to processing', async () => {
      payoutRepo.update.mockResolvedValue(undefined);
      await service.markProcessing('pay-uuid');
      expect(payoutRepo.update).toHaveBeenCalledWith('pay-uuid', {
        status: PayoutStatus.PROCESSING,
      });
    });
  });

  // ── finaliseSuccess ─────────────────────────────────────────────────────────

  describe('finaliseSuccess', () => {
    it('updates payout and deducts balance', async () => {
      const payout = makePayout({ amount: 20, assetCode: 'XLM' });
      const qbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const qbRepo = {
        findOne: jest.fn().mockResolvedValue(payout),
        createQueryBuilder: jest.fn().mockReturnValue(qbUpdate),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const qr: any = { manager: { getRepository: jest.fn().mockReturnValue(qbRepo) } };

      await service.finaliseSuccess('pay-uuid', 'txhash123', qr);

      expect(qbUpdate.execute).toHaveBeenCalled();
      expect(qbRepo.update).toHaveBeenCalledWith(
        'pay-uuid',
        expect.objectContaining({ status: PayoutStatus.COMPLETED, stellarTxHash: 'txhash123' }),
      );
    });
  });

  // ── finaliseFailure ─────────────────────────────────────────────────────────

  describe('finaliseFailure', () => {
    it('marks payout as failed and releases pending reserve', async () => {
      const payout = makePayout({ amount: 20, assetCode: 'XLM' });
      const qbUpdate = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const qbRepo = {
        findOne: jest.fn().mockResolvedValue(payout),
        createQueryBuilder: jest.fn().mockReturnValue(qbUpdate),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const qr: any = { manager: { getRepository: jest.fn().mockReturnValue(qbRepo) } };

      await service.finaliseFailure('pay-uuid', 'network error', qr);

      expect(qbUpdate.execute).toHaveBeenCalled();
      expect(qbRepo.update).toHaveBeenCalledWith(
        'pay-uuid',
        expect.objectContaining({ status: PayoutStatus.FAILED }),
      );
    });

    it('returns silently when payout not found', async () => {
      const qbRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const qr: any = { manager: { getRepository: jest.fn().mockReturnValue(qbRepo) } };
      await expect(service.finaliseFailure('unknown', 'error', qr)).resolves.toBeUndefined();
    });
  });
});
