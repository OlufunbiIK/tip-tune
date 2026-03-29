import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetScope } from '../entities/supported-asset.entity';

// ── Create ────────────────────────────────────────────────────────────────────

export class CreateSupportedAssetDto {
  @ApiProperty({ example: 'USDC', description: 'Stellar asset code (max 12 chars)' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 12)
  code: string;

  @ApiPropertyOptional({
    example: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    description: 'Issuing account public key. Omit only for XLM.',
  })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  issuer?: string | null;

  @ApiProperty({ example: 'USD Coin' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 64)
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/usdc.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: 7, minimum: 0, maximum: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(18)
  decimals?: number;

  @ApiPropertyOptional({ enum: AssetScope, default: AssetScope.GLOBAL })
  @IsOptional()
  @IsEnum(AssetScope)
  scope?: AssetScope;

  @ApiPropertyOptional({
    description: 'Required when scope=artist',
    example: 'artist-uuid-here',
  })
  @ValidateIf((o) => o.scope === AssetScope.ARTIST)
  @IsString()
  @IsNotEmpty()
  artistId?: string | null;
}

// ── Update ────────────────────────────────────────────────────────────────────

export class UpdateSupportedAssetDto {
  @ApiPropertyOptional({ example: 'USD Coin (Circle)' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(18)
  decimals?: number;
}

// ── Query / Filter ────────────────────────────────────────────────────────────

export class ListAssetsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by artist id to include artist-scoped assets' })
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional({ description: 'Filter to enabled assets only', example: true })
  @IsOptional()
  enabledOnly?: boolean;
}

// ── Resolve ───────────────────────────────────────────────────────────────────

export class ResolveAssetQueryDto {
  @ApiProperty({ example: 'USDC' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    example: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    description: 'Required for non-XLM assets',
  })
  @IsOptional()
  @IsString()
  issuer?: string;
}
