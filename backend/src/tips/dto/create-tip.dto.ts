import { IsString, IsUUID, IsOptional, IsBoolean, IsNumber, MaxLength, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipType } from '../entities/tip.entity';

export { TipType };

export class CreateTipDto {
  @ApiProperty({
    description: 'Artist ID to receive the tip',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  artistId: string;

  @ApiPropertyOptional({
    description: 'Track ID (optional - tips can be for artist only)',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @IsOptional()
  @IsUUID()
  trackId?: string;

  @ApiProperty({
    description: 'Stellar transaction hash',
    example: 'c6e0b3e5c8a4f2d1b9a7e6f3c5d8a2b1c4e7f0a9b3d6e9f2c5a8b1e4f7a0c3d6',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  stellarTxHash: string;

  @ApiPropertyOptional({
    description: 'Optional message from sender',
    example: 'Love your music! Keep up the great work!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({
    description: 'Whether the tip should be anonymous',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the tip should be public',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Tip type',
    enum: TipType,
    example: TipType.TRACK,
    default: TipType.ARTIST,
  })
  @IsOptional()
  @IsEnum(TipType)
  type?: TipType;

  @ApiProperty({
    description: 'Asset Code (default XLM)',
    example: 'USDC',
    default: 'XLM',
    maxLength: 12,
  })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  assetCode?: string;

  @ApiPropertyOptional({
    description: 'Asset Issuer (required for non-native assets)',
    example: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    maxLength: 56,
  })
  @IsOptional()
  @IsString()
  @MaxLength(56)
  assetIssuer?: string;

  @ApiPropertyOptional({
    description: 'Exchange rate for fiat conversion',
    example: 0.089,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({
    description: 'Fiat currency code',
    example: 'USD',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  fiatCurrency?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON string',
    example: '{"source": "mobile_app", "campaign": "summer2023"}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}

export class TipVerificationDto {
  @ApiProperty({
    description: 'Stellar transaction hash to verify',
    example: 'c6e0b3e5c8a4f2d1b9a7e6f3c5d8a2b1c4e7f0a9b3d6e9f2c5a8b1e4f7a0c3d6',
  })
  @IsString()
  @MaxLength(64)
  stellarTxHash: string;
}

export class TipResponseDto {
  @ApiProperty({
    description: 'Tip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Artist ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  artistId: string;

  @ApiPropertyOptional({
    description: 'Track ID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  trackId?: string;

  @ApiProperty({
    description: 'Stellar transaction hash',
    example: 'c6e0b3e5c8a4f2d1b9a7e6f3c5d8a2b1c4e7f0a9b3d6e9f2c5a8b1e4f7a0c3d6',
  })
  stellarTxHash: string;

  @ApiProperty({
    description: 'Sender Stellar address',
    example: 'GD5DJQDQKPJ2R5XGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5Q',
  })
  senderAddress: string;

  @ApiProperty({
    description: 'Receiver Stellar address',
    example: 'GB5XVAABE5R7D5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5QGQZ5Q',
  })
  receiverAddress: string;

  @ApiProperty({
    description: 'Tip amount in XLM',
    example: 10.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Asset type',
    example: 'XLM',
  })
  asset: string;

  @ApiPropertyOptional({
    description: 'Message from sender',
    example: 'Love your music!',
  })
  message?: string;

  @ApiProperty({
    description: 'Tip status',
    enum: ['pending', 'verified', 'failed', 'reversed'],
    example: 'verified',
  })
  status: string;

  @ApiProperty({
    description: 'Tip type',
    enum: TipType,
    example: TipType.TRACK,
  })
  type: TipType;

  @ApiPropertyOptional({
    description: 'Verification timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  verifiedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Artist information',
  })
  artist?: any;

  @ApiPropertyOptional({
    description: 'Track information',
  })
  track?: any;
}
