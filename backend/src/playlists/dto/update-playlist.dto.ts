import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitiseAsPlainText, SanitiseAsRichText } from '../../common/utils/sanitise.util';

export class UpdatePlaylistDto {
  @ApiPropertyOptional({
    description: 'Playlist name',
    example: 'Updated Playlist Name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @SanitiseAsPlainText()
  name?: string;

  @ApiPropertyOptional({
    description: 'Playlist description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  @SanitiseAsRichText()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the playlist is public',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether non-owner edits require approval',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/new-cover.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;
}
