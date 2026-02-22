import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TrendsQueryDto,
  RankingsQueryDto,
  AnalyticsPeriod,
} from './dto/analytics-query.dto';
import {
  TipSummaryDto,
  TrendsResponseDto,
  RankingsResponseDto,
  GenreDistributionResponseDto,
  ArtistAnalyticsDto,
} from './dto/analytics-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('tips/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tip summary statistics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'artistId', required: false })
  @ApiResponse({ status: 200, description: 'Tip summary data' })
  async getTipSummary(@Query() query: AnalyticsQueryDto): Promise<TipSummaryDto> {
    return this.analyticsService.getTipSummary(query);
  }

  @Get('tips/trends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tip trends over time' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiQuery({ name: 'groupBy', enum: ['hour', 'day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'artistId', required: false })
  @ApiResponse({ status: 200, description: 'Tip trends data' })
  async getTipTrends(@Query() query: TrendsQueryDto): Promise<TrendsResponseDto> {
    return this.analyticsService.getTipTrends(query);
  }

  @Get('artists/rankings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get artist rankings by tips received' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiQuery({ name: 'genre', required: false })
  @ApiResponse({ status: 200, description: 'Artist rankings' })
  async getArtistRankings(@Query() query: RankingsQueryDto): Promise<RankingsResponseDto> {
    return this.analyticsService.getArtistRankings(query);
  }

  @Get('genres/distribution')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tip distribution by genre' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  @ApiResponse({ status: 200, description: 'Genre distribution data' })
  async getGenreDistribution(
    @Query() query: AnalyticsQueryDto,
  ): Promise<GenreDistributionResponseDto> {
    return this.analyticsService.getGenreDistribution(query);
  }

  @Get('artists/:id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed analytics for a specific artist' })
  @ApiResponse({ status: 200, description: 'Artist analytics' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async getArtistAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArtistAnalyticsDto> {
    return this.analyticsService.getArtistAnalytics(id);
  }

  @Get('export/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export analytics report' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json', 'xlsx'], required: false })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  async exportReport(
    @Param('type') type: 'tips' | 'artists' | 'genres',
    @Query('format') format: 'csv' | 'json' | 'xlsx' = 'json',
    @Query() query: AnalyticsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.analyticsService.exportReport(type, query, format);

    const contentType =
      format === 'csv'
        ? 'text/csv'
        : format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);

    if (format === 'json') {
      res.status(HttpStatus.OK).json(report.data);
    } else {
      res.status(HttpStatus.OK).send(report.data);
    }
  }
}
