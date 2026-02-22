import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSmartPlaylistDto {
  @ApiProperty({
    description: 'Playlist name',
    example: 'Late Night Grooves',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Playlist description',
    example: 'Auto-updating playlist based on your favorite genres',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the playlist is public',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiProperty({
    description: 'Smart playlist criteria',
    example: { type: 'genre', genres: ['lofi', 'ambient'], limit: 50 },
  })
  @IsObject()
  criteria: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether the playlist should auto-update',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoUpdate?: boolean;
}
