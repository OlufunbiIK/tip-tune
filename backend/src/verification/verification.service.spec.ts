import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VerificationService } from './verification.service';
import {
  VerificationRequest,
  VerificationStatus,
} from './entities/verification-request.entity';
import { Artist } from '../artists/entities/artist.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationRepository: Repository<VerificationRequest>;
  let artistRepository: Repository<Artist>;
  let notificationsService: NotificationsService;

  const mockVerificationRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockArtistRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        VERIFICATION_UPLOAD_DIR: './test-uploads',
        DOCUMENT_ENCRYPTION_KEY: 'test-key-32-chars-long!!!!!!',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getRepositoryToken(VerificationRequest),
          useValue: mockVerificationRepository,
        },
        {
          provide: getRepositoryToken(Artist),
          useValue: mockArtistRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    verificationRepository = module.get<Repository<VerificationRequest>>(
      getRepositoryToken(VerificationRequest),
    );
    artistRepository = module.get<Repository<Artist>>(getRepositoryToken(Artist));
    notificationsService = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVerificationRequest', () => {
    const artistId = 'artist-uuid';
    const dto = {
      socialProof: [
        { platform: 'twitter', url: 'https://twitter.com/artist', username: 'artist' },
      ],
      additionalInfo: 'Test info',
    };
    const files: Express.Multer.File[] = [];

    it('should create a verification request successfully', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);
      mockArtistRepository.findOne.mockResolvedValue({
        id: artistId,
        isVerified: false,
      });
      mockVerificationRepository.create.mockReturnValue({
        artistId,
        status: VerificationStatus.PENDING,
        documents: [],
        socialProof: dto.socialProof,
        additionalInfo: dto.additionalInfo,
      });
      mockVerificationRepository.save.mockResolvedValue({
        id: 'request-uuid',
        artistId,
        status: VerificationStatus.PENDING,
      });

      const result = await service.createVerificationRequest(artistId, dto, files);

      expect(result).toBeDefined();
      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(mockVerificationRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if pending request exists', async () => {
      mockVerificationRepository.findOne.mockResolvedValue({
        id: 'existing-request',
        status: VerificationStatus.PENDING,
      });

      await expect(
        service.createVerificationRequest(artistId, dto, files),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if artist not found', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);
      mockArtistRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createVerificationRequest(artistId, dto, files),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if artist already verified', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);
      mockArtistRepository.findOne.mockResolvedValue({
        id: artistId,
        isVerified: true,
      });

      await expect(
        service.createVerificationRequest(artistId, dto, files),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getVerificationRequest', () => {
    it('should return a verification request', async () => {
      const requestId = 'request-uuid';
      const mockRequest = {
        id: requestId,
        artistId: 'artist-uuid',
        status: VerificationStatus.PENDING,
      };
      mockVerificationRepository.findOne.mockResolvedValue(mockRequest);

      const result = await service.getVerificationRequest(requestId);

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);

      await expect(service.getVerificationRequest('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getArtistVerificationStatus', () => {
    it('should return verified status for verified artist', async () => {
      const artistId = 'artist-uuid';
      mockArtistRepository.findOne.mockResolvedValue({
        id: artistId,
        isVerified: true,
      });

      const result = await service.getArtistVerificationStatus(artistId);

      expect(result.isVerified).toBe(true);
      expect(result.hasPendingRequest).toBe(false);
    });

    it('should return pending status for pending request', async () => {
      const artistId = 'artist-uuid';
      mockArtistRepository.findOne.mockResolvedValue({
        id: artistId,
        isVerified: false,
      });
      mockVerificationRepository.findOne.mockResolvedValue({
        id: 'request-uuid',
        status: VerificationStatus.PENDING,
      });

      const result = await service.getArtistVerificationStatus(artistId);

      expect(result.isVerified).toBe(false);
      expect(result.hasPendingRequest).toBe(true);
      expect(result.requestId).toBe('request-uuid');
    });
  });

  describe('reviewRequest', () => {
    const requestId = 'request-uuid';
    const adminId = 'admin-uuid';

    it('should approve a verification request', async () => {
      const mockRequest = {
        id: requestId,
        artistId: 'artist-uuid',
        status: VerificationStatus.PENDING,
        artist: { id: 'artist-uuid' },
      };
      mockVerificationRepository.findOne.mockResolvedValue(mockRequest);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockRequest,
        status: VerificationStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      });

      const result = await service.reviewRequest(requestId, adminId, {
        status: VerificationStatus.APPROVED,
        reviewNotes: 'Approved',
      });

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockArtistRepository.update).toHaveBeenCalledWith('artist-uuid', {
        isVerified: true,
      });
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should reject a verification request', async () => {
      const mockRequest = {
        id: requestId,
        artistId: 'artist-uuid',
        status: VerificationStatus.PENDING,
        artist: { id: 'artist-uuid' },
      };
      mockVerificationRepository.findOne.mockResolvedValue(mockRequest);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockRequest,
        status: VerificationStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      });

      const result = await service.reviewRequest(requestId, adminId, {
        status: VerificationStatus.REJECTED,
        reviewNotes: 'Insufficient proof',
      });

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(mockArtistRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if already reviewed', async () => {
      mockVerificationRepository.findOne.mockResolvedValue({
        id: requestId,
        status: VerificationStatus.APPROVED,
      });

      await expect(
        service.reviewRequest(requestId, adminId, {
          status: VerificationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending requests with pagination', async () => {
      const mockRequests = [
        { id: 'request-1', status: VerificationStatus.PENDING },
        { id: 'request-2', status: VerificationStatus.PENDING },
      ];
      mockVerificationRepository.findAndCount.mockResolvedValue([mockRequests, 2]);

      const result = await service.getPendingRequests(1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getRequestStats', () => {
    it('should return verification statistics', async () => {
      mockVerificationRepository.count.mockResolvedValueOnce(10); // total
      mockVerificationRepository.count.mockResolvedValueOnce(5); // pending
      mockVerificationRepository.count.mockResolvedValueOnce(4); // approved
      mockVerificationRepository.count.mockResolvedValueOnce(1); // rejected

      const result = await service.getRequestStats();

      expect(result).toEqual({
        total: 10,
        pending: 5,
        approved: 4,
        rejected: 1,
      });
    });
  });

  describe('deleteRequest', () => {
    it('should delete a pending request', async () => {
      const requestId = 'request-uuid';
      const artistId = 'artist-uuid';
      const mockRequest = {
        id: requestId,
        artistId,
        status: VerificationStatus.PENDING,
        documents: [],
      };
      mockVerificationRepository.findOne.mockResolvedValue(mockRequest);

      await service.deleteRequest(requestId, artistId);

      expect(mockVerificationRepository.remove).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw BadRequestException if request already reviewed', async () => {
      const requestId = 'request-uuid';
      const artistId = 'artist-uuid';
      mockVerificationRepository.findOne.mockResolvedValue({
        id: requestId,
        artistId,
        status: VerificationStatus.APPROVED,
      });

      await expect(service.deleteRequest(requestId, artistId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
