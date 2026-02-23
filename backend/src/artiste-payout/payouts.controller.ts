import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PayoutsService } from './payouts.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PayoutRequest } from './entities/payout-request.entity';
import { ArtistBalance } from './entities/artist-balance.entity';

@ApiTags('payouts')
@Controller('api/payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a payout to a Stellar wallet' })
  @ApiResponse({ status: 201, type: PayoutRequest })
  @ApiResponse({ status: 400, description: 'Below minimum threshold or insufficient balance' })
  @ApiResponse({ status: 409, description: 'Duplicate pending payout exists' })
  async requestPayout(@Body() dto: CreatePayoutDto): Promise<PayoutRequest> {
    return this.payoutsService.requestPayout(dto);
  }

  @Get('history/:artistId')
  @ApiOperation({ summary: 'Get payout history for an artist' })
  @ApiParam({ name: 'artistId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: [PayoutRequest] })
  async getHistory(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<PayoutRequest[]> {
    return this.payoutsService.getHistory(artistId);
  }

  @Get('balance/:artistId')
  @ApiOperation({ summary: 'Get artist wallet balance' })
  @ApiParam({ name: 'artistId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: ArtistBalance })
  async getBalance(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<ArtistBalance> {
    return this.payoutsService.getBalance(artistId);
  }

  @Get(':payoutId/status')
  @ApiOperation({ summary: 'Get status of a payout request' })
  @ApiParam({ name: 'payoutId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: PayoutRequest })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async getStatus(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ): Promise<PayoutRequest> {
    return this.payoutsService.getStatus(payoutId);
  }

  @Post(':payoutId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed payout' })
  @ApiParam({ name: 'payoutId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: PayoutRequest })
  @ApiResponse({ status: 400, description: 'Payout is not in failed state' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async retryPayout(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ): Promise<PayoutRequest> {
    return this.payoutsService.retryPayout(payoutId);
  }
}
