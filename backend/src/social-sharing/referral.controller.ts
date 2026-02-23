import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import {
  GenerateReferralCodeDto,
  ReferralCodeResponseDto,
  ReferralStatsDto,
  LeaderboardEntryDto,
  ApplyReferralResponseDto,
} from './dto/referral.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('generate-code')
  @ApiOperation({ summary: 'Generate a new referral code for the authenticated user' })
  @ApiResponse({ status: 201, type: ReferralCodeResponseDto })
  async generateCode(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateReferralCodeDto,
  ): Promise<ReferralCodeResponseDto> {
    return this.referralService.generateCode(userId, dto);
  }

  @Get('my-code')
  @ApiOperation({ summary: 'Get current active referral code for the authenticated user' })
  @ApiResponse({ status: 200, type: ReferralCodeResponseDto })
  async getMyCode(
    @CurrentUser('id') userId: string,
  ): Promise<ReferralCodeResponseDto> {
    return this.referralService.getMyCode(userId);
  }

  @Post('apply/:code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a referral code during registration flow' })
  @ApiParam({ name: 'code', description: '8-character referral code', example: 'AB3XYZ78' })
  @ApiResponse({ status: 200, type: ApplyReferralResponseDto })
  @ApiResponse({ status: 400, description: 'Self-referral or invalid code' })
  @ApiResponse({ status: 409, description: 'User already referred' })
  async applyCode(
    @Param('code') code: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApplyReferralResponseDto> {
    return this.referralService.applyCode(code.toUpperCase(), userId);
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get referral statistics for a user' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  @ApiResponse({ status: 200, type: ReferralStatsDto })
  async getStats(@Param('userId') userId: string): Promise<ReferralStatsDto> {
    return this.referralService.getStats(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top referrers leaderboard' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
  async getLeaderboard(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<LeaderboardEntryDto[]> {
    return this.referralService.getLeaderboard(Math.min(limit, 50));
  }
}
