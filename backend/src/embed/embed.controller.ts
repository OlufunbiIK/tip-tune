import {
  Controller, Post, Get, Param, Body,
  Req, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { EmbedService } from './embed.service';

@ApiTags('embed')
@Controller('embed')
export class EmbedController {
  constructor(private readonly embedService: EmbedService) {}

  @Post(':trackId/generate-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate embed token for a track' })
  generateToken(@Param('trackId') trackId: string) {
    const token = this.embedService.generateEmbedToken(trackId);
    return { token };
  }

  @Get(':trackId/oembed')
  @ApiOperation({ summary: 'oEmbed endpoint for rich link previews' })
  getOEmbed(@Param('trackId') trackId: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.embedService.getOEmbed(trackId, baseUrl);
  }

  @Get(':trackId/meta-tags')
  @ApiOperation({ summary: 'Open Graph and Twitter Card meta tags' })
  getMetaTags(@Param('trackId') trackId: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.embedService.getMetaTags(trackId, baseUrl);
  }

  @Post(':trackId/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record an embed view' })
  recordView(@Param('trackId') trackId: string, @Req() req: Request) {
    const referrer = req.get('referer') || null;
    const domain = req.get('host') || 'unknown';
    return this.embedService.recordView(trackId, referrer, domain);
  }

  @Get(':trackId/analytics')
  @ApiOperation({ summary: 'Embed analytics per domain' })
  getAnalytics(@Param('trackId') trackId: string) {
    return this.embedService.getAnalytics(trackId);
  }

  @Get(':trackId/player-data')
  @ApiOperation({ summary: 'Get player data for embed (requires token)' })
  getPlayerData(
    @Param('trackId') trackId: string,
    @Query('token') token: string,
  ) {
    return this.embedService.getPlayerData(trackId, token);
  }
}