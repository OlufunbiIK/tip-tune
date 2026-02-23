import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTipDto {
  @ApiProperty({ description: 'Artist ID receiving the tip', example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  artistId: string;

  @ApiPropertyOptional({ description: 'Track ID (optional)', example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID()
  trackId?: string;

  @ApiPropertyOptional({ description: 'Goal ID (optional)', example: '550e8400-e29b-41d4-a716-446655440003' })
  @IsOptional()
  @IsUUID()
  goalId?: string;

  @ApiProperty({ description: 'Stellar transaction hash', example: 'abc123def456...' })
  @IsString()
  stellarTxHash: string;

  @ApiPropertyOptional({ description: 'Optional message with the tip', example: 'Love your music!' })
  @IsOptional()
  @IsString()
  message?: string;
}
