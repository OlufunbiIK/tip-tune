import {
  Controller,
  Put,
  Delete,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ArtistStatusService } from './artist-status.service';
import { SetArtistStatusDto } from './dto/set-artist-status.dto';
import { ArtistStatusResponseDto } from './dto/artist-status-response.dto';
import { StatusHistoryResponseDto } from './dto/status-history-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('artist-status')
@Controller('artists')
export class ArtistStatusController {
  constructor(private readonly artistStatusService: ArtistStatusService) {}

  /**
   * Set or update artist status
   * Authenticated artists can only set their own status
   */
  @Put(':artistId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Set or update artist status' })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({
    status: 200,
    description: 'Status set successfully',
    type: ArtistStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async setStatus(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SetArtistStatusDto,
  ): Promise<ArtistStatusResponseDto> {
    // TODO: Verify user owns this artist profile
    return this.artistStatusService.setStatus(artistId, dto);
  }

  /**
   * Get current status for an artist (public endpoint)
   */
  @Get(':artistId/status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get artist current status' })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({
    status: 200,
    description: 'Artist status',
    type: ArtistStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async getStatus(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<ArtistStatusResponseDto> {
    return this.artistStatusService.getStatus(artistId);
  }

  /**
   * Clear artist status (reset to active)
   */
  @Delete(':artistId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Clear artist status (reset to active)' })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({ status: 204, description: 'Status cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Status not found' })
  async clearStatus(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    // TODO: Verify user owns this artist profile
    return this.artistStatusService.clearStatus(artistId);
  }

  /**
   * Get status history for an artist (last 20 entries, public endpoint)
   */
  @Get(':artistId/status/history')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get artist status history (last 20 entries)' })
  @ApiParam({ name: 'artistId', description: 'Artist UUID' })
  @ApiResponse({
    status: 200,
    description: 'Status history',
    type: [StatusHistoryResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async getStatusHistory(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<StatusHistoryResponseDto[]> {
    return this.artistStatusService.getStatusHistory(artistId);
  }
}
