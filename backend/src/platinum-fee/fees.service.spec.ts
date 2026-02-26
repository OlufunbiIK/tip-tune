import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FeesService } from '../fees.service';
import { FeeCalculatorService } from '../fee-calculator.service';
import { PlatformFee, FeeCollectionStatus } from '../entities/platform-fee.entity';
import { FeeConfiguration } from '../entities/fee-configuration.entity';

const mockPlatformFeeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockFeeConfigRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockDataSource = () => ({
  query: jest.fn(),
});

describe('FeesService', () => {
  let service: FeesService;
  let platformFeeRepo: ReturnType<typeof mockPlatformFeeRepo>;
  let feeConfigRepo: ReturnType<typeof mockFeeConfigRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;
  let feeCalculator: FeeCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        FeeCalculatorService,
        { provide: getRepositoryToken(PlatformFee), useFactory: mockPlatformFeeRepo },
        { provide: getRepositoryToken(FeeConfiguration), useFactory: mockFeeConfigRepo },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);
    feeCalculator = module.get<FeeCalculatorService>(FeeCalculatorService);
    platformFeeRepo = module.get(getRepositoryToken(PlatformFee));
    feeConfigRepo = module.get(getRepositoryToken(FeeConfiguration));
    dataSource = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Configuration ─────────────────────────────────────────────────────────

  describe('getActiveConfiguration()', () => {
    it('should return active config when it exists', async () => {
      const config = { id: 'cfg-1', feePercentage: 2.5 } as FeeConfiguration;
      feeConfigRepo.findOne.mockResolvedValue(config);

      const result = await service.getActiveConfiguration();

      expect(result).toEqual(config);
      expect(feeConfigRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { effectiveFrom: 'DESC' } }),
      );
    });

    it('should return default config when no record exists', async () => {
      feeConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveConfiguration();

      expect(result.feePercentage).toBe(2.5);
      expect(result.minimumFeeXLM).toBe(0.1);
      expect(result.maximumFeeXLM).toBe(100);
    });
  });

  describe('updateConfiguration()', () => {
    it('should create a new config record (not overwrite)', async () => {
      const dto = {
        feePercentage: 3,
        minimumFeeXLM: 0.2,
        maximumFeeXLM: 50,
        waivedForVerifiedArtists: true,
      };
      const newConfig = { id: 'cfg-new', ...dto } as any;
      feeConfigRepo.create.mockReturnValue(newConfig);
      feeConfigRepo.save.mockResolvedValue(newConfig);

      const result = await service.updateConfiguration(dto, 'admin-id');

      expect(feeConfigRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'admin-id' }),
      );
      expect(feeConfigRepo.save).toHaveBeenCalledWith(newConfig);
      expect(result).toEqual(newConfig);
    });

    it('should throw BadRequestException when min > max', async () => {
      const dto = {
        feePercentage: 2.5,
        minimumFeeXLM: 200,
        maximumFeeXLM: 50,
        waivedForVerifiedArtists: false,
      };

      await expect(service.updateConfiguration(dto, 'admin-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Fee Recording ─────────────────────────────────────────────────────────

  describe('recordFeeForTip()', () => {
    it('should record fee as pending for non-verified artist', async () => {
      const config = {
        id: 'cfg-1',
        feePercentage: 2.5,
        minimumFeeXLM: 0.1,
        maximumFeeXLM: 100,
        waivedForVerifiedArtists: false,
        effectiveFrom: new Date(),
      } as FeeConfiguration;
      feeConfigRepo.findOne.mockResolvedValue(config);

      const savedFee = {
        id: 'fee-1',
        tipId: 'tip-1',
        collectionStatus: FeeCollectionStatus.PENDING,
      } as PlatformFee;
      platformFeeRepo.create.mockReturnValue(savedFee);
      platformFeeRepo.save.mockResolvedValue(savedFee);

      const result = await service.recordFeeForTip({
        tipId: 'tip-1',
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: false,
      });

      expect(result.collectionStatus).toBe(FeeCollectionStatus.PENDING);
    });

    it('should record fee as waived for verified artist when waiver enabled', async () => {
      const config = {
        id: 'cfg-1',
        feePercentage: 2.5,
        minimumFeeXLM: 0.1,
        maximumFeeXLM: 100,
        waivedForVerifiedArtists: true,
        effectiveFrom: new Date(),
      } as FeeConfiguration;
      feeConfigRepo.findOne.mockResolvedValue(config);

      const savedFee = {
        id: 'fee-1',
        tipId: 'tip-1',
        collectionStatus: FeeCollectionStatus.WAIVED,
      } as PlatformFee;
      platformFeeRepo.create.mockReturnValue(savedFee);
      platformFeeRepo.save.mockResolvedValue(savedFee);

      const result = await service.recordFeeForTip({
        tipId: 'tip-1',
        amountXLM: 100,
        xlmToUsdRate: 0.12,
        isVerifiedArtist: true,
      });

      expect(result.collectionStatus).toBe(FeeCollectionStatus.WAIVED);
    });
  });

  describe('markFeeCollected()', () => {
    it('should mark fee as collected with tx hash', async () => {
      const fee = {
        id: 'fee-1',
        collectionStatus: FeeCollectionStatus.PENDING,
      } as PlatformFee;
      platformFeeRepo.findOne.mockResolvedValue(fee);
      platformFeeRepo.save.mockImplementation((f) => Promise.resolve(f));

      const result = await service.markFeeCollected('fee-1', 'abc123txhash');

      expect(result.collectionStatus).toBe(FeeCollectionStatus.COLLECTED);
      expect(result.stellarTxHash).toBe('abc123txhash');
      expect(result.collectedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for unknown fee id', async () => {
      platformFeeRepo.findOne.mockResolvedValue(null);

      await expect(service.markFeeCollected('nonexistent', 'txhash')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to collect a waived fee', async () => {
      const fee = {
        id: 'fee-1',
        collectionStatus: FeeCollectionStatus.WAIVED,
      } as PlatformFee;
      platformFeeRepo.findOne.mockResolvedValue(fee);

      await expect(service.markFeeCollected('fee-1', 'txhash')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFeeByTipId()', () => {
    it('should return fee for a valid tip id', async () => {
      const fee = { id: 'fee-1', tipId: 'tip-1' } as PlatformFee;
      platformFeeRepo.findOne.mockResolvedValue(fee);

      const result = await service.getFeeByTipId('tip-1');

      expect(result).toEqual(fee);
    });

    it('should throw NotFoundException for unknown tip id', async () => {
      platformFeeRepo.findOne.mockResolvedValue(null);

      await expect(service.getFeeByTipId('nonexistent-tip')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFeeLedger()', () => {
    it('should return paginated ledger with defaults', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 'fee-1' }, { id: 'fee-2' }],
          2,
        ]),
      };
      platformFeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getFeeLedger({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by period when provided', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      platformFeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.getFeeLedger({ period: '7d' });

      expect(mockQb.where).toHaveBeenCalledWith(
        'fee.created_at >= :since',
        expect.objectContaining({ since: expect.any(Date) }),
      );
    });
  });

  describe('getPlatformTotals()', () => {
    it('should return aggregated totals', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalFeesXLM: '150.25',
          totalFeesUSD: '18.03',
          totalCollected: '100.00',
          totalPending: '50.25',
          totalWaived: '0.00',
          totalTransactions: '42',
          averageFeeXLM: '3.57',
          averageFeePercentage: '2.50',
        }),
      };
      platformFeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getPlatformTotals();

      expect(result.totalFeesXLM).toBe(150.25);
      expect(result.totalFeesUSD).toBe(18.03);
      expect(result.totalTransactions).toBe(42);
    });

    it('should handle empty results with zero values', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({}),
      };
      platformFeeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getPlatformTotals();

      expect(result.totalFeesXLM).toBe(0);
      expect(result.totalTransactions).toBe(0);
    });
  });

  describe('getArtistFeeSummary()', () => {
    it('should return artist fee summary', async () => {
      dataSource.query.mockResolvedValue([
        {
          totalTips: '10',
          totalFeesXLM: '25.0',
          totalFeesUSD: '3.0',
          waivedCount: '2',
          collectedCount: '6',
          pendingCount: '2',
        },
      ]);

      const result = await service.getArtistFeeSummary('artist-uuid');

      expect(result.artistId).toBe('artist-uuid');
      expect(result.totalTips).toBe(10);
      expect(result.waivedCount).toBe(2);
    });
  });
});
