import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateFeeConfigDto {
  @ApiProperty({ example: 2.5, description: 'Platform fee percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  feePercentage: number;

  @ApiProperty({ example: 0.1, description: 'Minimum fee in XLM' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumFeeXLM: number;

  @ApiProperty({ example: 100, description: 'Maximum fee cap in XLM' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maximumFeeXLM: number;

  @ApiProperty({ example: false, description: 'Waive fees for verified artists' })
  @IsBoolean()
  waivedForVerifiedArtists: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z', description: 'When this config takes effect' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class FeeLedgerQueryDto {
  @ApiPropertyOptional({ example: '30d', description: 'Period filter: 7d, 30d, 90d, 1y' })
  @IsOptional()
  period?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
