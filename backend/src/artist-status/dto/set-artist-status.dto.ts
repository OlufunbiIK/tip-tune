import { IsEnum, IsString, IsOptional, MaxLength, IsISO8601 } from 'class-validator';
import { StatusType } from '../entities/artist-status.entity';
import { ApiProperty } from '@nestjs/swagger';

export class SetArtistStatusDto {
  @ApiProperty({
    enum: StatusType,
    description: 'Current status of the artist',
  })
  @IsEnum(StatusType)
  statusType: StatusType;

  @ApiProperty({
    type: String,
    maxLength: 160,
    required: false,
    description: 'Optional message (max 160 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  statusMessage?: string;

  @ApiProperty({
    type: String,
    maxLength: 10,
    required: false,
    description: 'Optional emoji (e.g., 🎤, ✈️, 🎧)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @ApiProperty({
    type: Boolean,
    default: true,
    required: false,
    description: 'Whether to show status on public profile',
  })
  @IsOptional()
  showOnProfile?: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    required: false,
    description: 'ISO 8601 timestamp - status will be auto-cleared after this time',
  })
  @IsOptional()
  @IsISO8601()
  autoResetAt?: string;
}
