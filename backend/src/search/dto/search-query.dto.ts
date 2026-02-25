import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArtistStatus } from '../../artists/entities/artist.entity';

export const SEARCH_TYPES = ['artist', 'track'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SORT_OPTIONS = [
  'relevance',
  'recent',
  'popular',
  'alphabetical',
  'popular_tips',
  'popular_plays',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (artist names, track titles, genres, bios)',
    example: 'rock',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by type: artist, track, or both when omitted',
    enum: SEARCH_TYPES,
    example: 'track',
  })
  @IsOptional()
  @IsIn(SEARCH_TYPES)
  type?: SearchType;

  @ApiPropertyOptional({
    description: 'Filter by genre',
    example: 'pop',
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({
    description: 'Filter artists by status',
    enum: ArtistStatus,
    example: ArtistStatus.ACCEPTING_REQUESTS,
  })
  @IsOptional()
  @IsIn(Object.values(ArtistStatus))
  status?: ArtistStatus;

  @ApiPropertyOptional({
    description: 'Filter artists by country (ISO 3166-1 alpha-2 code)',
    example: 'NG',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter artists by city (partial case-insensitive match)',
    example: 'Lagos',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Only return artists with public location set',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasLocation?: boolean;

  @ApiPropertyOptional({
    description: 'Only return verified artists',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Release date from (YYYY-MM-DD)',
    example: '2020-01-01',
  })
  @IsOptional()
  @IsDateString()
  releaseDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Release date to (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  releaseDateTo?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SORT_OPTIONS,
    default: 'relevance',
  })
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: SortOption = 'relevance';

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
