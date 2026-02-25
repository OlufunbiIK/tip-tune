import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanitiseAsPlainText } from '../../common/utils/sanitise.util';

export class DuplicatePlaylistDto {
  @ApiPropertyOptional({
    description: 'Name for the duplicated playlist',
    example: 'Chill Vibes (Copy)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @SanitiseAsPlainText()
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether the duplicated playlist should be public',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
