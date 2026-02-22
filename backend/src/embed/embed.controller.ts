import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { EmbedService } from './embed.service';
import { RecordEmbedViewDto } from './dto/embed.dto';
import { EmbedTokenGuard } from './guards/embed-token.guard';

@Controller('api/embed/:trackId')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  /**
   * POST /api/embed/:trackId/generate-token
   * Generates (or regenerates) an embed token for the given track.
   * Should be protected by your auth guard (e.g. JwtAuthGuard) in production.
   */
  @Post('generate-token')
  @HttpCode(HttpStatus.CREATED)
  generateToken(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.embedService.generateToken(trackId);
  }

  /**
   * GET /api/embed/:trackId/oembed
   * Returns an oEmbed-compatible JSON response (spec v1.0).
   * ?maxwidth=560&maxheight=152
   */
  @Get('oembed')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getOEmbed(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query('maxwidth') maxWidth?: number,
    @Query('maxheight') maxHeight?: number,
  ) {
    return this.embedService.getOEmbed(trackId, maxWidth, maxHeight);
  }

  /**
   * GET /api/embed/:trackId/meta-tags
   * Returns an HTML snippet with Open Graph + Twitter Card meta tags.
   */
  @Get('meta-tags')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getMetaTags(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Res() res: Response,
  ) {
    const html = await this.embedService.getMetaTags(trackId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * POST /api/embed/:trackId/view
   * Records an embed view. Referrer taken from body or Referer header.
   */
  @Post('view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async recordView(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Body() dto: RecordEmbedViewDto,
    @Headers('referer') refererHeader: string,
    @Req() req: Request,
  ) {
    const referrer =
      dto.referrerDomain ||
      refererHeader ||
      (req.headers['origin'] as string);

    await this.embedService.recordView(trackId, referrer);
  }

  /**
   * GET /api/embed/:trackId/analytics
   * Returns embed analytics for the track.
   * Should be protected by your auth guard in production.
   */
  @Get('analytics')
  getAnalytics(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.embedService.getAnalytics(trackId);
  }

  /**
   * GET /api/embed/:trackId/player-data
   * Returns the player payload. Requires a valid embed token via
   * `x-embed-token` header or `?token=` query param.
   */
  @Get('player-data')
  @UseGuards(EmbedTokenGuard)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  getPlayerData(@Param('trackId', ParseUUIDPipe) trackId: string) {
    return this.embedService.getPlayerData(trackId);
  }
}