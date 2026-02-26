/**
 * play-count.dedup.spec.ts
 *
 * Focused suite for deduplication logic as required by the acceptance criteria.
 * These tests verify that play count gaming is prevented across all three
 * deduplication axes: userId, sessionId, and ipHash.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PlayCountService,
  MINIMUM_LISTEN_SECONDS,
  DEDUP_WINDOW_HOURS,
} from './play-count.service';
import { TrackPlay, PlaySource } from './entities/track-play.entity';

const TRACK_ID = 'track-aaa';
const USER_ID = 'user-bbb';
const SESSION_ID = 'session-ccc';
const IP_HASH = 'a'.repeat(64);

const recentPlay = (overrides: Partial<TrackPlay> = {}): TrackPlay =>
  ({
    id: 'play-id',
    trackId: TRACK_ID,
    userId: USER_ID,
    sessionId: SESSION_ID,
    listenDuration: 60,
    completedFull: false,
    source: PlaySource.DIRECT,
    ipHash: IP_HASH,
    countedAsPlay: true,
    playedAt: new Date(), // within last hour
    ...overrides,
  } as TrackPlay);

describe('PlayCountService — Deduplication', () => {
  let service: PlayCountService;
  let repoMock: jest.Mocked<any>;
  let dataSourceMock: jest.Mocked<any>;

  const txManager = {
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    }),
  };

  beforeEach(async () => {
    repoMock = {
      create: jest.fn().mockImplementation((d) => ({ ...d, id: 'new-id' })),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
    };
    dataSourceMock = {
      transaction: jest.fn().mockImplementation(async (cb) => cb(txManager)),
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
    jest.clearAllMocks();
    repoMock.create.mockImplementation((d) => ({ ...d, id: 'new-id' }));
    repoMock.save.mockResolvedValue(undefined);
    dataSourceMock.transaction.mockImplementation(async (cb) => cb(txManager));
    txManager.save.mockResolvedValue(undefined);
  });

  // ─── 30-second minimum ────────────────────────────────────────────────────

  describe('30-second minimum enforcement', () => {
    it.each([0, 1, 10, 15, 29])(
      'does NOT count a %ds play',
      async (duration) => {
        const result = await service.recordPlay(
          {
            trackId: TRACK_ID,
            userId: USER_ID,
            sessionId: SESSION_ID,
            listenDuration: duration,
            completedFull: false,
            source: PlaySource.DIRECT,
          },
          '1.2.3.4',
        );
        expect(result.counted).toBe(false);
        expect(dataSourceMock.transaction).not.toHaveBeenCalled();
      },
    );

    it.each([30, 31, 60, 180, 300])(
      'COUNTS a %ds play when not a duplicate',
      async (duration) => {
        repoMock.findOne.mockResolvedValue(null);
        const result = await service.recordPlay(
          {
            trackId: TRACK_ID,
            userId: USER_ID,
            sessionId: SESSION_ID,
            listenDuration: duration,
            completedFull: false,
            source: PlaySource.DIRECT,
          },
          '1.2.3.4',
        );
        expect(result.counted).toBe(true);
      },
    );
  });

  // ─── userId deduplication ─────────────────────────────────────────────────

  describe('userId-based deduplication', () => {
    it('blocks re-count when same user replays within 1 hour', async () => {
      repoMock.findOne.mockResolvedValueOnce(recentPlay()); // userId match

      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: 'different-session',
          listenDuration: 60,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '9.9.9.9',
      );

      expect(result.counted).toBe(false);
      expect(result.reason).toMatch(/duplicate/i);
    });

    it('allows re-count for different user', async () => {
      repoMock.findOne.mockResolvedValue(null);

      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: 'different-user-id',
          sessionId: SESSION_ID,
          listenDuration: 60,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '1.2.3.4',
      );

      expect(result.counted).toBe(true);
    });
  });

  // ─── sessionId deduplication ─────────────────────────────────────────────

  describe('sessionId-based deduplication (anonymous users)', () => {
    it('blocks re-count when same session replays within 1 hour', async () => {
      // No userId provided, session match
      repoMock.findOne
        .mockResolvedValueOnce(null)      // userId skipped (null → skips first call)
        .mockResolvedValueOnce(recentPlay()); // session match

      const result = await service.isDuplicate(TRACK_ID, null, SESSION_ID, IP_HASH);
      expect(result).toBe(true);
    });

    it('counts anonymous play when no session match', async () => {
      repoMock.findOne.mockResolvedValue(null);

      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          sessionId: 'brand-new-session',
          listenDuration: 60,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '5.5.5.5',
      );

      expect(result.counted).toBe(true);
    });

    it('deduplicates across session even for authenticated users', async () => {
      repoMock.findOne
        .mockResolvedValueOnce(null)       // userId miss
        .mockResolvedValueOnce(recentPlay()); // session hit

      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 45,
          completedFull: false,
          source: PlaySource.SEARCH,
        },
        '2.2.2.2',
      );

      expect(result.counted).toBe(false);
    });
  });

  // ─── IP-hash deduplication ────────────────────────────────────────────────

  describe('ipHash-based deduplication', () => {
    it('blocks re-count when same IP replays even with new session', async () => {
      repoMock.findOne
        .mockResolvedValueOnce(null) // userId miss
        .mockResolvedValueOnce(null) // sessionId miss
        .mockResolvedValueOnce(recentPlay()); // ip match

      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: 'fresh-session',
          listenDuration: 60,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '1.2.3.4',
      );

      expect(result.counted).toBe(false);
    });
  });

  // ─── Dedup window boundary ────────────────────────────────────────────────

  describe('1-hour deduplication window', () => {
    it('isDuplicate queries with MoreThan timestamp approximately 1 hour ago', async () => {
      const beforeCall = Date.now();
      repoMock.findOne.mockResolvedValue(null);

      await service.isDuplicate(TRACK_ID, USER_ID, SESSION_ID, IP_HASH);

      const call = repoMock.findOne.mock.calls[0][0];
      const windowStart: Date = call.where.playedAt.value;

      const expectedMs = DEDUP_WINDOW_HOURS * 60 * 60 * 1000;
      const actualDiff = beforeCall - windowStart.getTime();

      // Allow ±2 seconds tolerance
      expect(actualDiff).toBeGreaterThanOrEqual(expectedMs - 2000);
      expect(actualDiff).toBeLessThanOrEqual(expectedMs + 2000);
    });

    it('does not block plays when the duplicate is outside the 1-hour window', async () => {
      // Simulates: existing play was >1h ago → should NOT block
      repoMock.findOne.mockResolvedValue(null); // findOne returns null = no recent dup

      const result = await service.isDuplicate(TRACK_ID, USER_ID, SESSION_ID, IP_HASH);
      expect(result).toBe(false);
    });
  });

  // ─── countedAsPlay flag ───────────────────────────────────────────────────

  describe('countedAsPlay integrity', () => {
    it('only queries for plays where countedAsPlay = true in dedup check', async () => {
      repoMock.findOne.mockResolvedValue(null);
      await service.isDuplicate(TRACK_ID, USER_ID, SESSION_ID, IP_HASH);

      repoMock.findOne.mock.calls.forEach((call) => {
        expect(call[0].where.countedAsPlay).toBe(true);
      });
    });

    it('persists raw skipped events with countedAsPlay = false', async () => {
      const result = await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 5, // skip
          completedFull: false,
          source: PlaySource.TIP_FEED,
        },
        '3.3.3.3',
      );

      expect(result.counted).toBe(false);
      expect(repoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ countedAsPlay: false }),
      );
    });

    it('persists duplicate raw events with countedAsPlay = false', async () => {
      repoMock.findOne.mockResolvedValueOnce(recentPlay());

      await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 60,
          completedFull: true,
          source: PlaySource.PLAYLIST,
        },
        '4.4.4.4',
      );

      expect(repoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({ countedAsPlay: false }),
      );
    });
  });

  // ─── Track.plays increment ───────────────────────────────────────────────

  describe('Track.plays update', () => {
    it('increments Track.plays inside a transaction on genuine play', async () => {
      repoMock.findOne.mockResolvedValue(null);

      await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 90,
          completedFull: true,
          source: PlaySource.ARTIST_PROFILE,
        },
        '6.7.8.9',
      );

      expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
    });

    it('does NOT increment Track.plays for skipped plays', async () => {
      await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 10,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '1.1.1.1',
      );

      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('does NOT increment Track.plays for duplicate plays', async () => {
      repoMock.findOne.mockResolvedValueOnce(recentPlay());

      await service.recordPlay(
        {
          trackId: TRACK_ID,
          userId: USER_ID,
          sessionId: SESSION_ID,
          listenDuration: 60,
          completedFull: false,
          source: PlaySource.DIRECT,
        },
        '1.1.1.1',
      );

      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });
  });
});
