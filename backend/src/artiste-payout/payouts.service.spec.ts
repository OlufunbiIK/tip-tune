import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Artist } from '../artists/entities/artist.entity';
import { ArtistBalance } from './artist-balance.entity';
import {
  ArtistBalanceAudit,
  ArtistBalanceAuditType,
} from './artist-balance-audit.entity';
import { CreatePayoutDto } from './create-payout.dto';
import { PayoutRequest, PayoutStatus } from './payout-request.entity';
import { PayoutsService } from './payouts.service';

const ARTIST_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const OTHER_ARTIST_ID = 'a1b2c3d4-0000-0000-0000-000000000099';
const OWNER_USER_ID = 'user-123';
const DEST_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return Object.assign(new Artist(), {
    id: ARTIST_ID,
    userId: OWNER_USER_ID,
    walletAddress: DEST_ADDRESS,
    artistName: 'Owner',
    genre: 'Afrobeats',
    bio: 'Artist bio',
    isDeleted: false,
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

function makeQueryRunner(balance: ArtistBalance | null) {
  const balanceRepo = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(balance),
    update: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(balance),
  };

  const payoutRepo = {
    create: jest.fn((data) => Object.assign(new PayoutRequest(), data)),
    save: jest.fn(async (entity) => ({ ...entity, id: 'new-pay-uuid' })),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      getRepository: jest.fn((entity) => {
        if (entity === ArtistBalance) {
          return balanceRepo;
        }

        return payoutRepo;
      }),
    },
    _balanceRepo: balanceRepo,
    _payoutRepo: payoutRepo,
  };
}

describe('PayoutsService', () => {
  let service: PayoutsService;
  let payoutRepo: jest.Mocked<any>;
  let balanceRepo: jest.Mocked<any>;
  let auditRepo: jest.Mocked<any>;
  let artistRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    payoutRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => Object.assign(new PayoutRequest(), data)),
      save: jest.fn(),
      update: jest.fn(),
    };

    balanceRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => Object.assign(new ArtistBalance(), data)),
      save: jest.fn(),
      update: jest.fn(),
    };

    auditRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(),
    };

    artistRepo = {
      findOne: jest.fn().mockResolvedValue(makeArtist()),
    };

    dataSource = { createQueryRunner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(ArtistBalance), useValue: balanceRepo },
        { provide: getRepositoryToken(ArtistBalanceAudit), useValue: auditRepo },
        { provide: getRepositoryToken(Artist), useValue: artistRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, defaultValue: any) => defaultValue },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
    jest.clearAllMocks();
    artistRepo.findOne.mockResolvedValue(makeArtist());
  });

  describe('getBalance', () => {
    it('should return the owned artist balance', async () => {
      const balance = makeBalance();
      balanceRepo.findOne.mockResolvedValue(balance);

      await expect(service.getBalance(OWNER_USER_ID, ARTIST_ID)).resolves.toEqual(balance);
    });

    it('should reject access to another artist profile', async () => {
      artistRepo.findOne.mockResolvedValue(
        makeArtist({ id: OTHER_ARTIST_ID, userId: 'other-user' }),
      );

      await expect(service.getBalance(OWNER_USER_ID, OTHER_ARTIST_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('requestPayout', () => {
    const dto: CreatePayoutDto = {
      artistId: ARTIST_ID,
      amount: 20,
      assetCode: 'XLM',
      destinationAddress: DEST_ADDRESS,
    };

    it('should create a payout and reserve balance', async () => {
      const queryRunner = makeQueryRunner(makeBalance());
      dataSource.createQueryRunner.mockReturnValue(queryRunner);
      payoutRepo.findOne.mockResolvedValue(null);

      const result = await service.requestPayout(OWNER_USER_ID, dto);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.artistId).toBe(ARTIST_ID);
      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: ArtistBalanceAuditType.PAYOUT_REQUEST }),
      );
    });

    it('should reject below-threshold payouts', async () => {
      await expect(
        service.requestPayout(OWNER_USER_ID, { ...dto, amount: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate pending payouts', async () => {
      payoutRepo.findOne.mockResolvedValue(makePayout());

      await expect(service.requestPayout(OWNER_USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject payouts to wallets not owned by the artist', async () => {
      await expect(
        service.requestPayout(OWNER_USER_ID, {
          ...dto,
          destinationAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject payouts for another artist profile', async () => {
      artistRepo.findOne.mockResolvedValue(
        makeArtist({ id: OTHER_ARTIST_ID, userId: 'other-user' }),
      );

      await expect(
        service.requestPayout(OWNER_USER_ID, { ...dto, artistId: OTHER_ARTIST_ID }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getHistory', () => {
    it('should return history for the owned artist', async () => {
      const payouts = [makePayout(), makePayout({ id: 'pay-2', status: PayoutStatus.COMPLETED })];
      payoutRepo.find.mockResolvedValue(payouts);

      const result = await service.getHistory(OWNER_USER_ID, ARTIST_ID);

      expect(result).toEqual(payouts);
    });
  });

  describe('getStatus', () => {
    it('should return payout status for the owned artist', async () => {
      const payout = makePayout();
      payoutRepo.findOne.mockResolvedValue(payout);

      await expect(service.getStatus(OWNER_USER_ID, 'pay-uuid')).resolves.toEqual(payout);
    });

    it('should reject payout status lookups for another artist', async () => {
      payoutRepo.findOne.mockResolvedValue(makePayout({ artistId: OTHER_ARTIST_ID }));
      artistRepo.findOne.mockResolvedValue(
        makeArtist({ id: OTHER_ARTIST_ID, userId: 'other-user' }),
      );

      await expect(service.getStatus(OWNER_USER_ID, 'pay-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('retryPayout', () => {
    it('should retry failed payouts', async () => {
      const failed = makePayout({ status: PayoutStatus.FAILED, failureReason: 'timeout' });
      payoutRepo.findOne
        .mockResolvedValueOnce(failed)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...failed, status: PayoutStatus.PENDING });
      payoutRepo.update.mockResolvedValue(undefined);

      const result = await service.retryPayout(OWNER_USER_ID, 'pay-uuid');

      expect(payoutRepo.update).toHaveBeenCalledWith(
        'pay-uuid',
        expect.objectContaining({ status: PayoutStatus.PENDING }),
      );
      expect(result.status).toBe(PayoutStatus.PENDING);
    });

    it('should reject retries for another artist', async () => {
      payoutRepo.findOne.mockResolvedValue(
        makePayout({ status: PayoutStatus.FAILED, artistId: OTHER_ARTIST_ID }),
      );
      artistRepo.findOne.mockResolvedValue(
        makeArtist({ id: OTHER_ARTIST_ID, userId: 'other-user' }),
      );

      await expect(service.retryPayout(OWNER_USER_ID, 'pay-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
