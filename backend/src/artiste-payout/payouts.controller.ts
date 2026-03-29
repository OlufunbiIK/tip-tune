import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PayoutsService } from "./payouts.service";
import { PayoutRequest } from "./payout-request.entity";
import { CreatePayoutDto } from "./create-payout.dto";
import { ArtistBalance } from "./artist-balance.entity";
import {
  CurrentUser,
  CurrentUserData,
} from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("payouts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post("request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Request a payout to the authenticated artist wallet and queue it for settlement",
  })
  @ApiResponse({ status: 201, type: PayoutRequest })
  @ApiResponse({
    status: 400,
    description: "Below minimum threshold or insufficient balance",
  })
  @ApiResponse({ status: 403, description: "Wallet ownership validation failed" })
  @ApiResponse({ status: 409, description: "Duplicate pending payout exists" })
  async requestPayout(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreatePayoutDto,
  ): Promise<PayoutRequest> {
    return this.payoutsService.requestPayout(user.userId, dto);
  }

  @Get("history/:artistId")
  @ApiOperation({ summary: "Get payout history for an artist" })
  @ApiParam({ name: "artistId", type: String, format: "uuid" })
  @ApiResponse({ status: 200, type: [PayoutRequest] })
  @ApiResponse({ status: 403, description: "Artist ownership validation failed" })
  async getHistory(
    @CurrentUser() user: CurrentUserData,
    @Param("artistId", ParseUUIDPipe) artistId: string,
  ): Promise<PayoutRequest[]> {
    return this.payoutsService.getHistory(user.userId, artistId);
  }

  @Get("balance/:artistId")
  @ApiOperation({ summary: "Get artist wallet balance" })
  @ApiParam({ name: "artistId", type: String, format: "uuid" })
  @ApiResponse({ status: 200, type: ArtistBalance })
  @ApiResponse({ status: 403, description: "Artist ownership validation failed" })
  async getBalance(
    @CurrentUser() user: CurrentUserData,
    @Param("artistId", ParseUUIDPipe) artistId: string,
  ): Promise<ArtistBalance> {
    return this.payoutsService.getBalance(user.userId, artistId);
  }

  @Get(":payoutId/status")
  @ApiOperation({ summary: "Get status of a payout request" })
  @ApiParam({ name: "payoutId", type: String, format: "uuid" })
  @ApiResponse({ status: 200, type: PayoutRequest })
  @ApiResponse({ status: 403, description: "Artist ownership validation failed" })
  @ApiResponse({ status: 404, description: "Payout not found" })
  async getStatus(
    @CurrentUser() user: CurrentUserData,
    @Param("payoutId", ParseUUIDPipe) payoutId: string,
  ): Promise<PayoutRequest> {
    return this.payoutsService.getStatus(user.userId, payoutId);
  }

  @Post(":payoutId/retry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retry a failed payout by re-queueing it for settlement",
  })
  @ApiParam({ name: "payoutId", type: String, format: "uuid" })
  @ApiResponse({ status: 200, type: PayoutRequest })
  @ApiResponse({ status: 400, description: "Payout is not in failed state" })
  @ApiResponse({ status: 403, description: "Artist ownership validation failed" })
  @ApiResponse({ status: 404, description: "Payout not found" })
  async retryPayout(
    @CurrentUser() user: CurrentUserData,
    @Param("payoutId", ParseUUIDPipe) payoutId: string,
  ): Promise<PayoutRequest> {
    return this.payoutsService.retryPayout(user.userId, payoutId);
  }
}
