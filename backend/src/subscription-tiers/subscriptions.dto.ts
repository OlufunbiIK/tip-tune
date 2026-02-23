import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '../entities/artist-subscription.entity';

// ─── Subscription Tier DTOs ─────────────────────────────────────────────────

export class CreateSubscriptionTierDto {
  @IsUUID()
  artistId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  @Type(() => Number)
  priceXLM: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceUSD: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perks?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxSubscribers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubscriptionTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  @Type(() => Number)
  priceXLM?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  priceUSD?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  perks?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxSubscribers?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Artist Subscription DTOs ────────────────────────────────────────────────

export class CreateArtistSubscriptionDto {
  @IsUUID()
  tierId: string;

  @IsString()
  stellarTxHash: string;
}

export class PauseSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus.PAUSED | SubscriptionStatus.ACTIVE;
}

export class SubscriptionQueryDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
