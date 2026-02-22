import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlaylistChangeStatus } from '../entities/playlist-change-request.entity';

export class ChangeRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by change request status',
    enum: PlaylistChangeStatus,
    example: PlaylistChangeStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PlaylistChangeStatus)
  status?: PlaylistChangeStatus;
}
