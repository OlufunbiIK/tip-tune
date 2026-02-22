import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackLicense, LicenseType } from './entities/track-license.entity';
import {
  LicenseRequest,
  LicenseRequestStatus,
} from './entities/license-request.entity';
import {
  CreateTrackLicenseDto,
  UpdateTrackLicenseDto,
  CreateLicenseRequestDto,
  RespondToLicenseRequestDto,
} from './dto/licensing.dto';
import { LicensingMailService } from './licensing-mail.service';

@Injectable()
export class LicensingService {
  constructor(
    @InjectRepository(TrackLicense)
    private readonly trackLicenseRepo: Repository<TrackLicense>,
    @InjectRepository(LicenseRequest)
    private readonly licenseRequestRepo: Repository<LicenseRequest>,
    private readonly mailService: LicensingMailService,
  ) {}

  // ── Track License ──────────────────────────────────────────────────────────

  async createOrUpdateLicense(
    trackId: string,
    dto: CreateTrackLicenseDto,
    artistId: string,
  ): Promise<TrackLicense> {
    let license = await this.trackLicenseRepo.findOne({ where: { trackId } });

    if (license) {
      Object.assign(license, dto);
      return this.trackLicenseRepo.save(license);
    }

    license = this.trackLicenseRepo.create({ trackId, ...dto });
    return this.trackLicenseRepo.save(license);
  }

  async getLicenseByTrack(trackId: string): Promise<TrackLicense> {
    const license = await this.trackLicenseRepo.findOne({ where: { trackId } });
    if (!license) {
      throw new NotFoundException(`License not found for track ${trackId}`);
    }
    return license;
  }

  async assignDefaultLicense(trackId: string): Promise<TrackLicense> {
    const existing = await this.trackLicenseRepo.findOne({ where: { trackId } });
    if (existing) return existing;

    const license = this.trackLicenseRepo.create({
      trackId,
      licenseType: LicenseType.ALL_RIGHTS_RESERVED,
      allowRemix: false,
      allowCommercialUse: false,
      allowDownload: false,
      requireAttribution: true,
    });
    return this.trackLicenseRepo.save(license);
  }

  // ── License Requests ───────────────────────────────────────────────────────

  async createLicenseRequest(
    dto: CreateLicenseRequestDto,
    requesterId: string,
  ): Promise<LicenseRequest> {
    const existing = await this.licenseRequestRepo.findOne({
      where: {
        trackId: dto.trackId,
        requesterId,
        status: LicenseRequestStatus.PENDING,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending request for this track.',
      );
    }

    const request = this.licenseRequestRepo.create({
      ...dto,
      requesterId,
      status: LicenseRequestStatus.PENDING,
    });
    const saved = await this.licenseRequestRepo.save(request);

    // Notify artist (fire-and-forget)
    this.mailService
      .notifyArtistOfNewRequest(saved)
      .catch((err) => console.error('Mail error:', err));

    return saved;
  }

  async getArtistRequests(
    artistId: string,
    trackIds: string[],
  ): Promise<LicenseRequest[]> {
    if (!trackIds.length) return [];
    return this.licenseRequestRepo
      .createQueryBuilder('lr')
      .where('lr.trackId IN (:...trackIds)', { trackIds })
      .orderBy('lr.createdAt', 'DESC')
      .getMany();
  }

  async respondToRequest(
    requestId: string,
    dto: RespondToLicenseRequestDto,
    artistId: string,
    artistTrackIds: string[],
  ): Promise<LicenseRequest> {
    const request = await this.licenseRequestRepo.findOne({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('License request not found.');

    if (!artistTrackIds.includes(request.trackId)) {
      throw new ForbiddenException(
        'You are not authorized to respond to this request.',
      );
    }

    if (request.status !== LicenseRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been responded to.');
    }

    request.status = dto.status;
    request.responseMessage = dto.responseMessage ?? null;
    request.respondedAt = new Date();

    const saved = await this.licenseRequestRepo.save(request);

    // Notify requester
    this.mailService
      .notifyRequesterOfResponse(saved)
      .catch((err) => console.error('Mail error:', err));

    return saved;
  }
}
