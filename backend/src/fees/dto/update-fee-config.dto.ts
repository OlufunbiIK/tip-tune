import { IsBoolean, IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateFeeConfigDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercentage: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFeeXLM?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumFeeXLM?: number | null;

  @IsOptional()
  @IsBoolean()
  waivedForVerifiedArtists?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

