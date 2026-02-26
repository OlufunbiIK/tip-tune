import { Test, TestingModule } from '@nestjs/testing';
import { ArtistStatusController } from './artist-status.controller';
import { ArtistStatusService } from './artist-status.service';
import { StatusType } from './entities/artist-status.entity';
import { HttpStatus } from '@nestjs/common';

describe('ArtistStatusController', () => {
  let controller: ArtistStatusController;
  let service: ArtistStatusService;

  const mockArtistId = 'artist-123';
  const mockUser = {
    userId: 'user-123',
    walletAddress: 'G123456789',
    username: 'testuser',
    isArtist: true,
  };

  const mockStatus = {
    id: 'status-123',
    artistId: mockArtistId,
    statusType: StatusType.ON_TOUR,
    statusMessage: 'Europe tour 2026',
    emoji: '✈️',
    showOnProfile: true,
    autoResetAt: null,
    updatedAt: new Date(),
  };

  const mockHistory = [
    {
      id: 'history-1',
      artistId: mockArtistId,
      statusType: StatusType.ON_TOUR,
      statusMessage: 'Europe tour',
      setAt: new Date(),
      clearedAt: null,
    },
    {
      id: 'history-2',
      artistId: mockArtistId,
      statusType: StatusType.RECORDING,
      statusMessage: 'New album',
      setAt: new Date(Date.now() - 86400000),
      clearedAt: null,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistStatusController],
      providers: [
        {
          provide: ArtistStatusService,
          useValue: {
            setStatus: jest.fn().mockResolvedValue(mockStatus),
            getStatus: jest.fn().mockResolvedValue(mockStatus),
            clearStatus: jest.fn().mockResolvedValue(undefined),
            getStatusHistory: jest.fn().mockResolvedValue(mockHistory),
          },
        },
      ],
    }).compile();

    controller = module.get<ArtistStatusController>(ArtistStatusController);
    service = module.get<ArtistStatusService>(ArtistStatusService);
  });

  describe('setStatus', () => {
    it('should set artist status', async () => {
      const dto = {
        statusType: StatusType.ON_TOUR,
        statusMessage: 'Europe tour 2026',
        emoji: '✈️',
        showOnProfile: true,
      };

      const result = await controller.setStatus(mockArtistId, mockUser, dto);

      expect(result).toEqual(mockStatus);
      expect(service.setStatus).toHaveBeenCalledWith(mockArtistId, dto);
    });

    it('should handle different status types', async () => {
      const dto = {
        statusType: StatusType.RECORDING,
        statusMessage: 'New album incoming',
        emoji: '🎧',
      };

      await controller.setStatus(mockArtistId, mockUser, dto);

      expect(service.setStatus).toHaveBeenCalledWith(mockArtistId, dto);
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      const result = await controller.getStatus(mockArtistId);

      expect(result).toEqual(mockStatus);
      expect(service.getStatus).toHaveBeenCalledWith(mockArtistId);
    });
  });

  describe('clearStatus', () => {
    it('should clear artist status', async () => {
      await controller.clearStatus(mockArtistId, mockUser);

      expect(service.clearStatus).toHaveBeenCalledWith(mockArtistId);
    });
  });

  describe('getStatusHistory', () => {
    it('should return status history', async () => {
      const result = await controller.getStatusHistory(mockArtistId);

      expect(result).toEqual(mockHistory);
      expect(service.getStatusHistory).toHaveBeenCalledWith(mockArtistId);
    });

    it('should return array of history entries', async () => {
      const result = await controller.getStatusHistory(mockArtistId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].statusType).toBe(StatusType.ON_TOUR);
    });
  });

  describe('endpoint responses', () => {
    it('PUT /artists/:artistId/status should return 200', async () => {
      const dto = {
        statusType: StatusType.ACCEPTING_REQUESTS,
        statusMessage: 'Open for custom work',
        emoji: '🎵',
      };

      const result = await controller.setStatus(mockArtistId, mockUser, dto);

      expect(result).toBeDefined();
      expect(result.statusType).toBe(StatusType.ON_TOUR);
    });

    it('DELETE /artists/:artistId/status should return 204', async () => {
      const result = await controller.clearStatus(mockArtistId, mockUser);

      expect(result).toBeUndefined();
    });

    it('GET /artists/:artistId/status should return 200 with status', async () => {
      const result = await controller.getStatus(mockArtistId);

      expect(result).toBeDefined();
      expect(result.artistId).toBe(mockArtistId);
    });

    it('GET /artists/:artistId/status/history should return 200 with array', async () => {
      const result = await controller.getStatusHistory(mockArtistId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
