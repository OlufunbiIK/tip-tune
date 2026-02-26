import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { KeywordSeverity } from './entities/blocked-keyword.entity';
import { ReviewAction } from './entities/message-moderation-log.entity';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('keywords')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async addKeyword(
    @Body()
    body: { keyword: string; severity: KeywordSeverity },
    @CurrentUser() admin: User,
  ) {
    return this.moderationService.addGlobalKeyword(
      body.keyword,
      body.severity,
      admin,
    );
  }

  @Delete('keywords/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteKeyword(@Param('id') id: string) {
    await this.moderationService.deleteKeyword(id);
    return { success: true };
  }

  @Get('queue')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getQueue(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNumber = parseInt(page as any, 10) || 1;
    const limitNumber = parseInt(limit as any, 10) || 20;
    return this.moderationService.getModerationQueue(pageNumber, limitNumber);
  }

  @Put('queue/:logId/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reviewLog(
    @Param('logId') logId: string,
    @Body() body: { action: ReviewAction },
    @CurrentUser() admin: User,
  ) {
    return this.moderationService.reviewModerationLog(
      logId,
      body.action,
      admin,
    );
  }

  @Post('artist/keywords')
  async addArtistKeyword(
    @Body()
    body: { keyword: string; severity: KeywordSeverity },
    @CurrentUser() user: User,
  ) {
    return this.moderationService.addArtistKeyword(
      body.keyword,
      body.severity,
      user,
    );
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.moderationService.getStats();
  }
}

