import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaySource } from '../entities/track-play.entity';

export class RecordPlayResponseDto {
  @ApiProperty()
  counted: boolean;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  playId?: string;
}

export class TrackStatsDto {
  @ApiProperty()
  trackId: string;

  @ApiProperty()
  totalPlays: number;

  @ApiProperty()
  uniqueListeners: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  skipRate: number;

  @ApiProperty()
  avgListenDuration: number;

  @ApiProperty()
  period: string;
}

export class SourceBreakdownDto {
  @ApiProperty()
  trackId: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  sources: Record<PlaySource, number>;
}

export class ArtistOverviewDto {
  @ApiProperty()
  artistId: string;

  @ApiProperty()
  totalPlays: number;

  @ApiProperty()
  uniqueListeners: number;

  @ApiProperty()
  totalTracks: number;

  @ApiProperty()
  avgCompletionRate: number;

  @ApiProperty()
  topTracks: TopTrackDto[];
}

export class TopTrackDto {
  @ApiProperty()
  trackId: string;

  @ApiProperty()
  plays: number;

  @ApiProperty()
  completionRate: number;
}

export class TopTracksDto {
  @ApiProperty()
  period: string;

  @ApiProperty({ type: [TopTrackDto] })
  tracks: TopTrackDto[];
}
