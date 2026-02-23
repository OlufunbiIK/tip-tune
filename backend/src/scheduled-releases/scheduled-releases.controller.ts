import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ScheduledReleasesService } from "./scheduled-releases.service";
import { PreSavesService } from "./presaves.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateScheduledReleaseDto } from "./dto/create-scheduled-release.dto";
import { UpdateScheduledReleaseDto } from "./dto/update-scheduled-release.dto";

@Controller("scheduled-releases")
export class ScheduledReleasesController {
  constructor(
    private readonly scheduledReleasesService: ScheduledReleasesService,
    private readonly preSavesService: PreSavesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateScheduledReleaseDto, @Request() req) {
    return this.scheduledReleasesService.createScheduledRelease(
      dto.trackId,
      dto.releaseDate,
      dto.notifyFollowers,
    );
  }

  @Get()
  async getUpcoming(@Query("limit") limit?: number) {
    return this.scheduledReleasesService.getUpcomingReleases(
      limit ? parseInt(limit as any) : 20,
    );
  }

  @Get("artist/:artistId")
  async getArtistReleases(@Param("artistId") artistId: string) {
    return this.scheduledReleasesService.getArtistScheduledReleases(artistId);
  }

  @Get("track/:trackId")
  async getByTrackId(@Param("trackId") trackId: string) {
    return this.scheduledReleasesService.getScheduledReleaseByTrackId(trackId);
  }

  @Get("track/:trackId/countdown")
  async getCountdown(@Param("trackId") trackId: string) {
    const release =
      await this.scheduledReleasesService.getScheduledReleaseByTrackId(trackId);

    if (!release) {
      return { countdown: null };
    }

    const now = new Date().getTime();
    const releaseTime = new Date(release.releaseDate).getTime();
    const diff = releaseTime - now;

    if (diff <= 0) {
      return {
        countdown: 0,
        isReleased: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      countdown: diff,
      releaseDate: release.releaseDate,
      days,
      hours,
      minutes,
      seconds,
      isReleased: false,
      presaveCount: release.presaveCount,
    };
  }

  @Get("track/:trackId/analytics")
  async getAnalytics(@Param("trackId") trackId: string) {
    return this.scheduledReleasesService.getAnalytics(trackId);
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    return this.scheduledReleasesService.getScheduledRelease(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateScheduledReleaseDto,
  ) {
    return this.scheduledReleasesService.updateScheduledRelease(
      id,
      dto.releaseDate,
      dto.notifyFollowers,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async cancel(@Param("id") id: string) {
    await this.scheduledReleasesService.cancelScheduledRelease(id);
    return { message: "Scheduled release cancelled successfully" };
  }

  // Pre-save endpoints
  @Post("track/:trackId/presave")
  @UseGuards(JwtAuthGuard)
  async createPreSave(@Param("trackId") trackId: string, @Request() req) {
    return this.preSavesService.createPreSave(req.user.id, trackId);
  }

  @Delete("track/:trackId/presave")
  @UseGuards(JwtAuthGuard)
  async removePreSave(@Param("trackId") trackId: string, @Request() req) {
    await this.preSavesService.removePreSave(req.user.id, trackId);
    return { message: "Pre-save removed successfully" };
  }

  @Get("track/:trackId/presaves")
  async getTrackPreSaves(@Param("trackId") trackId: string) {
    return this.preSavesService.getTrackPreSaves(trackId);
  }

  @Get("user/presaves")
  @UseGuards(JwtAuthGuard)
  async getUserPreSaves(@Request() req) {
    return this.preSavesService.getUserPreSaves(req.user.id);
  }

  @Get("track/:trackId/has-presaved")
  @UseGuards(JwtAuthGuard)
  async hasPreSaved(@Param("trackId") trackId: string, @Request() req) {
    const hasPreSaved = await this.preSavesService.hasPreSaved(
      req.user.id,
      trackId,
    );
    return { hasPreSaved };
  }
}
