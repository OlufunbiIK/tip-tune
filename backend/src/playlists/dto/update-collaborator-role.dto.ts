import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlaylistCollaboratorRole } from '../entities/playlist-collaborator.entity';

export class UpdateCollaboratorRoleDto {
  @ApiProperty({
    description: 'Updated role for the collaborator',
    enum: PlaylistCollaboratorRole,
    example: PlaylistCollaboratorRole.EDITOR,
  })
  @IsEnum(PlaylistCollaboratorRole)
  role: PlaylistCollaboratorRole;
}
