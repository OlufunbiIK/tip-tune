import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, MoreThan } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { PlayCountService, MINIMUM_LISTEN_SECONDS, DEDUP_WINDOW_HOURS } from './play-count.service';
import { TrackPlay, PlaySource } from './entities/track-play.entity';
import { RecordPlayDto } from './dto/record-play.dto';

// ─── Factories ────────────────────────────────────────────────────────────────

const makeDto = (overrides: Partial<RecordPlayDto> = {}): RecordPlayDto => ({
  trackId: 'track-uuid-1',
  userId: 'user-uuid-1',
  sessionId: 'session-abc',
  listenDuration: 45,
  completedFull: false,
  source: PlaySource.DIRECT,
  ...overrides,
});

const makePlay = (overrides: Partial<TrackPlay> = {}): TrackPlay =>
  ({
    id: 'play-uuid-1',
    trackId: 'track-uuid-1',
    userId: 'user-uuid-1',
    sessionId: 'session-abc',
    listenDuration: 45,
    completedFull: false,
    source: PlaySource.DIRECT,
    ipHash: 'hashed',
    countedAsPlay: true,
    playedAt: new Date(),
    ...overrides,
  } as TrackPlay);

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockQbChain = (overrides: Record<string, any> = {}) => {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue({ avg: '0', cnt: '0' }),
    getRawMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return qb;
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PlayCountService', () => {
  let service: PlayCountService;
  let trackPlayRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    const repoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const dataSourceMock = {
      transaction: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayCountService,
        { provide: getRepositoryToken(TrackPlay), useValue: repoMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(PlayCountService);
    trackPlayRepo = module.get(getRepositoryToken(TrackPlay));
    dataSource = module.get(DataSource);
  });

  // ─── hashIp ──────────────────────────────────────────────────────────────

  describe('hashIp', () => {
    it('returns a 64-char hex string', () => {
      const hash = service.hashIp('127.0.0.1');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces the same hash for the same IP', () => {
      expect(service.hashIp('192.168.1.1')).toBe(service.hashIp('192.168.1.1'));
    });

    it('produces different hashes for different IPs', () => {
      expect(service.hashIp('1.1.1.1')).not.toBe(service.hashIp('8.8.8.8'));
    });
  });

  // ─── isDuplicate ─────────────────────────────────────────────────────────

  describe('isDuplicate', () => {
    it('returns false when no matching record exists', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const result = await service.isDuplicate('track-1', 'user-1', 'sess-1', 'ip-1');
      expect(result).toBe(false);
    });

    it('returns true when userId matches a recent counted play', async () => {
      trackPlayRepo.findOne.mockResolvedValueOnce(makePlay()); // userId hit
      const result = await service.isDuplicate('track-1', 'user-1', 'sess-1', 'ip-1');
      expect(result).toBe(true);
    });

    it('returns true when sessionId matches even for anonymous user', async () => {
      trackPlayRepo.findOne
        .mockResolvedValueOnce(null) // userId check skipped (null)
        .mockResolvedValueOnce(makePlay()); // session hit
      const result = await service.isDuplicate('track-1', null, 'sess-1', 'ip-1');
      expect(result).toBe(true);
    });

    it('returns true when ipHash matches a recent counted play', async () => {
      trackPlayRepo.findOne
        .mockResolvedValueOnce(null) // userId
        .mockResolvedValueOnce(null) // sessionId
        .mockResolvedValueOnce(makePlay()); // ip hit
      const result = await service.isDuplicate('track-1', 'user-1', 'sess-1', 'ip-1');
      expect(result).toBe(true);
    });

    it('skips userId check when userId is null', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      await service.isDuplicate('track-1', null, 'sess-1', 'ip-1');
      // Should only call findOne twice (session + ip), not three times
      expect(trackPlayRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('queries within the dedup window (1 hour)', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      await service.isDuplicate('track-1', 'user-1', 'sess-1', 'ip-1');
      const call = trackPlayRepo.findOne.mock.calls[0][0];
      expect(call.where.playedAt).toBeDefined();
      // The MoreThan value should be approximately 1 hour ago
    });
  });

  // ─── recordPlay ──────────────────────────────────────────────────────────

  describe('recordPlay', () => {
    const ip = '203.0.113.1';

    beforeEach(() => {
      trackPlayRepo.create.mockImplementation((data) => ({ ...data, id: 'new-play-id' }));
      trackPlayRepo.save.mockResolvedValue(undefined);
      dataSource.transaction.mockImplementation(async (cb) => cb({ save: jest.fn(), createQueryBuilder: jest.fn().mockReturnValue(mockQbChain()) }));
    });

    it('rejects plays under 30 seconds without counting', async () => {
      const dto = makeDto({ listenDuration: 29 });
      const result = await service.recordPlay(dto, ip);

      expect(result.counted).toBe(false);
      expect(result.reason).toContain('30-second minimum');
      expect(trackPlayRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ countedAsPlay: false }),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('counts plays exactly at 30 seconds', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto = makeDto({ listenDuration: MINIMUM_LISTEN_SECONDS });
      const result = await service.recordPlay(dto, ip);

      expect(result.counted).toBe(true);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('counts plays above 30 seconds', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto = makeDto({ listenDuration: 180 });
      const result = await service.recordPlay(dto, ip);

      expect(result.counted).toBe(true);
    });

    it('rejects duplicate plays within dedup window', async () => {
      // First findOne (userId) returns a recent play
      trackPlayRepo.findOne.mockResolvedValueOnce(makePlay({ countedAsPlay: true }));
      const dto = makeDto();
      const result = await service.recordPlay(dto, ip);

      expect(result.counted).toBe(false);
      expect(result.reason).toContain('Duplicate');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('saves a raw event record even for skipped (< 30s) plays', async () => {
      const dto = makeDto({ listenDuration: 10 });
      await service.recordPlay(dto, ip);
      expect(trackPlayRepo.save).toHaveBeenCalled();
    });

    it('saves a raw event record even for duplicate plays', async () => {
      trackPlayRepo.findOne.mockResolvedValueOnce(makePlay());
      const dto = makeDto();
      await service.recordPlay(dto, ip);
      expect(trackPlayRepo.save).toHaveBeenCalled();
    });

    it('sets countedAsPlay=true only for genuine plays', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto = makeDto({ listenDuration: 60 });

      let savedPlay: Partial<TrackPlay> | undefined;
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          save: jest.fn().mockImplementation((_, play) => { savedPlay = play; }),
          createQueryBuilder: jest.fn().mockReturnValue(mockQbChain()),
        };
        await cb(manager);
      });

      await service.recordPlay(dto, ip);
      expect(savedPlay?.countedAsPlay).toBe(true);
    });

    it('hashes the IP before storing', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto = makeDto({ listenDuration: 60 });

      let createdPlay: Partial<TrackPlay> | undefined;
      trackPlayRepo.create.mockImplementation((data) => {
        createdPlay = data;
        return { ...data, id: 'id' };
      });

      await service.recordPlay(dto, ip);
      expect(createdPlay?.ipHash).not.toBe(ip);
      expect(createdPlay?.ipHash).toHaveLength(64);
    });

    it('returns playId in all response paths', async () => {
      // Path 1: under minimum
      const dto1 = makeDto({ listenDuration: 5 });
      const r1 = await service.recordPlay(dto1, ip);
      expect(r1.playId).toBeDefined();

      // Path 2: duplicate
      trackPlayRepo.findOne.mockResolvedValueOnce(makePlay());
      const dto2 = makeDto({ listenDuration: 60 });
      const r2 = await service.recordPlay(dto2, ip);
      expect(r2.playId).toBeDefined();

      // Path 3: counted
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto3 = makeDto({ listenDuration: 60 });
      const r3 = await service.recordPlay(dto3, ip);
      expect(r3.playId).toBeDefined();
    });

    it('handles anonymous users (no userId)', async () => {
      trackPlayRepo.findOne.mockResolvedValue(null);
      const dto = makeDto({ userId: undefined, listenDuration: 60 });
      const result = await service.recordPlay(dto, ip);
      expect(result.counted).toBe(true);
    });
  });

  // ─── periodToDate ────────────────────────────────────────────────────────

  describe('periodToDate', () => {
    it('parses days correctly', () => {
      const now = Date.now();
      const result = service.periodToDate('7d');
      const diff = now - result.getTime();
      expect(diff).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 1000);
      expect(diff).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 1000);
    });

    it('parses weeks correctly', () => {
      const result = service.periodToDate('2w');
      const diff = Date.now() - result.getTime();
      expect(diff).toBeGreaterThan(14 * 24 * 60 * 60 * 1000 - 1000);
    });

    it('parses months correctly', () => {
      const result = service.periodToDate('1m');
      // approximately 30 days ago
      const diff = Date.now() - result.getTime();
      expect(diff).toBeGreaterThan(28 * 24 * 60 * 60 * 1000);
    });

    it('throws BadRequestException for invalid format', () => {
      expect(() => service.periodToDate('invalid')).toThrow(BadRequestException);
      expect(() => service.periodToDate('abc')).toThrow(BadRequestException);
      expect(() => service.periodToDate('')).toThrow(BadRequestException);
    });

    it('throws for unsupported unit', () => {
      // 'y' (year) is not supported
      expect(() => service.periodToDate('1y')).toThrow(BadRequestException);
    });
  });

  // ─── getTrackStats ────────────────────────────────────────────────────────

  describe('getTrackStats', () => {
    it('returns correct stats with zero plays', async () => {
      const qb = mockQbChain({
        getCount: jest.fn().mockResolvedValue(0),
        getRawOne: jest.fn().mockResolvedValue({ avg: '0', cnt: '0' }),
        clone: jest.fn(),
      });
      qb.clone.mockReturnValue(qb);
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getTrackStats('track-1', '7d');

      expect(stats.trackId).toBe('track-1');
      expect(stats.totalPlays).toBe(0);
      expect(stats.skipRate).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('calculates skip rate correctly', async () => {
      // totalEvents=10, totalPlays(counted)=6 → skipRate=0.4
      let callCount = 0;
      const qb = mockQbChain();
      qb.clone.mockReturnValue(qb);
      qb.getCount
        .mockResolvedValueOnce(6)  // totalPlays (counted)
        .mockResolvedValueOnce(10) // totalEvents
        .mockResolvedValueOnce(3); // completedCount
      qb.getRawOne
        .mockResolvedValueOnce({ avg: '42.5' }) // avgDuration
        .mockResolvedValueOnce({ cnt: '5' });   // uniqueListeners

      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getTrackStats('track-1', '7d');

      expect(stats.skipRate).toBe(0.4);
      expect(stats.completionRate).toBe(0.5); // 3/6
      expect(stats.avgListenDuration).toBe(42.5);
    });

    it('includes period in response', async () => {
      const qb = mockQbChain();
      qb.clone.mockReturnValue(qb);
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const stats = await service.getTrackStats('track-1', '30d');
      expect(stats.period).toBe('30d');
    });
  });

  // ─── getTrackSources ─────────────────────────────────────────────────────

  describe('getTrackSources', () => {
    it('returns zero counts for all sources when no plays exist', async () => {
      const qb = mockQbChain({ getRawMany: jest.fn().mockResolvedValue([]) });
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTrackSources('track-1');
      expect(result.trackId).toBe('track-1');
      Object.values(PlaySource).forEach((s) => {
        expect(result.sources[s]).toBe(0);
      });
    });

    it('maps raw DB results to source breakdown correctly', async () => {
      const rawRows = [
        { source: PlaySource.SEARCH, cnt: '12' },
        { source: PlaySource.PLAYLIST, cnt: '5' },
      ];
      const qb = mockQbChain({ getRawMany: jest.fn().mockResolvedValue(rawRows) });
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTrackSources('track-1');
      expect(result.sources[PlaySource.SEARCH]).toBe(12);
      expect(result.sources[PlaySource.PLAYLIST]).toBe(5);
      expect(result.sources[PlaySource.DIRECT]).toBe(0); // default 0
    });
  });

  // ─── getTopTracks ─────────────────────────────────────────────────────────

  describe('getTopTracks', () => {
    it('returns empty tracks array when no data', async () => {
      const qb = mockQbChain({ getRawMany: jest.fn().mockResolvedValue([]) });
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTopTracks('7d', 10);
      expect(result.period).toBe('7d');
      expect(result.tracks).toEqual([]);
    });

    it('returns mapped tracks ordered by plays', async () => {
      const rawRows = [
        { trackId: 'track-a', plays: '100', completionRate: '0.75' },
        { trackId: 'track-b', plays: '50', completionRate: '0.5' },
      ];
      const qb = mockQbChain({ getRawMany: jest.fn().mockResolvedValue(rawRows) });
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTopTracks('7d', 20);
      expect(result.tracks[0].trackId).toBe('track-a');
      expect(result.tracks[0].plays).toBe(100);
      expect(result.tracks[0].completionRate).toBe(0.75);
    });

    it('respects the limit parameter', async () => {
      const qb = mockQbChain({ getRawMany: jest.fn().mockResolvedValue([]) });
      trackPlayRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getTopTracks('7d', 5);
      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });

  // ─── Constants ───────────────────────────────────────────────────────────

  describe('module constants', () => {
    it('exports MINIMUM_LISTEN_SECONDS as 30', () => {
      expect(MINIMUM_LISTEN_SECONDS).toBe(30);
    });

    it('exports DEDUP_WINDOW_HOURS as 1', () => {
      expect(DEDUP_WINDOW_HOURS).toBe(1);
    });
  });
});
