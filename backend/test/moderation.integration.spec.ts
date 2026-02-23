import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModerationService } from '../src/moderation/moderation.service';
import { MessageFilterService } from '../src/moderation/message-filter.service';
import { MessageModerationLog, ModerationResult, ReviewAction } from '../src/moderation/entities/message-moderation-log.entity';
import { BlockedKeyword, KeywordSeverity } from '../src/moderation/entities/blocked-keyword.entity';
import { Artist } from '../src/artists/entities/artist.entity';
import { User } from '../src/users/entities/user.entity';
import { Tip } from '../src/tips/entities/tip.entity';

describe('ModerationService (integration-ish)', () => {
  let service: ModerationService;

  const moderationLogs: MessageModerationLog[] = [];
  const blockedKeywords: BlockedKeyword[] = [];
  const artists: Artist[] = [];

  const mockModerationLogRepo = {
    create: jest.fn((data) => ({
      id: 'log-id',
      createdAt: new Date(),
      ...data,
    })),
    save: jest.fn(async (log: MessageModerationLog) => {
      moderationLogs.push(log);
      return log;
    }),
    findOne: jest.fn(async ({ where }: any) => {
      return moderationLogs.find((l) => l.id === where.id) || null;
    }),
  };

  const mockBlockedKeywordRepo = {
    find: jest.fn(async (options?: any) => {
      if (!options || !options.where || options.where.artistId === undefined) {
        return blockedKeywords;
      }
      if (options.where.artistId === null) {
        return blockedKeywords.filter((k) => !k.artistId);
      }
      return blockedKeywords.filter((k) => k.artistId === options.where.artistId);
    }),
    create: jest.fn((data) => ({
      id: 'keyword-id',
      createdAt: new Date(),
      ...data,
    })),
    save: jest.fn(async (kw: BlockedKeyword) => {
      blockedKeywords.push(kw);
      return kw;
    }),
    delete: jest.fn(async () => {}),
  };

  const mockArtistRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      if (where.id) {
        return artists.find((a) => a.id === where.id) || null;
      }
      if (where.userId) {
        return artists.find((a: any) => a.userId === where.userId) || null;
      }
      return null;
    }),
  };

  const mockUserRepo = {};

  beforeEach(async () => {
    moderationLogs.length = 0;
    blockedKeywords.length = 0;
    artists.length = 0;

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        MessageFilterService,
        {
          provide: getRepositoryToken(MessageModerationLog),
          useValue: mockModerationLogRepo,
        },
        {
          provide: getRepositoryToken(BlockedKeyword),
          useValue: mockBlockedKeywordRepo,
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: mockArtistRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  function createTip(message: string): Tip {
    return {
      id: 'tip-id',
      artistId: 'artist-user-id',
      trackId: null,
      stellarTxHash: 'hash',
      senderAddress: 'sender',
      receiverAddress: 'receiver',
      amount: 10,
      assetCode: 'XLM',
      assetIssuer: null,
      assetType: 'native',
      message,
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
  }

  it('blocks high severity keyword and hides message', async () => {
    blockedKeywords.push({
      id: 'kw1',
      keyword: 'scam',
      severity: KeywordSeverity.HIGH,
      addedById: 'admin-id',
      addedBy: null as any,
      artistId: null,
      artist: null as any,
      createdAt: new Date(),
    });

    const tip = createTip('this is a scam message');

    const log = await service.moderateTipMessage(tip, null);

    expect(log).toBeDefined();
    expect(log.moderationResult).toBe(ModerationResult.BLOCKED);
    expect(tip.message).toBeNull();
    expect(moderationLogs.length).toBe(1);
  });

  it('flags medium severity keyword and queues for review', async () => {
    blockedKeywords.push({
      id: 'kw2',
      keyword: 'spammy',
      severity: KeywordSeverity.MEDIUM,
      addedById: 'admin-id',
      addedBy: null as any,
      artistId: null,
      artist: null as any,
      createdAt: new Date(),
    });

    const tip = createTip('this has spammy content');

    const log = await service.moderateTipMessage(tip, null);

    expect(log.moderationResult).toBe(ModerationResult.FLAGGED);
    expect(tip.message).toBeNull();
    expect(log.wasManuallyReviewed).toBe(false);
  });

  it('uses artist-specific keywords when artist user id is provided', async () => {
    artists.push({
      id: 'artist-id',
      userId: 'artist-user-id',
      user: null as any,
      tracks: [],
      tips: [],
      artistName: 'Artist',
      genre: 'Pop',
      bio: '',
      profileImage: null,
      coverImage: null,
      walletAddress: 'wallet',
      isVerified: false,
      totalTipsReceived: '0',
      emailNotifications: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    blockedKeywords.push({
      id: 'kw3',
      keyword: 'secret',
      severity: KeywordSeverity.HIGH,
      addedById: 'artist-user-id',
      addedBy: null as any,
      artistId: 'artist-id',
      artist: null as any,
      createdAt: new Date(),
    });

    const tip = createTip('this contains a secret');

    const log = await service.moderateTipMessage(tip, 'artist-user-id');

    expect(log.moderationResult).toBe(ModerationResult.BLOCKED);
    expect(tip.message).toBeNull();
  });

  it('applies admin review actions to tip visibility', async () => {
    blockedKeywords.push({
      id: 'kw4',
      keyword: 'flagme',
      severity: KeywordSeverity.MEDIUM,
      addedById: 'admin-id',
      addedBy: null as any,
      artistId: null,
      artist: null as any,
      createdAt: new Date(),
    });

    const tip = createTip('please flagme');

    const log = await service.moderateTipMessage(tip, null);

    moderationLogs[0] = { ...log, tip };

    const admin: User = {
      id: 'admin-id',
      username: 'admin',
      email: 'admin@example.com',
      walletAddress: 'wallet',
      role: null as any,
      status: null as any,
      profileImage: null,
      bio: null,
      isArtist: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const reviewed = await service.reviewModerationLog(log.id, ReviewAction.APPROVE, admin);

    expect(reviewed.moderationResult).toBe(ModerationResult.APPROVED);
    expect(reviewed.wasManuallyReviewed).toBe(true);
    expect(tip.message).toBe(log.originalMessage);
  });
});

