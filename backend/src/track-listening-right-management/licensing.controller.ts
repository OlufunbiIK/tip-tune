import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LicensingService } from './licensing.service';
import {
  CreateTrackLicenseDto,
  CreateLicenseRequestDto,
  RespondToLicenseRequestDto,
} from './dto/licensing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Authenticated request shape expected from JwtAuthGuard.
 * Adjust to match your actual JWT payload.
 */
interface AuthRequest extends Request {
  user: {
    id: string;
    trackIds?: string[]; // IDs of tracks owned by the authenticated artist
  };
}

@Controller('api/licenses')
@UseGuards(JwtAuthGuard)
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  // ── Track License CRUD ───────────────────────────────────────────────────

  /**
   * POST /api/licenses/track/:trackId
   * Create or update the license for a track (artist only).
   */
  @Post('track/:trackId')
  async upsertLicense(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() dto: CreateTrackLicenseDto,
    @Request() req: AuthRequest,
  ) {
    return this.licensingService.createOrUpdateLicense(trackId, dto, req.user.id);
  }

  /**
   * GET /api/licenses/track/:trackId
   * Retrieve licensing info for a track (public).
   */
  @Get('track/:trackId')
  async getLicense(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.licensingService.getLicenseByTrack(trackId);
  }

  // ── License Requests ─────────────────────────────────────────────────────

  /**
   * POST /api/licenses/request
   * Submit a license request for a track.
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Body() dto: CreateLicenseRequestDto,
    @Request() req: AuthRequest,
  ) {
    return this.licensingService.createLicenseRequest(dto, req.user.id);
  }

  /**
   * GET /api/licenses/requests/artist
   * List all license requests for the authenticated artist's tracks.
   */
  @Get('requests/artist')
  async getArtistRequests(@Request() req: AuthRequest) {
    const trackIds = req.user.trackIds ?? [];
    return this.licensingService.getArtistRequests(req.user.id, trackIds);
  }

  /**
   * PUT /api/licenses/requests/:requestId/respond
   * Approve or reject a license request (artist only).
   */
  @Put('requests/:requestId/respond')
  async respondToRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RespondToLicenseRequestDto,
    @Request() req: AuthRequest,
  ) {
    const trackIds = req.user.trackIds ?? [];
    return this.licensingService.respondToRequest(
      requestId,
      dto,
      req.user.id,
      trackIds,
    );
  }
}
