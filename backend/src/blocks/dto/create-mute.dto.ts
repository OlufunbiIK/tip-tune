import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MuteType } from '../entities/user-mute.entity';

export class CreateMuteDto {
  @ApiPropertyOptional({
    enum: MuteType,
    description: 'Type of mute to apply',
    default: MuteType.BOTH,
  })
  @IsOptional()
  @IsEnum(MuteType)
  muteType?: MuteType;

  @ApiPropertyOptional({
    description: 'Expiration date for temporary mute (ISO 8601 format)',
    example: '2026-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
