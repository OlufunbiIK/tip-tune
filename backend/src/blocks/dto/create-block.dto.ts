import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BlockReason } from '../entities/user-block.entity';

export class CreateBlockDto {
  @ApiPropertyOptional({
    enum: BlockReason,
    description: 'Reason for blocking the user',
  })
  @IsOptional()
  @IsEnum(BlockReason)
  reason?: BlockReason;
}
