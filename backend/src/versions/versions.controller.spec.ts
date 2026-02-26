import { Test, TestingModule } from '@nestjs/testing';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';

describe('VersionsController', () => {
  let controller: VersionsController;
  let versionsService: VersionsService;

  const mockUser: CurrentUserData = {
    userId: 'user-uuid',
    walletAddress: 'GTEST123',
    isArtist: true,
  };

  const mockVersion = {
    id: 'version-uuid',
    trackId: 'track-uuid',
    versionNumber: 1,
    audioUrl: 'https://example.com/audio-v1.mp3',
    fileSize: 5000000,
    duration: 180,
    changeNote: 'Initial version',
    isActive: true,
    uploadedAt: new Date(),
    uploadedBy: 'GTEST123',
  };

  const mockVersionsService = {
    createVersion: jest.fn(),
    getVersions: jest.fn(),
    getActiveVersion: jest.fn(),
    activateVersion: jest.fn(),
    deleteVersion: jest.fn(),
    getVersionById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersionsController],
      providers: [
        {
          provide: VersionsService,
          useValue: mockVersionsService,
        },
      ],
    }).compile();

    controller = module.get<VersionsController>(VersionsController);
    versionsService = module.get<VersionsService>(VersionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const createDto = {
        audioUrl: 'https://example.com/audio-v2.mp3',
        fileSize: 5500000,
        duration: 185,
        changeNote: 'Remastered',
      };

      mockVersionsService.createVersion.mockResolvedValue({
        ...mockVersion,
        ...createDto,
        versionNumber: 2,
      });

      const result = await controller.createVersion(
        'track-uuid',
        createDto,
        mockUser,
      );

      expect(result.versionNumber).toBe(2);
      expect(versionsService.createVersion).toHaveBeenCalledWith(
        'track-uuid',
        createDto,
        'GTEST123',
      );
    });
  });

  describe('getVersions', () => {
    it('should return paginated versions', async () => {
      mockVersionsService.getVersions.mockResolvedValue({
        data: [mockVersion],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await controller.getVersions('track-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getActiveVersion', () => {
    it('should return active version', async () => {
      mockVersionsService.getActiveVersion.mockResolvedValue(mockVersion);

      const result = await controller.getActiveVersion('track-uuid');

      expect(result.isActive).toBe(true);
    });
  });

  describe('activateVersion', () => {
    it('should activate a version', async () => {
      mockVersionsService.activateVersion.mockResolvedValue({
        ...mockVersion,
        id: 'version-2-uuid',
        versionNumber: 2,
        isActive: true,
      });

      const result = await controller.activateVersion(
        'track-uuid',
        'version-2-uuid',
        mockUser,
      );

      expect(result.isActive).toBe(true);
      expect(versionsService.activateVersion).toHaveBeenCalledWith(
        'track-uuid',
        'version-2-uuid',
        'GTEST123',
      );
    });
  });

  describe('deleteVersion', () => {
    it('should delete a version', async () => {
      mockVersionsService.deleteVersion.mockResolvedValue(undefined);

      const result = await controller.deleteVersion(
        'track-uuid',
        'version-uuid',
        mockUser,
      );

      expect(result.message).toBe('Version deleted successfully');
      expect(versionsService.deleteVersion).toHaveBeenCalledWith(
        'track-uuid',
        'version-uuid',
        'GTEST123',
      );
    });
  });

  describe('getVersion', () => {
    it('should return a specific version', async () => {
      mockVersionsService.getVersionById.mockResolvedValue(mockVersion);

      const result = await controller.getVersion('track-uuid', 'version-uuid');

      expect(result.id).toBe('version-uuid');
    });
  });
});
