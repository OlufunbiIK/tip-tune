import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ArtistEventType } from '../entities/artist-event.entity';

export class CreateEventDto {
  @ApiProperty({
    description: 'Artist ID owning the event',
  })
  @IsUUID()
  artistId: string;

  @ApiProperty({
    description: 'Title of the event',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the event',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: ArtistEventType,
    description: 'Type of event',
  })
  @IsEnum(ArtistEventType)
  eventType: ArtistEventType;

  @ApiProperty({
    description: 'Start time of the event (ISO 8601)',
  })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({
    description: 'End time of the event (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Venue for in-person events',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string;

  @ApiPropertyOptional({
    description: 'Stream URL for virtual events',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  streamUrl?: string;

  @ApiPropertyOptional({
    description: 'Ticket purchase URL',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ticketUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the event is virtual',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;
}

