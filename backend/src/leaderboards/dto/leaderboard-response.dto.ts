import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rank: number;

  @ApiProperty({ required: false })
  previousRank?: number;

  @ApiProperty({ required: false })
  change?: number;

  @ApiProperty()
  score: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty({ required: false })
  additionalData?: Record<string, any>;
}

export class LeaderboardResponseDto {
  @ApiProperty({ type: [LeaderboardEntryDto] })
  entries: LeaderboardEntryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  timeframe: string;

  @ApiProperty()
  updatedAt: Date;
}
