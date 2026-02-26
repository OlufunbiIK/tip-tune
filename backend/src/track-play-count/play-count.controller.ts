import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PlayCountService } from './play-count.service';
import { RecordPlayDto } from './dto/record-play.dto';
import {
  RecordPlayResponseDto,
  TrackStatsDto,
  SourceBreakdownDto,
  ArtistOverviewDto,
  TopTracksDto,
} from './dto/play-count-response.dto';

@ApiTags('plays')
@Controller('api/plays')
export class PlayCountController {
  constructor(private readonly playCountService: PlayCountService) {}

  @Post('record')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a track play event' })
  @ApiResponse({ status: 200, type: RecordPlayResponseDto })
  async recordPlay(
    @Body() dto: RecordPlayDto,
    @Req() req: Request,
  ): Promise<RecordPlayResponseDto> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '0.0.0.0';
    return this.playCountService.recordPlay(dto, ip);
  }

  @Get('track/:trackId/stats')
  @ApiOperation({ summary: 'Get streaming stats for a track' })
  @ApiParam({ name: 'trackId', type: String })
  @ApiQuery({ name: 'period', required: false, example: '7d' })
  @ApiResponse({ status: 200, type: TrackStatsDto })
  async getTrackStats(
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Query('period') period = '7d',
  ): Promise<TrackStatsDto> {
    return this.playCountService.getTrackStats(trackId, period);
  }

  @Get('artist/:artistId/overview')
  @ApiOperation({ summary: 'Get streaming overview for an artist' })
  @ApiParam({ name: 'artistId', type: String })
  @ApiResponse({ status: 200, type: ArtistOverviewDto })
  async getArtistOverview(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<ArtistOverviewDto> {
    return this.playCountService.getArtistOverview(artistId);
  }

  @Get('track/:trackId/sources')
  @ApiOperation({ summary: 'Get source attribution breakdown for a track' })
  @ApiParam({ name: 'trackId', type: String })
  @ApiResponse({ status: 200, type: SourceBreakdownDto })
  async getTrackSources(
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<SourceBreakdownDto> {
    return this.playCountService.getTrackSources(trackId);
  }

  @Get('top-tracks')
  @ApiOperation({ summary: 'Get top tracks by play count for a period' })
  @ApiQuery({ name: 'period', required: false, example: '7d' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, type: TopTracksDto })
  async getTopTracks(
    @Query('period') period = '7d',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<TopTracksDto> {
    return this.playCountService.getTopTracks(period, limit);
  }
}
