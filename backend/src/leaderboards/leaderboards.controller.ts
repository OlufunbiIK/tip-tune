import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LeaderboardsService, LeaderboardType } from './leaderboards.service';
import { RankingService, Timeframe } from './ranking.service';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('leaderboards')
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(
    private readonly leaderboardsService: LeaderboardsService,
    private readonly rankingService: RankingService,
  ) {}

  @Get('artists/most-tipped')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most tipped artists leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getArtistMostTipped(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.ARTIST_MOST_TIPPED,
      query,
    );
  }

  @Get('artists/most-played')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most played artists leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getArtistMostPlayed(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.ARTIST_MOST_PLAYED,
      query,
    );
  }

  @Get('artists/fastest-growing')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get fastest growing artists leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getArtistFastestGrowing(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.ARTIST_FASTEST_GROWING,
      query,
    );
  }

  @Get('artists/by-genre/:genre')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get artists leaderboard by genre' })
  @ApiParam({ name: 'genre', description: 'Genre name' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getArtistByGenre(
    @Param('genre') genre: string,
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.ARTIST_BY_GENRE,
      { ...query, genre },
    );
  }

  @Get('tippers/most-generous')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most generous tippers leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTipperMostGenerous(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TIPPER_MOST_GENEROUS,
      query,
    );
  }

  @Get('tippers/most-active')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most active tippers leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTipperMostActive(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TIPPER_MOST_ACTIVE,
      query,
    );
  }

  @Get('tippers/biggest-single')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get biggest single tip leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTipperBiggestSingle(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TIPPER_BIGGEST_SINGLE,
      query,
    );
  }

  @Get('tracks/trending')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get trending tracks leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTrackTrending(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TRACK_TRENDING,
      query,
    );
  }

  @Get('tracks/most-tipped')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most tipped tracks leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTrackMostTipped(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TRACK_MOST_TIPPED,
      query,
    );
  }

  @Get('tracks/most-played')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get most played tracks leaderboard' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getTrackMostPlayed(
    @Query() query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardsService.getLeaderboard(
      LeaderboardType.TRACK_MOST_PLAYED,
      query,
    );
  }
}
