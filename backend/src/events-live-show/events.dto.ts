import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsUrl,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType } from '../entities/artist-event.entity';

export class CreateArtistEventDto {
  @ApiProperty({ example: 'Summer Live Stream' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Join me for an exclusive live set!' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ example: '2026-06-15T20:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: '2026-06-15T22:00:00Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'Madison Square Garden, NY' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string;

  @ApiPropertyOptional({ example: 'https://stream.example.com/live/123' })
  @IsOptional()
  @IsUrl()
  streamUrl?: string;

  @ApiPropertyOptional({ example: 'https://tickets.example.com/event/123' })
  @IsOptional()
  @IsUrl()
  ticketUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;
}

export class UpdateArtistEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  streamUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  ticketUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;
}

export class RsvpDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
