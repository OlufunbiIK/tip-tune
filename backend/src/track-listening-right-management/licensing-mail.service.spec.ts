import { Test, TestingModule } from '@nestjs/testing';
import { LicensingMailService } from './licensing-mail.service';
import { LicenseRequest, LicenseRequestStatus } from './entities/license-request.entity';

const fakeRequest = (overrides: Partial<LicenseRequest> = {}): LicenseRequest => ({
  id: 'req-uuid-1',
  trackId: 'track-uuid-1',
  requesterId: 'user-uuid-1',
  intendedUse: 'Documentary background',
  status: LicenseRequestStatus.PENDING,
  responseMessage: null,
  respondedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('LicensingMailService', () => {
  let service: LicensingMailService;
  let sendMailSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicensingMailService],
    }).compile();

    service = module.get<LicensingMailService>(LicensingMailService);
    // Spy on the protected method so we verify it is called without actual I/O
    sendMailSpy = jest
      .spyOn(service as any, 'sendMail')
      .mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  describe('notifyArtistOfNewRequest', () => {
    it('calls sendMail with artist recipient and track info', async () => {
      const request = fakeRequest();
      await service.notifyArtistOfNewRequest(request);

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const payload = sendMailSpy.mock.calls[0][0];
      expect(payload.to).toContain(request.trackId);
      expect(payload.subject).toMatch(/license request/i);
      expect(payload.body).toContain(request.intendedUse);
    });
  });

  describe('notifyRequesterOfResponse', () => {
    it('sends approved notification to requester', async () => {
      const request = fakeRequest({
        status: LicenseRequestStatus.APPROVED,
        responseMessage: 'Great, go ahead!',
        respondedAt: new Date(),
      });
      await service.notifyRequesterOfResponse(request);

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const payload = sendMailSpy.mock.calls[0][0];
      expect(payload.to).toContain(request.requesterId);
      expect(payload.subject).toMatch(/approved/i);
      expect(payload.body).toContain('Great, go ahead!');
    });

    it('sends rejected notification to requester', async () => {
      const request = fakeRequest({
        status: LicenseRequestStatus.REJECTED,
        responseMessage: 'Not permitted.',
        respondedAt: new Date(),
      });
      await service.notifyRequesterOfResponse(request);

      const payload = sendMailSpy.mock.calls[0][0];
      expect(payload.subject).toMatch(/rejected/i);
      expect(payload.body).toContain('Not permitted.');
    });

    it('handles missing responseMessage gracefully', async () => {
      const request = fakeRequest({
        status: LicenseRequestStatus.APPROVED,
        responseMessage: null,
      });
      await expect(service.notifyRequesterOfResponse(request)).resolves.not.toThrow();
    });
  });
});
