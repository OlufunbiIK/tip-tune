import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionTierDto,
  UpdateSubscriptionTierDto,
  CreateArtistSubscriptionDto,
  SubscriptionQueryDto,
} from './dto/subscriptions.dto';

/**
 * JWT guard import — adjust path to match your project layout.
 * Replace with your actual guard: e.g. `import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'`
 */
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─── Tier Endpoints ────────────────────────────────────────────────────────

  /**
   * POST /api/subscriptions/tiers
   * Create a new subscription tier (artist action).
   */
  @Post('tiers')
  async createTier(
    @Body() dto: CreateSubscriptionTierDto,
    @Request() req: any,
  ) {
    // Enforce that the artistId in the DTO matches the requesting artist
    return this.subscriptionsService.createTier(dto);
  }

  /**
   * GET /api/subscriptions/tiers/:artistId
   * List all active tiers for an artist.
   */
  @Get('tiers/:artistId')
  async getTiersByArtist(@Param('artistId', ParseUUIDPipe) artistId: string) {
    return this.subscriptionsService.getTiersByArtist(artistId);
  }

  /**
   * PATCH /api/subscriptions/tiers/:tierId
   * Update a tier (artist action).
   */
  @Patch('tiers/:tierId')
  async updateTier(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: UpdateSubscriptionTierDto,
    @Request() req: any,
  ) {
    return this.subscriptionsService.updateTier(tierId, req.user.artistId, dto);
  }

  /**
   * DELETE /api/subscriptions/tiers/:tierId
   * Delete a tier (artist action, only if no subscribers).
   */
  @Delete('tiers/:tierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTier(
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Request() req: any,
  ) {
    await this.subscriptionsService.deleteTier(tierId, req.user.artistId);
  }

  // ─── Subscription Endpoints ────────────────────────────────────────────────

  /**
   * POST /api/subscriptions/subscribe
   * Fan subscribes to a tier.
   */
  @Post('subscribe')
  async subscribe(
    @Body() dto: CreateArtistSubscriptionDto,
    @Request() req: any,
  ) {
    return this.subscriptionsService.subscribe(req.user.id, dto);
  }

  /**
   * DELETE /api/subscriptions/:subscriptionId/cancel
   * Fan cancels their subscription.
   */
  @Delete(':subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Request() req: any,
  ) {
    return this.subscriptionsService.cancelSubscription(
      subscriptionId,
      req.user.id,
    );
  }

  /**
   * PATCH /api/subscriptions/:subscriptionId/pause
   * Fan pauses their subscription.
   */
  @Patch(':subscriptionId/pause')
  async pauseSubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Request() req: any,
  ) {
    return this.subscriptionsService.pauseSubscription(
      subscriptionId,
      req.user.id,
    );
  }

  /**
   * PATCH /api/subscriptions/:subscriptionId/resume
   * Fan resumes a paused subscription.
   */
  @Patch(':subscriptionId/resume')
  async resumeSubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Request() req: any,
  ) {
    return this.subscriptionsService.resumeSubscription(
      subscriptionId,
      req.user.id,
    );
  }

  /**
   * GET /api/subscriptions/my-subscriptions
   * Fan retrieves their subscriptions.
   */
  @Get('my-subscriptions')
  async getMySubscriptions(
    @Request() req: any,
    @Query() query: SubscriptionQueryDto,
  ) {
    return this.subscriptionsService.getMySubscriptions(req.user.id, query);
  }

  /**
   * GET /api/subscriptions/artist/:artistId/subscribers
   * Artist views their subscriber list.
   */
  @Get('artist/:artistId/subscribers')
  async getArtistSubscribers(
    @Param('artistId', ParseUUIDPipe) artistId: string,
    @Query() query: SubscriptionQueryDto,
  ) {
    return this.subscriptionsService.getArtistSubscribers(artistId, query);
  }

  /**
   * GET /api/subscriptions/artist/:artistId/revenue
   * Artist views their subscription revenue breakdown (separate from tips).
   */
  @Get('artist/:artistId/revenue')
  async getSubscriptionRevenue(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ) {
    return this.subscriptionsService.getSubscriptionRevenue(artistId);
  }
}
