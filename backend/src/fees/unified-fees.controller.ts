import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UnifiedFeesService, UpdateFeeConfigDto, FeeLedgerQueryDto } from './unified-fees.service';

@ApiTags('Platform Fees')
@Controller('fees')
export class UnifiedFeesController {
  constructor(private readonly feesService: UnifiedFeesService) {}

  @Get('configuration')
  @ApiOperation({ summary: 'Get active fee configuration' })
  @ApiResponse({ status: 200, description: 'Active fee configuration' })
  async getActiveConfiguration() {
    return this.feesService.getActiveConfiguration();
  }

  @Get('configuration/history')
  @ApiOperation({ summary: 'Get fee configuration history' })
  @ApiResponse({ status: 200, description: 'Historical fee configurations' })
  async getConfigurationHistory() {
    return this.feesService.getConfigurationHistory();
  }

  @Post('configuration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update fee configuration (admin only)' })
  @ApiResponse({ status: 201, description: 'Fee configuration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConfiguration(
    @Body() updateConfigDto: UpdateFeeConfigDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.feesService.updateConfiguration(updateConfigDto, user.id);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get fee ledger with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated fee ledger' })
  async getFeeLedger(@Query() query: FeeLedgerQueryDto) {
    return this.feesService.getFeeLedger(query);
  }

  @Get('totals')
  @ApiOperation({ summary: 'Get platform fee totals' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Platform fee totals and statistics' })
  async getPlatformTotals(@Query('period') period?: string) {
    return this.feesService.getPlatformTotals(period);
  }

  @Get('artist/:artistId/summary')
  @ApiOperation({ summary: 'Get fee summary for a specific artist' })
  @ApiParam({ name: 'artistId', description: 'Artist ID' })
  @ApiResponse({ status: 200, description: 'Artist fee summary' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async getArtistFeeSummary(@Param('artistId', ParseUUIDPipe) artistId: string) {
    return this.feesService.getArtistFeeSummary(artistId);
  }

  @Get('tip/:tipId')
  @ApiOperation({ summary: 'Get fee record for a specific tip' })
  @ApiParam({ name: 'tipId', description: 'Tip ID' })
  @ApiResponse({ status: 200, description: 'Fee record for tip' })
  @ApiResponse({ status: 404, description: 'Fee record not found' })
  async getFeeByTipId(@Param('tipId', ParseUUIDPipe) tipId: string) {
    return this.feesService.getFeeByTipId(tipId);
  }

  @Put(':feeId/collect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark fee as collected (admin only)' })
  @ApiParam({ name: 'feeId', description: 'Fee ID' })
  @ApiResponse({ status: 200, description: 'Fee marked as collected' })
  @ApiResponse({ status: 400, description: 'Cannot collect waived fee' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Fee not found' })
  async markFeeCollected(
    @Param('feeId', ParseUUIDPipe) feeId: string,
    @Body('stellarTxHash') stellarTxHash: string,
  ) {
    return this.feesService.markFeeCollected(feeId, stellarTxHash);
  }
}
