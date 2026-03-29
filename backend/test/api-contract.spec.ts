import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { testFixtures } from './fixtures/test-data';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { TracksController } from '../src/tracks/tracks.controller';
import { TracksService } from '../src/tracks/tracks.service';
import { TipsController } from '../src/tips/tips.controller';
import { TipsService } from '../src/tips/tips.service';
import { SearchController } from '../src/search/search.controller';
import { SearchService } from '../src/search/search.service';
import { ArtistStatusController } from '../src/artist-status/artist-status.controller';
import { ArtistStatusService } from '../src/artist-status/artist-status.service';
import { ReportsController } from '../src/reports/reports.controller';
import { ReportsService } from '../src/reports/reports.service';
import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { ModerateMessagePipe } from '../src/moderation/pipes/moderate-message.pipe';
import { Reflector } from '@nestjs/core';
import {
  ReportStatus,
  ReportAction,
} from '../src/reports/entities/report.entity';

const { users, artists, tracks } = testFixtures;

/**
 * Contract Tests - Mock-based API contract validation
 * 
 * These tests validate the shape and behavior of API endpoints
 * using mocked services. They ensure API contracts remain stable
 * without requiring full application wiring or database setup.
 * 
 * Run with: npm run test:contract
 */

describe('API Contract Tests', () => {
  let app: INestApplication;
  let mockAuthService: ReturnType<typeof buildMockAuthService>;
  let mockTracksService: ReturnType<typeof buildMockTracksService>;
  let mockTipsService: ReturnType<typeof buildMockTipsService>;
  let mockSearchService: ReturnType<typeof buildMockSearchService>;
  let mockArtistStatusService: ReturnType<typeof buildMockArtistStatusService>;
  let mockReportsService: ReturnType<typeof buildMockReportsService>;
  let mockNotificationsService: ReturnType<typeof buildMockNotificationsService>;

  function buildMockAuthService() {
    const challengeStore = new Map<string, { publicKey: string; challenge: string; expiresAt: Date }>();
    const tokenStore = new Map<string, string>();

    return {
      generateChallenge: jest.fn(async (publicKey: string) => {
        if (!publicKey || !publicKey.startsWith('G') || publicKey.length < 56) {
          throw new (require('@nestjs/common').BadRequestException)('Invalid public key format');
        }
        const challengeId = 'challenge-' + Date.now();
        const challenge = 'Sign this message: ' + challengeId;
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        challengeStore.set(challengeId, { publicKey, challenge, expiresAt });
        return { challengeId, challenge, expiresAt };
      }),

      verifySignature: jest.fn(async (dto: any) => {
        const stored = challengeStore.get(dto.challengeId);
        if (!stored || stored.publicKey !== dto.publicKey) {
          throw new (require('@nestjs/common').UnauthorizedException)('Invalid challenge');
        }
        const accessToken = 'mock-access-token-' + Date.now();
        const refreshToken = 'mock-refresh-token-' + Date.now();
        tokenStore.set(refreshToken, users.listener.id);
        return {
          accessToken,
          refreshToken,
          user: { id: users.listener.id, walletAddress: dto.publicKey },
        };
      }),

      refreshAccessToken: jest.fn(async (refreshToken: string) => {
        if (!tokenStore.has(refreshToken)) {
          throw new (require('@nestjs/common').UnauthorizedException)('Invalid refresh token');
        }
        return { accessToken: 'mock-refreshed-token-' + Date.now() };
      }),

      getCurrentUser: jest.fn(async (userId: string) => {
        if (userId === users.listener.id) return users.listener;
        if (userId === users.artist.id) return users.artist;
        if (userId === users.admin.id) return users.admin;
        throw new (require('@nestjs/common').NotFoundException)('User not found');
      }),

      logout: jest.fn(async () => undefined),
    };
  }

  function buildMockTracksService() {
    const trackStore: any[] = [];

    return {
      create: jest.fn(async (dto: any) => {
        const track = {
          id: tracks.sample.id,
          ...dto,
          artistId: dto.artistId || artists.sample.id,
          playCount: 0,
          totalTips: '0',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        trackStore.push(track);
        return track;
      }),

      findOne: jest.fn(async (id: string) => {
        const found = trackStore.find((t) => t.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Track not found');
        }
        return found;
      }),

      findAll: jest.fn(async () => ({
        data: trackStore,
        total: trackStore.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      })),

      findPublic: jest.fn(async () => ({
        data: trackStore.filter((t) => t.isPublic),
        total: trackStore.filter((t) => t.isPublic).length,
        page: 1,
        limit: 10,
        totalPages: 1,
      })),

      search: jest.fn(async (query: string) => {
        const matches = trackStore.filter(
          (t) =>
            t.title?.toLowerCase().includes(query.toLowerCase()) ||
            t.genre?.toLowerCase().includes(query.toLowerCase()),
        );
        return {
          data: matches,
          total: matches.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
      }),

      findByArtist: jest.fn(async (artistId: string) => {
        const matches = trackStore.filter((t) => t.artistId === artistId);
        return {
          data: matches,
          total: matches.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
      }),

      findByGenre: jest.fn(async (genre: string) => {
        const matches = trackStore.filter((t) => t.genre === genre);
        return {
          data: matches,
          total: matches.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
      }),

      update: jest.fn(async (id: string, dto: any) => {
        const found = trackStore.find((t) => t.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Track not found');
        }
        Object.assign(found, dto, { updatedAt: new Date() });
        return found;
      }),

      incrementPlayCount: jest.fn(async (id: string) => {
        const found = trackStore.find((t) => t.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Track not found');
        }
        found.playCount += 1;
        return found;
      }),

      addTips: jest.fn(async (id: string, amount: number) => {
        const found = trackStore.find((t) => t.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Track not found');
        }
        found.totalTips = String(Number(found.totalTips) + amount);
        return found;
      }),

      remove: jest.fn(async () => undefined),
      _store: trackStore,
    };
  }

  function buildMockTipsService() {
    const tipStore: any[] = [];

    return {
      create: jest.fn(async (userId: string, dto: any) => {
        const tip = {
          id: '880e8400-e29b-41d4-a716-446655440001',
          ...dto,
          userId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        tipStore.push(tip);
        return tip;
      }),

      findOne: jest.fn(async (id: string) => {
        const found = tipStore.find((t) => t.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Tip not found');
        }
        return found;
      }),

      getUserTipHistory: jest.fn(async (userId: string) => ({
        data: tipStore.filter((t) => t.userId === userId),
        meta: { total: tipStore.length, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      })),

      getArtistReceivedTips: jest.fn(async (artistId: string) => ({
        data: tipStore.filter((t) => t.artistId === artistId),
        meta: { total: tipStore.length, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      })),

      getArtistTipStats: jest.fn(async () => ({
        totalReceived: '1.0',
        totalCount: 1,
        averageAmount: '1.0',
      })),

      _store: tipStore,
    };
  }

  function buildMockSearchService() {
    return {
      search: jest.fn(async (dto: any) => {
        if (dto.type === 'track') {
          return {
            tracks: {
              data: [tracks.sample],
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          };
        }
        if (dto.type === 'artist') {
          return {
            artists: {
              data: [artists.sample],
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          };
        }
        return {
          artists: {
            data: [artists.sample],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
          tracks: {
            data: [tracks.sample],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        };
      }),

      getSuggestions: jest.fn(async () => ({
        artists: [{ type: 'artist', id: artists.sample.id, title: artists.sample.artistName }],
        tracks: [{ type: 'track', id: tracks.sample.id, title: tracks.sample.title }],
      })),
    };
  }

  function buildMockArtistStatusService() {
    const statusStore = new Map<string, any>();
    const historyStore: any[] = [];

    return {
      setStatus: jest.fn(async (artistId: string, dto: any) => {
        const status = {
          id: '990e8400-e29b-41d4-a716-446655440001',
          artistId,
          statusType: dto.statusType,
          statusMessage: dto.statusMessage || null,
          emoji: dto.emoji || null,
          showOnProfile: dto.showOnProfile !== undefined ? dto.showOnProfile : true,
          autoResetAt: dto.autoResetAt || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        statusStore.set(artistId, status);
        historyStore.push({ ...status, changedAt: new Date() });
        return status;
      }),

      getStatus: jest.fn(async (artistId: string) => {
        const status = statusStore.get(artistId);
        if (!status) {
          throw new (require('@nestjs/common').NotFoundException)('Status not found');
        }
        return status;
      }),

      clearStatus: jest.fn(async (artistId: string) => {
        if (!statusStore.has(artistId)) {
          throw new (require('@nestjs/common').NotFoundException)('Status not found');
        }
        statusStore.delete(artistId);
      }),

      getStatusHistory: jest.fn(async () => historyStore),
      _statusStore: statusStore,
      _historyStore: historyStore,
    };
  }

  function buildMockReportsService() {
    const reportStore: any[] = [];

    return {
      create: jest.fn(async (dto: any, user: any) => {
        const report = {
          id: 'aa0e8400-e29b-41d4-a716-446655440001',
          ...dto,
          reportedBy: user,
          reportedById: user.id,
          status: ReportStatus.PENDING,
          action: ReportAction.NONE,
          reviewedBy: null,
          reviewedById: null,
          reviewNotes: null,
          reviewedAt: null,
          createdAt: new Date(),
        };
        reportStore.push(report);
        return report;
      }),

      findAll: jest.fn(async () => reportStore),

      findOne: jest.fn(async (id: string) => {
        const found = reportStore.find((r) => r.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Report not found');
        }
        return found;
      }),

      updateStatus: jest.fn(async (id: string, updateDto: any, admin: any) => {
        const found = reportStore.find((r) => r.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Report not found');
        }
        found.status = updateDto.status;
        found.action = updateDto.action || ReportAction.NONE;
        found.reviewNotes = updateDto.reviewNotes || null;
        found.reviewedBy = admin;
        found.reviewedById = admin.id;
        found.reviewedAt = new Date();
        return found;
      }),

      _store: reportStore,
    };
  }

  function buildMockNotificationsService() {
    const notificationStore: any[] = [];

    return {
      getUserNotifications: jest.fn(async (userId: string) => ({
        data: notificationStore.filter((n) => n.userId === userId),
        total: notificationStore.filter((n) => n.userId === userId).length,
      })),

      getUnreadCount: jest.fn(async (userId: string) => ({
        count: notificationStore.filter((n) => n.userId === userId && !n.isRead).length,
      })),

      markAsRead: jest.fn(async (id: string) => {
        const found = notificationStore.find((n) => n.id === id);
        if (!found) {
          throw new (require('@nestjs/common').NotFoundException)('Notification not found');
        }
        found.isRead = true;
        return found;
      }),

      markAllAsRead: jest.fn(async (userId: string) => {
        notificationStore
          .filter((n) => n.userId === userId)
          .forEach((n) => { n.isRead = true; });
        return { updated: notificationStore.filter((n) => n.userId === userId).length };
      }),

      create: jest.fn(async (dto: any) => {
        const notification = {
          id: 'bb0e8400-e29b-41d4-a716-446655440001',
          ...dto,
          isRead: false,
          createdAt: new Date(),
        };
        notificationStore.push(notification);
        return notification;
      }),

      _store: notificationStore,
    };
  }

  beforeAll(async () => {
    mockAuthService = buildMockAuthService();
    mockTracksService = buildMockTracksService();
    mockTipsService = buildMockTipsService();
    mockSearchService = buildMockSearchService();
    mockArtistStatusService = buildMockArtistStatusService();
    mockReportsService = buildMockReportsService();
    mockNotificationsService = buildMockNotificationsService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        TracksController,
        TipsController,
        SearchController,
        ArtistStatusController,
        ReportsController,
        NotificationsController,
      ],
      providers: [
        Reflector,
        { provide: AuthService, useValue: mockAuthService },
        { provide: TracksService, useValue: mockTracksService },
        { provide: TipsService, useValue: mockTipsService },
        { provide: SearchService, useValue: mockSearchService },
        { provide: ArtistStatusService, useValue: mockArtistStatusService },
        { provide: ReportsService, useValue: mockReportsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: users.listener.id, userId: users.listener.id, role: users.listener.role };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overridePipe(ModerateMessagePipe)
      .useValue({ transform: (value: any) => value })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth API Contract', () => {
    let challengeId: string;
    let accessToken: string;
    const publicKey = users.listener.walletAddress;

    it('POST /auth/challenge - should return challenge contract', () => {
      return request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ publicKey })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('challengeId');
          expect(res.body).toHaveProperty('challenge');
          expect(res.body).toHaveProperty('expiresAt');
          expect(typeof res.body.challengeId).toBe('string');
          expect(typeof res.body.challenge).toBe('string');
          expect(res.body.expiresAt).toBeInstanceOf(Date);
          challengeId = res.body.challengeId;
        });
    });

    it('POST /auth/challenge - should validate input contract', () => {
      return request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ publicKey: 'invalid' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Invalid public key format');
        });
    });

    it('POST /auth/verify - should return token contract', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .send({ challengeId, publicKey, signature: 'mock-sig' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(typeof res.body.accessToken).toBe('string');
          expect(typeof res.body.refreshToken).toBe('string');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('walletAddress');
          accessToken = res.body.accessToken;
          // refreshToken stored for potential refresh token tests
        });
    });

    it('GET /auth/me - should return user contract', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('role');
          expect(res.body).toHaveProperty('walletAddress');
        });
    });
  });

  describe('Tracks API Contract', () => {
    const trackDto = {
      title: tracks.sample.title,
      genre: tracks.sample.genre,
      description: tracks.sample.description,
    };

    it('POST /tracks - should create track contract', () => {
      return request(app.getHttpServer())
        .post('/tracks')
        .send(trackDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('genre');
          expect(res.body).toHaveProperty('description');
          expect(res.body).toHaveProperty('artistId');
          expect(res.body).toHaveProperty('playCount');
          expect(res.body).toHaveProperty('isPublic');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          expect(res.body.title).toBe(trackDto.title);
          expect(res.body.genre).toBe(trackDto.genre);
        });
    });

    it('GET /tracks/:id - should return track contract', () => {
      return request(app.getHttpServer())
        .get(`/tracks/${tracks.sample.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('title');
          expect(res.body).toHaveProperty('genre');
          expect(res.body).toHaveProperty('artist');
          expect(res.body.artist).toHaveProperty('id');
          expect(res.body.artist).toHaveProperty('artistName');
        });
    });

    it('GET /tracks - should return paginated tracks contract', () => {
      return request(app.getHttpServer())
        .get('/tracks')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(typeof res.body.total).toBe('number');
        });
    });
  });

  describe('Search API Contract', () => {
    it('GET /search - should return search results contract', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ q: 'Test' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('artists');
          expect(res.body).toHaveProperty('tracks');
          expect(res.body.artists).toHaveProperty('data');
          expect(res.body.artists).toHaveProperty('total');
          expect(res.body.tracks).toHaveProperty('data');
          expect(res.body.tracks).toHaveProperty('total');
        });
    });

    it('GET /search - should filter by type contract', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ q: 'Test', type: 'track' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tracks');
          expect(res.body.tracks).toHaveProperty('data');
          expect(Array.isArray(res.body.tracks.data)).toBe(true);
        });
    });
  });

  describe('Tips API Contract', () => {
    const tipDto = {
      artistId: artists.sample.id,
      stellarTxHash: 'c6e0b3e5c8a4f2d1b9a7e6f3c5d8a2b1c4e7f0a9b3d6e9f2c5a8b1e4f7a0c3d6',
      message: 'Great track!',
    };

    it('POST /tips - should create tip contract', () => {
      return request(app.getHttpServer())
        .post('/tips')
        .set('x-user-id', users.listener.id)
        .send(tipDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('artistId');
          expect(res.body).toHaveProperty('stellarTxHash');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body.artistId).toBe(tipDto.artistId);
          expect(res.body.stellarTxHash).toBe(tipDto.stellarTxHash);
        });
    });

    it('GET /tips/artist/:id/received - should return artist tips contract', () => {
      return request(app.getHttpServer())
        .get(`/tips/artist/${artists.sample.id}/received`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
