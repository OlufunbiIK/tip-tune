import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaylistCollaboratorRole } from '../entities/playlist-collaborator.entity';

export class InviteCollaboratorDto {
  @ApiProperty({
    description: 'Username or email of the collaborator',
    example: 'musiclover',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiPropertyOptional({
    description: 'Role for the collaborator',
    enum: PlaylistCollaboratorRole,
    example: PlaylistCollaboratorRole.EDITOR,
  })
  @IsOptional()
  @IsEnum(PlaylistCollaboratorRole)
  role?: PlaylistCollaboratorRole;
}
