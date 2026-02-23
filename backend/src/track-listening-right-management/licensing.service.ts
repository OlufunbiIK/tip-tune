import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackLicense, LicenseType } from "./track-license.entity";
import { LicenseRequest, LicenseRequestStatus } from "./license-request.entity";
import {
  CreateTrackLicenseDto,
  CreateLicenseRequestDto,
  RespondToLicenseRequestDto,
} from "./licensing.dto";
import { LicensingMailService } from './licensing-mail.service';
import { NotificationsService } from "@/notifications/notifications.service";
import { Track } from "@/tracks/entities/track.entity";

@Injectable()
export class LicensingService {
  constructor(
    @InjectRepository(TrackLicense)
    private readonly trackLicenseRepo: Repository<TrackLicense>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(LicenseRequest)
    private readonly licenseRequestRepo: Repository<LicenseRequest>,
    private readonly mailService: LicensingMailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Track License ──────────────────────────────────────────────────────────

  async createOrUpdateLicense(
    trackId: string,
    dto: CreateTrackLicenseDto,
    artistId: string,
  ): Promise<TrackLicense> {
    const track = await this.trackRepo.findOne({
      where: { id: trackId, artistId },
    });
    if (!track) {
      throw new ForbiddenException(
        "You do not have permission to manage this track's license.",
      );
    }

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
    const existing = await this.trackLicenseRepo.findOne({
      where: { trackId },
    });
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
        "You already have a pending request for this track.",
      );
    }

     // Validate track exists before persisting
    const track = await this.trackRepo.findOne({
      where: { id: dto.trackId },
      select: ["artistId"],
    });
    if (!track) {
      throw new NotFoundException(`Track ${dto.trackId} not found.`);
    }

    const request = this.licenseRequestRepo.create({
      ...dto,
      requesterId,
      status: LicenseRequestStatus.PENDING,
    });
    const saved = await this.licenseRequestRepo.save(request);


    if (track.artistId) {
      this.notificationsService
        .create({
          userId: track.artistId,
          type: "LICENSE_REQUEST",
          title: "New License Request",
          message: `A user has requested a license for your track.`,
          data: { requestId: saved.id, trackId: saved.trackId },
        })
        .catch((err) => console.error("Notification error:", err));
    }

    // Notify artist (fire-and-forget)
    this.mailService
      .notifyArtistOfNewRequest(saved)
      .catch((err) => console.error("Mail error:", err));

    return saved;
  }

  async getArtistRequests(
    artistId: string,
    trackIds: string[],
  ): Promise<LicenseRequest[]> {
    if (!trackIds.length) return [];
    return this.licenseRequestRepo
      .createQueryBuilder("lr")
      .where("lr.trackId IN (:...trackIds)", { trackIds })
      .orderBy("lr.createdAt", "DESC")
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

    if (!request) throw new NotFoundException("License request not found.");

    if (!artistTrackIds.includes(request.trackId)) {
      throw new ForbiddenException(
        "You are not authorized to respond to this request.",
      );
    }

    if (request.status !== LicenseRequestStatus.PENDING) {
      throw new BadRequestException("Request has already been responded to.");
    }

    request.status = dto.status;
    request.responseMessage = dto.responseMessage ?? null;
    request.respondedAt = new Date();

    const saved = await this.licenseRequestRepo.save(request);

    this.notificationsService
      .create({
        userId: request.requesterId,
        type: "LICENSE_RESPONSE",
        title: `License Request ${dto.status.toUpperCase()}`,
        message: `Your request for track ${request.trackId} has been ${dto.status}.`,
        data: { requestId: saved.id, status: dto.status },
      })
      .catch((err) => console.error("Notification error:", err));

    // Notify requester
    this.mailService
      .notifyRequesterOfResponse(saved)
      .catch((err) => console.error("Mail error:", err));

    return saved;
  }
}
