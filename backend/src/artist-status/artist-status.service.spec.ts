import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtistStatusService } from './artist-status.service';
import { ArtistStatus, StatusType } from './entities/artist-status.entity';
import { StatusHistory } from './entities/status-history.entity';
import { Artist } from '../artists/entities/artist.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Follow, FollowingType } from '../follows/entities/follow.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ArtistStatusService', () => {
  let service: ArtistStatusService;
  let statusRepository: Repository<ArtistStatus>;
  let historyRepository: Repository<StatusHistory>;
  let artistRepository: Repository<Artist>;
  let followRepository: Repository<Follow>;
  let notificationsService: NotificationsService;

  const mockArtistId = 'artist-123';
  const mockArtist = { id: mockArtistId, artistName: 'Test Artist' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistStatusService,
        {
          provide: getRepositoryToken(ArtistStatus),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StatusHistory),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ArtistStatusService>(ArtistStatusService);
    statusRepository = module.get<Repository<ArtistStatus>>(
      getRepositoryToken(ArtistStatus),
    );
    historyRepository = module.get<Repository<StatusHistory>>(
      getRepositoryToken(StatusHistory),
    );
    artistRepository = module.get<Repository<Artist>>(
      getRepositoryToken(Artist),
    );
    followRepository = module.get<Repository<Follow>>(
      getRepositoryToken(Follow),
    );
    notificationsService = module.get<NotificationsService>(
      NotificationsService,
    );
  });

  describe('setStatus', () => {
    it('should create a new status if it does not exist', async () => {
      const dto = {
        statusType: StatusType.ON_TOUR,
        statusMessage: 'Europe tour 2026',
        emoji: '✈️',
        showOnProfile: true,
      };

      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);
      jest.spyOn(statusRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(statusRepository, 'create').mockReturnValue({
        artistId: mockArtistId,
        ...dto,
      } as any);
      jest.spyOn(statusRepository, 'save').mockResolvedValue({
        id: 'status-123',
        artistId: mockArtistId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
        autoResetAt: null,
        artist: null,
        history: [],
      } as any);
      jest.spyOn(historyRepository, 'count').mockResolvedValue(0);
      jest.spyOn(historyRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(followRepository, 'find').mockResolvedValue([]);

      const result = await service.setStatus(mockArtistId, dto);

      expect(result.statusType).toBe(StatusType.ON_TOUR);
      expect(result.statusMessage).toBe('Europe tour 2026');
      expect(statusRepository.create).toHaveBeenCalled();
      expect(statusRepository.save).toHaveBeenCalled();
    });

    it('should update existing status', async () => {
      const existingStatus = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ACTIVE,
        statusMessage: null,
        emoji: null,
        showOnProfile: true,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      const dto = {
        statusType: StatusType.RECORDING,
        statusMessage: 'New album incoming',
        emoji: '🎧',
        showOnProfile: true,
      };

      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);
      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(existingStatus as any);
      jest.spyOn(statusRepository, 'save').mockResolvedValue({
        ...existingStatus,
        ...dto,
        updatedAt: new Date(),
      } as any);
      jest.spyOn(historyRepository, 'count').mockResolvedValue(0);
      jest.spyOn(historyRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(followRepository, 'find').mockResolvedValue([]);

      const result = await service.setStatus(mockArtistId, dto);

      expect(result.statusType).toBe(StatusType.RECORDING);
      expect(result.statusMessage).toBe('New album incoming');
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      jest.spyOn(artistRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.setStatus(mockArtistId, {
          statusType: StatusType.ACTIVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid autoResetAt', async () => {
      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);

      await expect(
        service.setStatus(mockArtistId, {
          statusType: StatusType.ACTIVE,
          autoResetAt: 'invalid-date',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if autoResetAt is in the past', async () => {
      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);

      const pastDate = new Date(Date.now() - 1000).toISOString();

      await expect(
        service.setStatus(mockArtistId, {
          statusType: StatusType.ACTIVE,
          autoResetAt: pastDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      const status = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ON_TOUR,
        statusMessage: 'Europe tour',
        emoji: '✈️',
        showOnProfile: true,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(status as any);

      const result = await service.getStatus(mockArtistId);

      expect(result.statusType).toBe(StatusType.ON_TOUR);
      expect(result.statusMessage).toBe('Europe tour');
    });

    it('should throw NotFoundException if status does not exist', async () => {
      jest.spyOn(statusRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getStatus(mockArtistId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearStatus', () => {
    it('should reset status to active', async () => {
      const status = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ON_BREAK,
        statusMessage: 'Taking a break',
        emoji: '😴',
        showOnProfile: true,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(status as any);
      jest.spyOn(historyRepository, 'update').mockResolvedValue({} as any);
      jest.spyOn(statusRepository, 'save').mockResolvedValue({
        ...status,
        statusType: StatusType.ACTIVE,
        statusMessage: null,
        emoji: null,
      } as any);

      await service.clearStatus(mockArtistId);

      expect(historyRepository.update).toHaveBeenCalledWith(
        {
          artistStatusId: 'status-123',
          clearedAt: null,
        },
        { clearedAt: expect.any(Date) },
      );
      expect(statusRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if status does not exist', async () => {
      jest.spyOn(statusRepository, 'findOne').mockResolvedValue(null);

      await expect(service.clearStatus(mockArtistId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStatusHistory', () => {
    it('should return last 20 entries', async () => {
      const historyEntries = Array.from({ length: 5 }, (_, i) => ({
        id: `history-${i}`,
        artistId: mockArtistId,
        statusType: StatusType.ACTIVE,
        statusMessage: null,
        setAt: new Date(),
        clearedAt: null,
        artist: null,
        artistStatus: null,
        artistStatusId: null,
      }));

      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);
      jest
        .spyOn(historyRepository, 'find')
        .mockResolvedValue(historyEntries as any);

      const result = await service.getStatusHistory(mockArtistId);

      expect(result).toHaveLength(5);
      expect(historyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      );
    });

    it('should throw NotFoundException if artist does not exist', async () => {
      jest.spyOn(artistRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getStatusHistory(mockArtistId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPublicStatus', () => {
    it('should return status if showOnProfile is true', async () => {
      const status = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ACCEPTING_REQUESTS,
        statusMessage: 'Open for custom requests',
        emoji: '🎵',
        showOnProfile: true,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(status as any);

      const result = await service.getPublicStatus(mockArtistId);

      expect(result).not.toBeNull();
      expect(result.statusType).toBe(StatusType.ACCEPTING_REQUESTS);
    });

    it('should return null if showOnProfile is false', async () => {
      const status = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ON_BREAK,
        statusMessage: 'Taking a break',
        emoji: '😴',
        showOnProfile: false,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(status as any);

      const result = await service.getPublicStatus(mockArtistId);

      expect(result).toBeNull();
    });

    it('should return null if no status exists', async () => {
      jest.spyOn(statusRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getPublicStatus(mockArtistId);

      expect(result).toBeNull();
    });
  });

  describe('history cap', () => {
    it('should cap history at 20 entries', async () => {
      // Create existing status
      const existingStatus = {
        id: 'status-123',
        artistId: mockArtistId,
        statusType: StatusType.ACTIVE,
        statusMessage: null,
        emoji: null,
        showOnProfile: true,
        autoResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist: null,
        history: [],
      };

      const oldestEntry = {
        id: 'history-old',
        artistId: mockArtistId,
        statusType: StatusType.ACTIVE,
        statusMessage: null,
        setAt: new Date(Date.now() - 100000),
        clearedAt: null,
        artist: null,
        artistStatus: null,
        artistStatusId: null,
      };

      jest
        .spyOn(artistRepository, 'findOne')
        .mockResolvedValue(mockArtist as any);
      jest
        .spyOn(statusRepository, 'findOne')
        .mockResolvedValue(existingStatus as any);
      jest.spyOn(statusRepository, 'save').mockResolvedValue({
        ...existingStatus,
        updatedAt: new Date(),
      } as any);
      jest.spyOn(historyRepository, 'count').mockResolvedValue(20);
      jest
        .spyOn(historyRepository, 'findOne')
        .mockResolvedValue(oldestEntry as any);
      jest.spyOn(historyRepository, 'remove').mockResolvedValue(oldestEntry as any);
      jest.spyOn(historyRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(historyRepository, 'save').mockResolvedValue({} as any);
      jest.spyOn(followRepository, 'find').mockResolvedValue([]);

      await service.setStatus(mockArtistId, {
        statusType: StatusType.RECORDING,
      });

      expect(historyRepository.remove).toHaveBeenCalledWith(oldestEntry);
    });
  });
});
