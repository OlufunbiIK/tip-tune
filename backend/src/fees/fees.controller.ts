import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateFeeConfigDto } from './dto/update-fee-config.dto';

@Controller('fees')
@UseGuards(JwtAuthGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get('configuration')
  async getConfiguration() {
    return this.feesService.getActiveConfiguration();
  }

  @Put('configuration')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateConfiguration(
    @Body() dto: UpdateFeeConfigDto,
    @CurrentUser() admin: User,
  ) {
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined;

    return this.feesService.updateConfiguration(
      {
        feePercentage: dto.feePercentage,
        minimumFeeXLM: dto.minimumFeeXLM,
        maximumFeeXLM: dto.maximumFeeXLM,
        waivedForVerifiedArtists: dto.waivedForVerifiedArtists,
        effectiveFrom,
      },
      admin,
    );
  }

  @Get('ledger')
  async getLedger(
    @Query('period') period = '30d',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNumber = parseInt(page as any, 10) || 1;
    const limitNumber = parseInt(limit as any, 10) || 20;

    return this.feesService.getLedger(period as string, pageNumber, limitNumber);
  }

  @Get('tip/:tipId')
  async getFeeForTip(@Param('tipId') tipId: string) {
    return this.feesService.getFeeByTipId(tipId);
  }

  @Get('summary/artist/:artistId')
  async getArtistSummary(@Param('artistId') artistId: string) {
    return this.feesService.getArtistSummary(artistId);
  }

  @Get('platform-totals')
  async getPlatformTotals() {
    return this.feesService.getPlatformTotals();
  }
}
