import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDate, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitiseAsPlainText, SanitiseAsRichText } from '../../common/utils/sanitise.util';

export enum Genre {
  ROCK = 'rock',
  POP = 'pop',
  JAZZ = 'jazz',
  CLASSICAL = 'classical',
  ELECTRONIC = 'electronic',
  HIP_HOP = 'hip-hop',
  COUNTRY = 'country',
  R_B = 'r-b',
  METAL = 'metal',
  INDIE = 'indie',
  OTHER = 'other',
}

export class CreateTrackDto {
  @ApiProperty({
    description: 'Track title',
    example: 'My Awesome Track',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @SanitiseAsPlainText()
  title: string;

  @ApiPropertyOptional({
    description: 'Artist ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @ApiPropertyOptional({
    description: 'Track duration in seconds',
    example: 180,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    description: 'Audio file URL',
    example: 'https://example.com/audio.mp3',
  })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({
    description: 'Cover art URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverArtUrl?: string;

  @ApiPropertyOptional({
    description: 'Track genre',
    enum: Genre,
    example: Genre.ROCK,
  })
  @IsOptional()
  @IsEnum(Genre)
  genre?: string;

  @ApiPropertyOptional({
    description: 'Release date',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDate()
  releaseDate?: Date;

  @ApiPropertyOptional({
    description: 'Track description',
    example: 'A great track about life',
  })
  @IsOptional()
  @IsString()
  @SanitiseAsRichText()
  description?: string;

  @ApiPropertyOptional({
    description: 'Album name',
    example: 'My First Album',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  album?: string;

  @ApiPropertyOptional({
    description: 'Whether the track is public',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
