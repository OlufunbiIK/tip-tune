import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnifiedFeesService } from './unified-fees.service';
import { UnifiedFeeCalculatorService } from './unified-fee-calculator.service';
import { StellarService } from '../stellar/stellar.service';
import { UnifiedPlatformFee, FeeCollectionStatus } from './entities/unified-platform-fee.entity';
import { UnifiedFeeConfiguration } from './entities/unified-fee-configuration.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Tip } from '../tips/entities/tip.entity';

describe('UnifiedFeesService', () => {
  let service: UnifiedFeesService;
  let platformFeeRepo: Repository<UnifiedPlatformFee>;
  let feeConfigRepo: Repository<UnifiedFeeConfiguration>;
  let artistRepo: Repository<Artist>;
  let stellarService: StellarService;
  let feeCalculator: UnifiedFeeCalculatorService;
  let dataSource: DataSource;

  const mockTip: Tip = {
    id: 'tip-123',
    amount: '10.5',
    assetCode: 'XLM',
    assetIssuer: null,
    stellarTxHash: 'tx-hash-123',
    artistId: 'artist-123',
    sender: { id: 'user-123' } as any,
    artist: { id: 'artist-123', isVerified: false } as any,
  } as Tip;

  const mockArtist: Artist = {
    id: 'artist-123',
    isVerified: true,
    walletAddress: 'GD123456789',
    user: { id: 'user-456' } as any,
  } as Artist;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedFeesService,
        UnifiedFeeCalculatorService,
        {
          provide: getRepositoryToken(UnifiedPlatformFee),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UnifiedFeeConfiguration),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: StellarService,
          useValue: {
            getConversionRate: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UnifiedFeesService>(UnifiedFeesService);
    platformFeeRepo = module.get<Repository<UnifiedPlatformFee>>(
      getRepositoryToken(UnifiedPlatformFee),
    );
    feeConfigRepo = module.get<Repository<UnifiedFeeConfiguration>>(
      getRepositoryToken(UnifiedFeeConfiguration),
    );
    artistRepo = module.get<Repository<Artist>>(getRepositoryToken(Artist));
    stellarService = module.get<StellarService>(StellarService);
    feeCalculator = module.get<UnifiedFeeCalculatorService>(UnifiedFeeCalculatorService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('getActiveConfiguration', () => {
    it('should return active configuration', async () => {
      const config = new UnifiedFeeConfiguration();
      config.feePercentage = 2.5;
      config.effectiveFrom = new Date('2024-01-01');

      jest.spyOn(feeConfigRepo, 'findOne').mockResolvedValue(config);

      const result = await service.getActiveConfiguration();

      expect(feeConfigRepo.findOne).toHaveBeenCalledWith({
        where: { effectiveFrom: expect.any(Date) },
        order: { effectiveFrom: 'DESC' },
      });
      expect(result).toEqual(config);
    });

    it('should return default configuration when none exists', async () => {
      jest.spyOn(feeConfigRepo, 'findOne').mockResolvedValue(null);

      const result = await service.getActiveConfiguration();

      expect(result.feePercentage).toBe(2.5);
      expect(result.minimumFeeXLM).toBe(0.1);
      expect(result.maximumFeeXLM).toBe(100);
      expect(result.waivedForVerifiedArtists).toBe(false);
    });
  });

  describe('updateConfiguration', () => {
    it('should create new fee configuration', async () => {
      const updateDto = {
        feePercentage: 3.0,
        minimumFeeXLM: 0.2,
        maximumFeeXLM: 50,
        waivedForVerifiedArtists: true,
      };
      const adminUserId = 'admin-123';

      const newConfig = new UnifiedFeeConfiguration();
      jest.spyOn(feeConfigRepo, 'create').mockReturnValue(newConfig);
      jest.spyOn(feeConfigRepo, 'save').mockResolvedValue(newConfig);

      const result = await service.updateConfiguration(updateDto, adminUserId);

      expect(feeConfigRepo.create).toHaveBeenCalledWith({
        feePercentage: 3.0,
        minimumFeeXLM: 0.2,
        maximumFeeXLM: 50,
        waivedForVerifiedArtists: true,
        effectiveFrom: expect.any(Date),
        createdBy: adminUserId,
      });
      expect(feeConfigRepo.save).toHaveBeenCalledWith(newConfig);
      expect(result).toBe(newConfig);
    });

    it('should throw error when minimum exceeds maximum', async () => {
      const updateDto = {
        feePercentage: 3.0,
        minimumFeeXLM: 100,
        maximumFeeXLM: 50,
      };

      await expect(
        service.updateConfiguration(updateDto, 'admin-123'),
      ).rejects.toThrow('minimumFeeXLM cannot exceed maximumFeeXLM');
    });
  });

  describe('recordFeeForTip', () => {
    it('should record fee for XLM tip', async () => {
      const config = new UnifiedFeeConfiguration();
      config.feePercentage = 2.5;
      config.waivedForVerifiedArtists = false;

      const calculationResult = {
        feePercentage: 2.5,
        feeAmountXLM: 0.2625,
        feeAmountUSD: 0.0525,
        isWaived: false,
      };

      jest.spyOn(service, 'getActiveConfiguration').mockResolvedValue(config);
      jest.spyOn(artistRepo, 'findOne').mockResolvedValue(mockArtist);
      jest.spyOn(feeCalculator, 'calculate').mockReturnValue(calculationResult);

      const fee = new UnifiedPlatformFee();
      jest.spyOn(platformFeeRepo, 'create').mockReturnValue(fee);
      jest.spyOn(platformFeeRepo, 'save').mockResolvedValue(fee);

      const result = await service.recordFeeForTip(mockTip);

      expect(service.getActiveConfiguration).toHaveBeenCalled();
      expect(artistRepo.findOne).toHaveBeenCalledWith({ where: { id: mockTip.artistId } });
      expect(feeCalculator.calculate).toHaveBeenCalledWith({
        amountXLM: 10.5,
        isVerifiedArtist: true,
        config,
      });
      expect(platformFeeRepo.create).toHaveBeenCalledWith({
        tipId: mockTip.id,
        feePercentage: 2.5,
        feeAmountXLM: 0.2625,
        feeAmountUSD: 0.0525,
        collectionStatus: FeeCollectionStatus.PENDING,
        stellarTxHash: mockTip.stellarTxHash,
      });
      expect(platformFeeRepo.save).toHaveBeenCalledWith(fee);
      expect(result).toBe(fee);
    });

    it('should waive fee for verified artist when configured', async () => {
      const config = new UnifiedFeeConfiguration();
      config.feePercentage = 2.5;
      config.waivedForVerifiedArtists = true;

      const calculationResult = {
        feePercentage: 2.5,
        feeAmountXLM: 0,
        feeAmountUSD: 0,
        isWaived: true,
      };

      jest.spyOn(service, 'getActiveConfiguration').mockResolvedValue(config);
      jest.spyOn(artistRepo, 'findOne').mockResolvedValue(mockArtist);
      jest.spyOn(feeCalculator, 'calculate').mockReturnValue(calculationResult);

      const fee = new UnifiedPlatformFee();
      jest.spyOn(platformFeeRepo, 'create').mockReturnValue(fee);
      jest.spyOn(platformFeeRepo, 'save').mockResolvedValue(fee);

      const result = await service.recordFeeForTip(mockTip);

      expect(platformFeeRepo.create).toHaveBeenCalledWith({
        tipId: mockTip.id,
        feePercentage: 2.5,
        feeAmountXLM: 0,
        feeAmountUSD: 0,
        collectionStatus: FeeCollectionStatus.WAIVED,
        stellarTxHash: mockTip.stellarTxHash,
      });
    });
  });

  describe('markFeeCollected', () => {
    it('should mark fee as collected', async () => {
      const fee = new UnifiedPlatformFee();
      fee.id = 'fee-123';
      fee.collectionStatus = FeeCollectionStatus.PENDING;

      jest.spyOn(platformFeeRepo, 'findOne').mockResolvedValue(fee);
      jest.spyOn(platformFeeRepo, 'save').mockResolvedValue(fee);

      const result = await service.markFeeCollected('fee-123', 'new-tx-hash');

      expect(platformFeeRepo.findOne).toHaveBeenCalledWith({ where: { id: 'fee-123' } });
      expect(fee.collectionStatus).toBe(FeeCollectionStatus.COLLECTED);
      expect(fee.stellarTxHash).toBe('new-tx-hash');
      expect(fee.collectedAt).toBeInstanceOf(Date);
      expect(platformFeeRepo.save).toHaveBeenCalledWith(fee);
      expect(result).toBe(fee);
    });

    it('should throw error when fee not found', async () => {
      jest.spyOn(platformFeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.markFeeCollected('fee-123', 'new-tx-hash'),
      ).rejects.toThrow('PlatformFee fee-123 not found');
    });

    it('should throw error when trying to collect waived fee', async () => {
      const fee = new UnifiedPlatformFee();
      fee.id = 'fee-123';
      fee.collectionStatus = FeeCollectionStatus.WAIVED;

      jest.spyOn(platformFeeRepo, 'findOne').mockResolvedValue(fee);

      await expect(
        service.markFeeCollected('fee-123', 'new-tx-hash'),
      ).rejects.toThrow('Cannot collect a waived fee');
    });
  });

  describe('getFeeByTipId', () => {
    it('should return fee by tip ID', async () => {
      const fee = new UnifiedPlatformFee();
      fee.tipId = 'tip-123';

      jest.spyOn(platformFeeRepo, 'findOne').mockResolvedValue(fee);

      const result = await service.getFeeByTipId('tip-123');

      expect(platformFeeRepo.findOne).toHaveBeenCalledWith({
        where: { tipId: 'tip-123' },
        relations: ['tip'],
      });
      expect(result).toBe(fee);
    });

    it('should throw error when fee not found', async () => {
      jest.spyOn(platformFeeRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getFeeByTipId('tip-123'),
      ).rejects.toThrow('No fee record found for tip tip-123');
    });
  });

  describe('getPlatformTotals', () => {
    it('should return platform totals', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalFeesXLM: '100.50',
          totalFeesUSD: '20.10',
          totalCollected: '80.40',
          totalPending: '20.10',
          totalWaived: '0.00',
          totalTransactions: '50',
          averageFeeXLM: '2.01',
          averageFeePercentage: '2.5',
        }),
      };

      jest.spyOn(platformFeeRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

      const result = await service.getPlatformTotals();

      expect(result).toEqual({
        totalFeesXLM: 100.50,
        totalFeesUSD: 20.10,
        totalCollected: 80.40,
        totalPending: 20.10,
        totalWaived: 0.00,
        totalTransactions: 50,
        averageFeeXLM: 2.01,
        averageFeePercentage: 2.5,
      });
    });
  });

  describe('getArtistFeeSummary', () => {
    it('should return artist fee summary', async () => {
      const mockQueryResult = [{
        totalTips: '10',
        totalFeesXLM: '25.50',
        totalFeesUSD: '5.10',
        waivedCount: '2',
        collectedCount: '8',
        pendingCount: '0',
      }];

      jest.spyOn(dataSource, 'query').mockResolvedValue(mockQueryResult);

      const result = await service.getArtistFeeSummary('artist-123');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['artist-123'],
      );
      expect(result).toEqual({
        artistId: 'artist-123',
        totalFeesXLM: 25.50,
        totalFeesUSD: 5.10,
        waivedCount: 2,
        collectedCount: 8,
        pendingCount: 0,
        totalTips: 10,
      });
    });
  });
});
