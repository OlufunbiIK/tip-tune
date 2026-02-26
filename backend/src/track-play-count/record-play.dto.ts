import {
  IsUUID,
  IsInt,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaySource } from '../entities/track-play.entity';

export class RecordPlayDto {
  @ApiProperty({ description: 'Track UUID' })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({ description: 'Authenticated user UUID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Anonymous session identifier' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Seconds the track was listened to', minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(86400)
  listenDuration: number;

  @ApiProperty({ description: 'Did the listener finish the entire track?' })
  @IsBoolean()
  completedFull: boolean;

  @ApiProperty({ enum: PlaySource, description: 'Where the play originated' })
  @IsEnum(PlaySource)
  source: PlaySource;
}
