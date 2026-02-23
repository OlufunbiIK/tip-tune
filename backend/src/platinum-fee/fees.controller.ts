import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { UpdateFeeConfigDto, FeeLedgerQueryDto } from './dto/update-fee-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Fees')
@ApiBearerAuth()
@Controller('api/fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ─── Configuration ────────────────────────────────────────────────────────

  @Get('configuration')
  @ApiOperation({ summary: 'Get active fee configuration' })
  @ApiResponse({ status: 200, description: 'Active fee configuration' })
  async getConfiguration() {
    return this.feesService.getActiveConfiguration();
  }

  @Get('configuration/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get fee configuration history (admin only)' })
  @ApiResponse({ status: 200, description: 'All historical fee configurations' })
  async getConfigurationHistory() {
    return this.feesService.getConfigurationHistory();
  }

  @Put('configuration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update fee configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'New fee configuration created' })
  @ApiResponse({ status: 400, description: 'Invalid configuration values' })
  async updateConfiguration(
    @Body() dto: UpdateFeeConfigDto,
    @Request() req: any,
  ) {
    return this.feesService.updateConfiguration(dto, req.user.id);
  }

  // ─── Ledger & Reporting ───────────────────────────────────────────────────

  @Get('ledger')
  @ApiOperation({ summary: 'Get paginated fee ledger' })
  @ApiQuery({ name: 'period', required: false, example: '30d' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated fee ledger' })
  async getFeeLedger(@Query() query: FeeLedgerQueryDto) {
    return this.feesService.getFeeLedger(query);
  }

  @Get('platform-totals')
  @ApiOperation({ summary: 'Get platform-wide fee aggregations' })
  @ApiQuery({ name: 'period', required: false, example: '30d' })
  @ApiResponse({ status: 200, description: 'Aggregated platform fee totals' })
  async getPlatformTotals(@Query('period') period?: string) {
    return this.feesService.getPlatformTotals(period);
  }

  // ─── Tip & Artist Specific ─────────────────────────────────────────────────

  @Get('tip/:tipId')
  @ApiOperation({ summary: 'Get fee record for a specific tip' })
  @ApiParam({ name: 'tipId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Fee record for the tip' })
  @ApiResponse({ status: 404, description: 'Fee record not found' })
  async getFeeByTip(@Param('tipId', ParseUUIDPipe) tipId: string) {
    return this.feesService.getFeeByTipId(tipId);
  }

  @Get('summary/artist/:artistId')
  @ApiOperation({ summary: 'Get fee summary for a specific artist' })
  @ApiParam({ name: 'artistId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Artist fee summary' })
  async getArtistFeeSummary(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ) {
    return this.feesService.getArtistFeeSummary(artistId);
  }
}
