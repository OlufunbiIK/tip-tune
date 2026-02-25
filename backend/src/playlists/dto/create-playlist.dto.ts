import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SanitiseAsPlainText, SanitiseAsRichText } from '../../common/utils/sanitise.util';

export class CreatePlaylistDto {
  @ApiProperty({
    description: 'Playlist name',
    example: 'Chill Vibes',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @SanitiseAsPlainText()
  name: string;

  @ApiPropertyOptional({
    description: 'Playlist description',
    example: 'A collection of relaxing tracks for unwinding',
  })
  @IsOptional()
  @IsString()
  @SanitiseAsRichText()
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
    description: 'Whether non-owner edits require approval',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;
}
