import {
  IsEnum,
  IsOptional,
  IsPositive,
  IsInt,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '../entities/referral-code.entity';

export class GenerateReferralCodeDto {
  @ApiProperty({ enum: RewardType, example: RewardType.XLM_BONUS })
  @IsEnum(RewardType)
  rewardType: RewardType;

  @ApiProperty({ example: 10.5, description: 'Reward value (XLM amount, discount %, etc.)' })
  @IsNumber()
  @IsPositive()
  rewardValue: number;

  @ApiPropertyOptional({ example: 100, description: 'Max number of times code can be used' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUsages?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ReferralCodeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: RewardType }) rewardType: RewardType;
  @ApiProperty() rewardValue: number;
  @ApiProperty() usageCount: number;
  @ApiPropertyOptional() maxUsages?: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() expiresAt?: Date;
  @ApiProperty() shareableLink: string;
  @ApiProperty() createdAt: Date;
}

export class ReferralStatsDto {
  @ApiProperty() totalReferrals: number;
  @ApiProperty() claimedRewards: number;
  @ApiProperty() pendingRewards: number;
  @ApiProperty() totalRewardValue: number;
  @ApiProperty() codeUsageCount: number;
}

export class LeaderboardEntryDto {
  @ApiProperty() rank: number;
  @ApiProperty() userId: string;
  @ApiProperty() totalReferrals: number;
  @ApiProperty() claimedRewards: number;
}

export class ApplyReferralResponseDto {
  @ApiProperty() message: string;
  @ApiProperty() referralId: string;
  @ApiProperty() referrerId: string;
}
