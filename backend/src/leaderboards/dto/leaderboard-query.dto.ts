import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Timeframe } from '../ranking.service';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    enum: Timeframe,
    default: Timeframe.ALL_TIME,
    description: 'Time period for leaderboard',
  })
  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe = Timeframe.ALL_TIME;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 50,
    description: 'Number of results to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    minimum: 0,
    default: 0,
    description: 'Offset for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by genre (for artist leaderboards)',
  })
  @IsOptional()
  genre?: string;
}
