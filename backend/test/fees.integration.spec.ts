import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeesService } from '../src/fees/fees.service';
import { PlatformFee } from '../src/fees/entities/platform-fee.entity';
import { FeeConfiguration } from '../src/fees/entities/fee-configuration.entity';
import { Artist } from '../src/artists/entities/artist.entity';
import { User } from '../src/users/entities/user.entity';
import { Tip } from '../src/tips/entities/tip.entity';
import { FeeCalculatorService } from '../src/fees/fee-calculator.service';
import { StellarService } from '../src/stellar/stellar.service';

describe('FeesService (integration-ish)', () => {
  let service: FeesService;

  const mockPlatformFeeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFeeConfigRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockArtistRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {};

  const mockStellarService = {
    getConversionRate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        FeeCalculatorService,
        {
          provide: getRepositoryToken(PlatformFee),
          useValue: mockPlatformFeeRepo,
        },
        {
          provide: getRepositoryToken(FeeConfiguration),
          useValue: mockFeeConfigRepo,
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: mockArtistRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);

    jest.clearAllMocks();
  });

  it('records a fee for a simple XLM tip', async () => {
    const config: FeeConfiguration = {
      id: 'config-id',
      feePercentage: '2.5',
      minimumFeeXLM: null,
      maximumFeeXLM: null,
      waivedForVerifiedArtists: false,
      effectiveFrom: new Date(),
      createdById: null,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFeeConfigRepo.findOne.mockResolvedValue(config);
    mockArtistRepo.findOne.mockResolvedValue({ id: 'artist-id', isVerified: false });

    const tip: Tip = {
      id: 'tip-id',
      artistId: 'artist-id',
      trackId: null,
      stellarTxHash: 'hash',
      senderAddress: 'sender',
      receiverAddress: 'receiver',
      amount: 100,
      assetCode: 'XLM',
      assetIssuer: null,
      assetType: 'native',
      message: null,
      stellarMemo: null,
      status: null,
      type: null,
      verifiedAt: null,
      failedAt: null,
      failureReason: null,
      reversedAt: null,
      reversalReason: null,
      stellarTimestamp: null,
      exchangeRate: null,
      fiatCurrency: null,
      fiatAmount: null,
      isAnonymous: false,
      isPublic: false,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artist: null,
      track: null,
    } as any;

    const createdFee: PlatformFee = {
      id: 'fee-id',
      tipId: tip.id,
      tip: tip,
      feePercentage: '2.5',
      feeAmountXLM: '2.5',
      feeAmountUSD: null,
      collectionStatus: null,
      stellarTxHash: tip.stellarTxHash,
      collectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    mockPlatformFeeRepo.create.mockReturnValue(createdFee);
    mockPlatformFeeRepo.save.mockResolvedValue(createdFee);

    const result = await service.recordFeeForTip(tip);

    expect(mockFeeConfigRepo.findOne).toHaveBeenCalled();
    expect(mockArtistRepo.findOne).toHaveBeenCalledWith({
      where: { id: tip.artistId },
    });
    expect(mockPlatformFeeRepo.create).toHaveBeenCalled();
    expect(mockPlatformFeeRepo.save).toHaveBeenCalledWith(createdFee);
    expect(result.feeAmountXLM).toBe('2.5');
  });
});

