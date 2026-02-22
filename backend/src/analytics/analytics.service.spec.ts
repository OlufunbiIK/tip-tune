import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Tip, TipStatus } from '../tips/entities/tip.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Genre } from '../genres/entities/genre.entity';
import { REDIS_CLIENT } from '../leaderboards/redis.module';
import { AnalyticsPeriod, AnalyticsGroupBy } from './dto/analytics-query.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let tipRepository: Repository<Tip>;
  let artistRepository: Repository<Artist>;
  let redisClient: any;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockTipRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockArtistRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  };

  const mockTrackRepository = {};
  const mockGenreRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Tip),
          useValue: mockTipRepository,
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: mockArtistRepository,
        },
        {
          provide: getRepositoryToken(Track),
          useValue: mockTrackRepository,
        },
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    tipRepository = module.get<Repository<Tip>>(getRepositoryToken(Tip));
    artistRepository = module.get<Repository<Artist>>(getRepositoryToken(Artist));
    redisClient = module.get(REDIS_CLIENT);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTipSummary', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        totalTips: 100,
        totalAmount: 5000,
        averageTipAmount: 50,
        uniqueTippers: 50,
        uniqueArtists: 20,
        periodStart: new Date(),
        periodEnd: new Date(),
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getTipSummary({ period: AnalyticsPeriod.WEEK });

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockTipRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should compute and cache tip summary', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const mockQueryBuilder = mockTipRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalTips: '100',
        totalAmount: '5000',
        averageTipAmount: '50',
        uniqueTippers: '50',
        uniqueArtists: '20',
      });

      const result = await service.getTipSummary({ period: AnalyticsPeriod.WEEK });

      expect(result.totalTips).toBe(100);
      expect(result.totalAmount).toBe(5000);
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });

  describe('getTipTrends', () => {
    it('should return tip trends with growth rate', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const mockQueryBuilder = mockTipRepository.createQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { timestamp: new Date(), tipCount: '10', totalAmount: '500', uniqueTippers: '5' },
        { timestamp: new Date(), tipCount: '15', totalAmount: '750', uniqueTippers: '8' },
        { timestamp: new Date(), tipCount: '20', totalAmount: '1000', uniqueTippers: '10' },
        { timestamp: new Date(), tipCount: '25', totalAmount: '1250', uniqueTippers: '12' },
      ]);

      const result = await service.getTipTrends({ 
        period: AnalyticsPeriod.WEEK,
        groupBy: AnalyticsGroupBy.DAY 
      });

      expect(result.data).toHaveLength(4);
      expect(result.summary.totalTips).toBe(70);
      expect(result.summary.totalAmount).toBe(3500);
      expect(result.summary.growthRate).toBeDefined();
    });
  });

  describe('getArtistRankings', () => {
    it('should return artist rankings', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const mockQueryBuilder = mockArtistRepository.createQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          artistId: 'artist-1',
          artistName: 'Artist One',
          profileImage: 'image1.jpg',
          genre: 'Rock',
          totalAmount: '1000',
          totalTips: '20',
          averageTipAmount: '50',
          uniqueTippers: '15',
        },
        {
          artistId: 'artist-2',
          artistName: 'Artist Two',
          profileImage: 'image2.jpg',
          genre: 'Pop',
          totalAmount: '800',
          totalTips: '16',
          averageTipAmount: '50',
          uniqueTippers: '12',
        },
      ]);

      const result = await service.getArtistRankings({ 
        period: AnalyticsPeriod.WEEK,
        limit: 10 
      });

      expect(result.rankings).toHaveLength(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[0].artistName).toBe('Artist One');
      expect(result.rankings[1].rank).toBe(2);
    });
  });

  describe('getGenreDistribution', () => {
    it('should return genre distribution', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const mockQueryBuilder = mockTipRepository.createQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { genre: 'Rock', tipCount: '50', totalAmount: '2500', artistCount: '10' },
        { genre: 'Pop', tipCount: '40', totalAmount: '2000', artistCount: '8' },
        { genre: 'Jazz', tipCount: '30', totalAmount: '1500', artistCount: '6' },
      ]);

      const result = await service.getGenreDistribution({ period: AnalyticsPeriod.WEEK });

      expect(result.distribution).toHaveLength(3);
      expect(result.totalAmount).toBe(6000);
      expect(result.distribution[0].percentage).toBe(41.67);
    });
  });

  describe('getArtistAnalytics', () => {
    it('should throw error if artist not found', async () => {
      mockArtistRepository.findOne.mockResolvedValue(null);

      await expect(service.getArtistAnalytics('non-existent-id')).rejects.toThrow('Artist not found');
    });

    it('should return detailed artist analytics', async () => {
      mockArtistRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        artistName: 'Test Artist',
      });

      const mockTipQueryBuilder = mockTipRepository.createQueryBuilder();
      mockTipQueryBuilder.getRawOne.mockResolvedValue({
        totalTips: '50',
        totalAmount: '2500',
        averageTipAmount: '50',
        uniqueTippers: '30',
      });

      // For top tippers
      mockTipQueryBuilder.getRawMany.mockResolvedValue([
        { userId: 'user-1', totalAmount: '500', tipCount: '10' },
        { userId: 'user-2', totalAmount: '300', tipCount: '6' },
      ]);

      const result = await service.getArtistAnalytics('artist-1');

      expect(result.artistName).toBe('Test Artist');
      expect(result.totalTips).toBe(50);
      expect(result.totalAmount).toBe(2500);
      expect(result.topTippers).toHaveLength(2);
    });
  });

  describe('exportReport', () => {
    it('should export tips report in JSON format', async () => {
      const mockQueryBuilder = mockTipRepository.createQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { timestamp: new Date(), tipCount: '10', totalAmount: '500', uniqueTippers: '5' },
      ]);

      const result = await service.exportReport('tips', { period: AnalyticsPeriod.WEEK }, 'json');

      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
      expect(result.filename).toContain('tip-trends');
    });

    it('should export artist rankings in CSV format', async () => {
      const mockQueryBuilder = mockArtistRepository.createQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          artistId: 'artist-1',
          artistName: 'Artist One',
          totalAmount: '1000',
          totalTips: '20',
        },
      ]);

      const result = await service.exportReport('artists', { period: AnalyticsPeriod.WEEK }, 'csv');

      expect(result.format).toBe('csv');
      expect(typeof result.data).toBe('string');
      expect(result.filename).toContain('artist-rankings');
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['analytics:summary:1', 'analytics:summary:2']);

      await service.invalidateCache('summary');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('analytics:summary:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('analytics:summary:1', 'analytics:summary:2');
    });
  });

  describe('precomputeAnalytics', () => {
    it('should precompute analytics for all periods', async () => {
      const mockQueryBuilder = mockTipRepository.createQueryBuilder();
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalTips: '100',
        totalAmount: '5000',
        averageTipAmount: '50',
        uniqueTippers: '50',
        uniqueArtists: '20',
      });
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const mockArtistQueryBuilder = mockArtistRepository.createQueryBuilder();
      mockArtistQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.precomputeAnalytics();

      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });
});
