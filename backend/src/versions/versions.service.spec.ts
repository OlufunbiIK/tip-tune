import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VersionsService } from './versions.service';
import { TrackVersion } from './entities/track-version.entity';
import { Track } from '../tracks/entities/track.entity';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('VersionsService', () => {
  let service: VersionsService;
  let versionRepository: Repository<TrackVersion>;
  let trackRepository: Repository<Track>;

  const mockTrack = {
    id: 'track-uuid',
    artistId: 'artist-uuid',
    audioUrl: 'https://example.com/audio.mp3',
    duration: 180,
    artist: {
      walletAddress: 'GTEST123',
    },
  };

  const mockVersion: TrackVersion = {
    id: 'version-uuid',
    trackId: 'track-uuid',
    track: null,
    versionNumber: 1,
    audioUrl: 'https://example.com/audio-v1.mp3',
    fileSize: 5000000,
    duration: 180,
    changeNote: 'Initial version',
    isActive: true,
    uploadedAt: new Date(),
    uploadedBy: 'GTEST123',
  };

  const mockVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockTrackRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      update: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionsService,
        {
          provide: getRepositoryToken(TrackVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(Track),
          useValue: mockTrackRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<VersionsService>(VersionsService);
    versionRepository = module.get<Repository<TrackVersion>>(
      getRepositoryToken(TrackVersion),
    );
    trackRepository = module.get<Repository<Track>>(getRepositoryToken(Track));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVersion', () => {
    const createDto = {
      audioUrl: 'https://example.com/audio-v2.mp3',
      fileSize: 5500000,
      duration: 185,
      changeNote: 'Remastered version',
    };

    it('should create a new version successfully', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.count.mockResolvedValue(1);
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);
      mockVersionRepository.create.mockReturnValue({
        ...createDto,
        trackId: 'track-uuid',
        versionNumber: 2,
        isActive: false,
        uploadedBy: 'GTEST123',
      });
      mockVersionRepository.save.mockResolvedValue({
        id: 'new-version-uuid',
        ...createDto,
        trackId: 'track-uuid',
        versionNumber: 2,
        isActive: false,
        uploadedBy: 'GTEST123',
      });

      const result = await service.createVersion(
        'track-uuid',
        createDto,
        'GTEST123',
      );

      expect(result.versionNumber).toBe(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'version.created',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if track not found', async () => {
      mockTrackRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createVersion('invalid-track', createDto, 'GTEST123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not track owner', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);

      await expect(
        service.createVersion('track-uuid', createDto, 'OTHER_WALLET'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if max versions reached', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.count.mockResolvedValue(5);

      await expect(
        service.createVersion('track-uuid', createDto, 'GTEST123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set first version as active', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.count.mockResolvedValue(0);
      mockVersionRepository.findOne.mockResolvedValue(null);
      mockVersionRepository.create.mockReturnValue({
        ...createDto,
        trackId: 'track-uuid',
        versionNumber: 1,
        isActive: true,
        uploadedBy: 'GTEST123',
      });
      mockVersionRepository.save.mockResolvedValue({
        id: 'first-version-uuid',
        ...createDto,
        trackId: 'track-uuid',
        versionNumber: 1,
        isActive: true,
        uploadedBy: 'GTEST123',
      });

      const result = await service.createVersion(
        'track-uuid',
        createDto,
        'GTEST123',
      );

      expect(result.isActive).toBe(true);
      expect(mockTrackRepository.update).toHaveBeenCalledWith('track-uuid', {
        audioUrl: createDto.audioUrl,
        duration: createDto.duration,
      });
    });
  });

  describe('getVersions', () => {
    it('should return paginated versions', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findAndCount.mockResolvedValue([[mockVersion], 1]);

      const result = await service.getVersions('track-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should throw NotFoundException if track not found', async () => {
      mockTrackRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getVersions('invalid-track', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveVersion', () => {
    it('should return active version', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.getActiveVersion('track-uuid');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if no active version', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(null);

      await expect(service.getActiveVersion('track-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activateVersion', () => {
    const inactiveVersion = {
      ...mockVersion,
      id: 'inactive-version-uuid',
      versionNumber: 2,
      isActive: false,
    };

    it('should activate a version atomically', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(inactiveVersion);

      const result = await service.activateVersion(
        'track-uuid',
        'inactive-version-uuid',
        'GTEST123',
      );

      expect(result.isActive).toBe(true);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return version if already active', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.activateVersion(
        'track-uuid',
        'version-uuid',
        'GTEST123',
      );

      expect(result.isActive).toBe(true);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not track owner', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);

      await expect(
        service.activateVersion(
          'track-uuid',
          'version-uuid',
          'OTHER_WALLET',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should rollback on error', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(inactiveVersion);
      mockQueryRunner.manager.update.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.activateVersion(
          'track-uuid',
          'inactive-version-uuid',
          'GTEST123',
        ),
      ).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteVersion', () => {
    const inactiveVersion = {
      ...mockVersion,
      id: 'inactive-version-uuid',
      isActive: false,
    };

    it('should delete an inactive version', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(inactiveVersion);
      mockVersionRepository.count.mockResolvedValue(2);

      await service.deleteVersion(
        'track-uuid',
        'inactive-version-uuid',
        'GTEST123',
      );

      expect(mockVersionRepository.remove).toHaveBeenCalledWith(
        inactiveVersion,
      );
    });

    it('should throw BadRequestException when deleting active version', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);

      await expect(
        service.deleteVersion('track-uuid', 'version-uuid', 'GTEST123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleting only version', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);
      mockVersionRepository.findOne.mockResolvedValue(inactiveVersion);
      mockVersionRepository.count.mockResolvedValue(1);

      await expect(
        service.deleteVersion(
          'track-uuid',
          'inactive-version-uuid',
          'GTEST123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not track owner', async () => {
      mockTrackRepository.findOne.mockResolvedValue(mockTrack);

      await expect(
        service.deleteVersion(
          'track-uuid',
          'version-uuid',
          'OTHER_WALLET',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getVersionById', () => {
    it('should return version by id', async () => {
      mockVersionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.getVersionById('track-uuid', 'version-uuid');

      expect(result.id).toBe('version-uuid');
    });

    it('should throw NotFoundException if version not found', async () => {
      mockVersionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getVersionById('track-uuid', 'invalid-version'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
