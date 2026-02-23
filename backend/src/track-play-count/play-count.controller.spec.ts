import { Test, TestingModule } from '@nestjs/testing';
import { PlayCountController } from './play-count.controller';
import { PlayCountService } from './play-count.service';
import { RecordPlayDto } from './dto/record-play.dto';
import { PlaySource } from './entities/track-play.entity';

const mockService = {
  recordPlay: jest.fn(),
  getTrackStats: jest.fn(),
  getArtistOverview: jest.fn(),
  getTrackSources: jest.fn(),
  getTopTracks: jest.fn(),
};

const mockRequest = (ip = '127.0.0.1', forwardedFor?: string): any => ({
  headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  socket: { remoteAddress: ip },
});

describe('PlayCountController', () => {
  let controller: PlayCountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayCountController],
      providers: [{ provide: PlayCountService, useValue: mockService }],
    }).compile();

    controller = module.get(PlayCountController);
    jest.clearAllMocks();
  });

  // ─── POST /api/plays/record ─────────────────────────────────────────────

  describe('recordPlay', () => {
    const dto: RecordPlayDto = {
      trackId: 'track-uuid',
      userId: 'user-uuid',
      sessionId: 'sess-1',
      listenDuration: 60,
      completedFull: true,
      source: PlaySource.SEARCH,
    };

    it('calls service with dto and extracted IP', async () => {
      mockService.recordPlay.mockResolvedValue({ counted: true, reason: 'ok' });
      const req = mockRequest('10.0.0.1');

      await controller.recordPlay(dto, req);
      expect(mockService.recordPlay).toHaveBeenCalledWith(dto, '10.0.0.1');
    });

    it('prefers x-forwarded-for header over socket IP', async () => {
      mockService.recordPlay.mockResolvedValue({ counted: true, reason: 'ok' });
      const req = mockRequest('10.0.0.1', '203.0.113.1, 10.0.0.1');

      await controller.recordPlay(dto, req);
      expect(mockService.recordPlay).toHaveBeenCalledWith(dto, '203.0.113.1');
    });

    it('falls back to 0.0.0.0 if no IP available', async () => {
      mockService.recordPlay.mockResolvedValue({ counted: true, reason: 'ok' });
      const req: any = { headers: {}, socket: {} };

      await controller.recordPlay(dto, req);
      expect(mockService.recordPlay).toHaveBeenCalledWith(dto, '0.0.0.0');
    });

    it('returns service response', async () => {
      const serviceResponse = { counted: false, reason: 'duplicate', playId: 'x' };
      mockService.recordPlay.mockResolvedValue(serviceResponse);

      const result = await controller.recordPlay(dto, mockRequest());
      expect(result).toEqual(serviceResponse);
    });
  });

  // ─── GET /api/plays/track/:trackId/stats ────────────────────────────────

  describe('getTrackStats', () => {
    it('calls service with correct params', async () => {
      mockService.getTrackStats.mockResolvedValue({});
      await controller.getTrackStats('track-uuid', '30d');
      expect(mockService.getTrackStats).toHaveBeenCalledWith('track-uuid', '30d');
    });

    it('defaults period to 7d', async () => {
      mockService.getTrackStats.mockResolvedValue({});
      await controller.getTrackStats('track-uuid', '7d');
      expect(mockService.getTrackStats).toHaveBeenCalledWith('track-uuid', '7d');
    });
  });

  // ─── GET /api/plays/artist/:artistId/overview ───────────────────────────

  describe('getArtistOverview', () => {
    it('delegates to service', async () => {
      const overview = { artistId: 'artist-1', totalPlays: 100 };
      mockService.getArtistOverview.mockResolvedValue(overview);

      const result = await controller.getArtistOverview('artist-1');
      expect(result).toEqual(overview);
      expect(mockService.getArtistOverview).toHaveBeenCalledWith('artist-1');
    });
  });

  // ─── GET /api/plays/track/:trackId/sources ──────────────────────────────

  describe('getTrackSources', () => {
    it('delegates to service', async () => {
      const sources = { trackId: 'track-1', sources: {} };
      mockService.getTrackSources.mockResolvedValue(sources);

      const result = await controller.getTrackSources('track-1');
      expect(result).toEqual(sources);
    });
  });

  // ─── GET /api/plays/top-tracks ───────────────────────────────────────────

  describe('getTopTracks', () => {
    it('passes period and limit to service', async () => {
      mockService.getTopTracks.mockResolvedValue({ period: '7d', tracks: [] });
      await controller.getTopTracks('14d', 10);
      expect(mockService.getTopTracks).toHaveBeenCalledWith('14d', 10);
    });

    it('defaults to 20 results', async () => {
      mockService.getTopTracks.mockResolvedValue({ period: '7d', tracks: [] });
      await controller.getTopTracks('7d', 20);
      expect(mockService.getTopTracks).toHaveBeenCalledWith('7d', 20);
    });
  });
});
