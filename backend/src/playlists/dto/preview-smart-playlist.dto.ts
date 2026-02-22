import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewSmartPlaylistDto {
  @ApiProperty({
    description: 'Smart playlist criteria',
    example: { type: 'most_tipped', limit: 25 },
  })
  @IsObject()
  criteria: Record<string, any>;
}
