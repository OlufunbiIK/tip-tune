import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PlayCountModule } from './play-count.module';
import { PlayCountService } from './play-count.service';
import { PlaySource } from './entities/track-play.entity';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('PlayCount (e2e)', () => {
  let app: INestApplication;
  const serviceMock = {
    recordPlay: jest.fn(),
    getTrackStats: jest.fn(),
    getArtistOverview: jest.fn(),
    getTrackSources: jest.fn(),
    getTopTracks: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PlayCountModule],
    })
      .overrideProvider(PlayCountService)
      .useValue(serviceMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/plays/record', () => {
    const validBody = {
      trackId: UUID,
      userId: UUID,
      sessionId: 'session-xyz',
      listenDuration: 60,
      completedFull: true,
      source: PlaySource.SEARCH,
    };

    it('returns 200 with a valid body', async () => {
      serviceMock.recordPlay.mockResolvedValue({ counted: true, reason: 'ok', playId: UUID });

      return request(app.getHttpServer())
        .post('/api/plays/record')
        .send(validBody)
        .expect(200)
        .expect({ counted: true, reason: 'ok', playId: UUID });
    });

    it('returns 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/plays/record')
        .send({ trackId: UUID }) // missing many fields
        .expect(400);
    });

    it('returns 400 for invalid trackId (not UUID)', () => {
      return request(app.getHttpServer())
        .post('/api/plays/record')
        .send({ ...validBody, trackId: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 400 for invalid source enum', () => {
      return request(app.getHttpServer())
        .post('/api/plays/record')
        .send({ ...validBody, source: 'invalid_source' })
        .expect(400);
    });

    it('returns 400 for negative listenDuration', () => {
      return request(app.getHttpServer())
        .post('/api/plays/record')
        .send({ ...validBody, listenDuration: -1 })
        .expect(400);
    });
  });

  describe('GET /api/plays/track/:trackId/stats', () => {
    it('returns 200 for valid UUID', async () => {
      serviceMock.getTrackStats.mockResolvedValue({ trackId: UUID, totalPlays: 5 });

      return request(app.getHttpServer())
        .get(`/api/plays/track/${UUID}/stats`)
        .expect(200);
    });

    it('passes period query param', async () => {
      serviceMock.getTrackStats.mockResolvedValue({});

      await request(app.getHttpServer())
        .get(`/api/plays/track/${UUID}/stats?period=30d`)
        .expect(200);

      expect(serviceMock.getTrackStats).toHaveBeenCalledWith(UUID, '30d');
    });

    it('returns 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/api/plays/track/not-a-uuid/stats')
        .expect(400);
    });
  });

  describe('GET /api/plays/artist/:artistId/overview', () => {
    it('returns 200 for valid UUID', async () => {
      serviceMock.getArtistOverview.mockResolvedValue({ artistId: UUID });

      return request(app.getHttpServer())
        .get(`/api/plays/artist/${UUID}/overview`)
        .expect(200);
    });
  });

  describe('GET /api/plays/track/:trackId/sources', () => {
    it('returns 200 for valid UUID', async () => {
      serviceMock.getTrackSources.mockResolvedValue({ trackId: UUID, sources: {} });

      return request(app.getHttpServer())
        .get(`/api/plays/track/${UUID}/sources`)
        .expect(200);
    });
  });

  describe('GET /api/plays/top-tracks', () => {
    it('returns 200', async () => {
      serviceMock.getTopTracks.mockResolvedValue({ period: '7d', tracks: [] });

      return request(app.getHttpServer())
        .get('/api/plays/top-tracks')
        .expect(200);
    });

    it('passes period and limit params', async () => {
      serviceMock.getTopTracks.mockResolvedValue({ period: '14d', tracks: [] });

      await request(app.getHttpServer())
        .get('/api/plays/top-tracks?period=14d&limit=5')
        .expect(200);

      expect(serviceMock.getTopTracks).toHaveBeenCalledWith('14d', 5);
    });
  });
});
