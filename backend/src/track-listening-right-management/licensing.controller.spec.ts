import { Test, TestingModule } from '@nestjs/testing';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { TrackLicense, LicenseType } from './entities/track-license.entity';
import { LicenseRequest, LicenseRequestStatus } from './entities/license-request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockService = (): Partial<jest.Mocked<LicensingService>> => ({
  createOrUpdateLicense: jest.fn(),
  getLicenseByTrack: jest.fn(),
  createLicenseRequest: jest.fn(),
  getArtistRequests: jest.fn(),
  respondToRequest: jest.fn(),
});

const fakeTrackLicense = (): TrackLicense => ({
  id: 'lic-1',
  trackId: 'track-1',
  licenseType: LicenseType.CREATIVE_COMMONS,
  allowRemix: true,
  allowCommercialUse: false,
  allowDownload: true,
  requireAttribution: true,
  licenseUrl: null,
  customTerms: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const fakeRequest = (): LicenseRequest => ({
  id: 'req-1',
  trackId: 'track-1',
  requesterId: 'user-1',
  intendedUse: 'Film score',
  status: LicenseRequestStatus.PENDING,
  responseMessage: null,
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('LicensingController', () => {
  let controller: LicensingController;
  let service: jest.Mocked<LicensingService>;

  const mockAuthReq = (id = 'artist-1', trackIds = ['track-1']) => ({
    user: { id, trackIds },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicensingController],
      providers: [{ provide: LicensingService, useValue: mockService() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(LicensingController);
    service = module.get(LicensingService) as jest.Mocked<LicensingService>;
  });

  afterEach(() => jest.clearAllMocks());

  // ── upsertLicense ──────────────────────────────────────────────────────────

  describe('upsertLicense', () => {
    it('delegates to service.createOrUpdateLicense', async () => {
      const license = fakeTrackLicense();
      service.createOrUpdateLicense.mockResolvedValue(license);

      const result = await controller.upsertLicense(
        'track-1',
        { licenseType: LicenseType.CREATIVE_COMMONS, allowRemix: true, allowDownload: true },
        mockAuthReq() as any,
      );

      expect(service.createOrUpdateLicense).toHaveBeenCalledWith(
        'track-1',
        expect.any(Object),
        'artist-1',
      );
      expect(result).toEqual(license);
    });
  });

  // ── getLicense ─────────────────────────────────────────────────────────────

  describe('getLicense', () => {
    it('returns license for the given track', async () => {
      const license = fakeTrackLicense();
      service.getLicenseByTrack.mockResolvedValue(license);

      const result = await controller.getLicense('track-1');
      expect(service.getLicenseByTrack).toHaveBeenCalledWith('track-1');
      expect(result).toEqual(license);
    });
  });

  // ── createRequest ──────────────────────────────────────────────────────────

  describe('createRequest', () => {
    it('creates a license request and returns it', async () => {
      const req = fakeRequest();
      service.createLicenseRequest.mockResolvedValue(req);

      const result = await controller.createRequest(
        { trackId: 'track-1', intendedUse: 'Film score' },
        { user: { id: 'user-1', trackIds: [] } } as any,
      );

      expect(service.createLicenseRequest).toHaveBeenCalledWith(
        { trackId: 'track-1', intendedUse: 'Film score' },
        'user-1',
      );
      expect(result).toEqual(req);
    });
  });

  // ── getArtistRequests ──────────────────────────────────────────────────────

  describe('getArtistRequests', () => {
    it('returns list of requests for artist tracks', async () => {
      const requests = [fakeRequest()];
      service.getArtistRequests.mockResolvedValue(requests);

      const result = await controller.getArtistRequests(mockAuthReq() as any);
      expect(service.getArtistRequests).toHaveBeenCalledWith('artist-1', ['track-1']);
      expect(result).toEqual(requests);
    });

    it('passes empty trackIds if user has none', async () => {
      service.getArtistRequests.mockResolvedValue([]);
      await controller.getArtistRequests({ user: { id: 'artist-1' } } as any);
      expect(service.getArtistRequests).toHaveBeenCalledWith('artist-1', []);
    });
  });

  // ── respondToRequest ───────────────────────────────────────────────────────

  describe('respondToRequest', () => {
    it('approves a request', async () => {
      const responded = { ...fakeRequest(), status: LicenseRequestStatus.APPROVED };
      service.respondToRequest.mockResolvedValue(responded);

      const result = await controller.respondToRequest(
        'req-1',
        { status: LicenseRequestStatus.APPROVED, responseMessage: 'OK' },
        mockAuthReq() as any,
      );

      expect(service.respondToRequest).toHaveBeenCalledWith(
        'req-1',
        { status: LicenseRequestStatus.APPROVED, responseMessage: 'OK' },
        'artist-1',
        ['track-1'],
      );
      expect(result.status).toBe(LicenseRequestStatus.APPROVED);
    });
  });
});
