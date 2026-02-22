import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { LicensingService } from './licensing.service';
import { LicensingMailService } from './licensing-mail.service';
import { TrackLicense, LicenseType } from './entities/track-license.entity';
import { LicenseRequest, LicenseRequestStatus } from './entities/license-request.entity';
import {
  CreateTrackLicenseDto,
  CreateLicenseRequestDto,
  RespondToLicenseRequestDto,
} from './dto/licensing.dto';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockTrackLicense = (overrides: Partial<TrackLicense> = {}): TrackLicense => ({
  id: 'license-uuid-1',
  trackId: 'track-uuid-1',
  licenseType: LicenseType.ALL_RIGHTS_RESERVED,
  allowRemix: false,
  allowCommercialUse: false,
  allowDownload: false,
  requireAttribution: true,
  licenseUrl: null,
  customTerms: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const mockLicenseRequest = (overrides: Partial<LicenseRequest> = {}): LicenseRequest => ({
  id: 'req-uuid-1',
  trackId: 'track-uuid-1',
  requesterId: 'user-uuid-1',
  intendedUse: 'Documentary film background music',
  status: LicenseRequestStatus.PENDING,
  responseMessage: null,
  respondedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// ── factory ───────────────────────────────────────────────────────────────────

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = <T>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('LicensingService', () => {
  let service: LicensingService;
  let trackLicenseRepo: MockRepo<TrackLicense>;
  let licenseRequestRepo: MockRepo<LicenseRequest>;
  let mailService: jest.Mocked<LicensingMailService>;

  beforeEach(async () => {
    trackLicenseRepo = createMockRepo<TrackLicense>();
    licenseRequestRepo = createMockRepo<LicenseRequest>();

    const mailMock: Partial<jest.Mocked<LicensingMailService>> = {
      notifyArtistOfNewRequest: jest.fn().mockResolvedValue(undefined),
      notifyRequesterOfResponse: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingService,
        { provide: getRepositoryToken(TrackLicense), useValue: trackLicenseRepo },
        { provide: getRepositoryToken(LicenseRequest), useValue: licenseRequestRepo },
        { provide: LicensingMailService, useValue: mailMock },
      ],
    }).compile();

    service = module.get<LicensingService>(LicensingService);
    mailService = module.get(LicensingMailService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createOrUpdateLicense ──────────────────────────────────────────────────

  describe('createOrUpdateLicense', () => {
    it('updates an existing license when one exists for the track', async () => {
      const existing = mockTrackLicense();
      const dto: CreateTrackLicenseDto = { licenseType: LicenseType.COMMERCIAL, allowDownload: true };
      const updated = { ...existing, ...dto };

      trackLicenseRepo.findOne.mockResolvedValue(existing);
      trackLicenseRepo.save.mockResolvedValue(updated);

      const result = await service.createOrUpdateLicense('track-uuid-1', dto, 'artist-1');

      expect(trackLicenseRepo.findOne).toHaveBeenCalledWith({ where: { trackId: 'track-uuid-1' } });
      expect(trackLicenseRepo.save).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(result.licenseType).toBe(LicenseType.COMMERCIAL);
    });

    it('creates a new license when none exists', async () => {
      const dto: CreateTrackLicenseDto = { licenseType: LicenseType.SYNC };
      const created = mockTrackLicense({ licenseType: LicenseType.SYNC });

      trackLicenseRepo.findOne.mockResolvedValue(null);
      trackLicenseRepo.create.mockReturnValue(created);
      trackLicenseRepo.save.mockResolvedValue(created);

      const result = await service.createOrUpdateLicense('track-uuid-1', dto, 'artist-1');

      expect(trackLicenseRepo.create).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(result.licenseType).toBe(LicenseType.SYNC);
    });
  });

  // ── getLicenseByTrack ──────────────────────────────────────────────────────

  describe('getLicenseByTrack', () => {
    it('returns the license for a valid track', async () => {
      const license = mockTrackLicense();
      trackLicenseRepo.findOne.mockResolvedValue(license);

      const result = await service.getLicenseByTrack('track-uuid-1');
      expect(result).toEqual(license);
    });

    it('throws NotFoundException when no license exists', async () => {
      trackLicenseRepo.findOne.mockResolvedValue(null);

      await expect(service.getLicenseByTrack('track-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── assignDefaultLicense ───────────────────────────────────────────────────

  describe('assignDefaultLicense', () => {
    it('returns existing license if one already exists', async () => {
      const existing = mockTrackLicense();
      trackLicenseRepo.findOne.mockResolvedValue(existing);

      const result = await service.assignDefaultLicense('track-uuid-1');
      expect(result).toEqual(existing);
      expect(trackLicenseRepo.create).not.toHaveBeenCalled();
    });

    it('creates a default all_rights_reserved license for a new track', async () => {
      const defaultLicense = mockTrackLicense();
      trackLicenseRepo.findOne.mockResolvedValue(null);
      trackLicenseRepo.create.mockReturnValue(defaultLicense);
      trackLicenseRepo.save.mockResolvedValue(defaultLicense);

      const result = await service.assignDefaultLicense('track-uuid-1');

      expect(trackLicenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ licenseType: LicenseType.ALL_RIGHTS_RESERVED }),
      );
      expect(result.licenseType).toBe(LicenseType.ALL_RIGHTS_RESERVED);
    });
  });

  // ── createLicenseRequest ───────────────────────────────────────────────────

  describe('createLicenseRequest', () => {
    const dto: CreateLicenseRequestDto = {
      trackId: 'track-uuid-1',
      intendedUse: 'YouTube video background',
    };
    const requesterId = 'user-uuid-2';

    it('creates a new license request and notifies artist', async () => {
      const saved = mockLicenseRequest({ requesterId, intendedUse: dto.intendedUse });

      licenseRequestRepo.findOne.mockResolvedValue(null);
      licenseRequestRepo.create.mockReturnValue(saved);
      licenseRequestRepo.save.mockResolvedValue(saved);

      const result = await service.createLicenseRequest(dto, requesterId);

      expect(result.status).toBe(LicenseRequestStatus.PENDING);
      // give the fire-and-forget a tick to resolve
      await Promise.resolve();
      expect(mailService.notifyArtistOfNewRequest).toHaveBeenCalledWith(saved);
    });

    it('throws BadRequestException on duplicate pending request', async () => {
      licenseRequestRepo.findOne.mockResolvedValue(mockLicenseRequest());

      await expect(service.createLicenseRequest(dto, requesterId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── getArtistRequests ──────────────────────────────────────────────────────

  describe('getArtistRequests', () => {
    it('returns empty array when artist has no tracks', async () => {
      const result = await service.getArtistRequests('artist-1', []);
      expect(result).toEqual([]);
      expect(licenseRequestRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('queries requests filtered by trackIds', async () => {
      const requests = [mockLicenseRequest()];
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(requests),
      };
      licenseRequestRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getArtistRequests('artist-1', ['track-uuid-1']);
      expect(result).toEqual(requests);
    });
  });

  // ── respondToRequest ───────────────────────────────────────────────────────

  describe('respondToRequest', () => {
    const artistId = 'artist-uuid-1';
    const trackIds = ['track-uuid-1'];

    it('approves a pending request and sends email', async () => {
      const request = mockLicenseRequest();
      const dto: RespondToLicenseRequestDto = {
        status: LicenseRequestStatus.APPROVED,
        responseMessage: 'Approved for documentary use.',
      };
      const saved = { ...request, ...dto, respondedAt: expect.any(Date) };

      licenseRequestRepo.findOne.mockResolvedValue(request);
      licenseRequestRepo.save.mockResolvedValue(saved);

      const result = await service.respondToRequest('req-uuid-1', dto, artistId, trackIds);

      expect(result.status).toBe(LicenseRequestStatus.APPROVED);
      await Promise.resolve();
      expect(mailService.notifyRequesterOfResponse).toHaveBeenCalled();
    });

    it('rejects a pending request', async () => {
      const request = mockLicenseRequest();
      const dto: RespondToLicenseRequestDto = {
        status: LicenseRequestStatus.REJECTED,
        responseMessage: 'Not suitable for commercial use.',
      };
      const saved = { ...request, ...dto, respondedAt: expect.any(Date) };

      licenseRequestRepo.findOne.mockResolvedValue(request);
      licenseRequestRepo.save.mockResolvedValue(saved);

      const result = await service.respondToRequest('req-uuid-1', dto, artistId, trackIds);
      expect(result.status).toBe(LicenseRequestStatus.REJECTED);
    });

    it('throws NotFoundException for unknown requestId', async () => {
      licenseRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.respondToRequest('bad-id', { status: LicenseRequestStatus.APPROVED }, artistId, trackIds),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if artist does not own the track', async () => {
      const request = mockLicenseRequest({ trackId: 'other-track' });
      licenseRequestRepo.findOne.mockResolvedValue(request);

      await expect(
        service.respondToRequest('req-uuid-1', { status: LicenseRequestStatus.APPROVED }, artistId, ['my-track']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if request is already responded to', async () => {
      const request = mockLicenseRequest({ status: LicenseRequestStatus.APPROVED });
      licenseRequestRepo.findOne.mockResolvedValue(request);

      await expect(
        service.respondToRequest('req-uuid-1', { status: LicenseRequestStatus.REJECTED }, artistId, trackIds),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
