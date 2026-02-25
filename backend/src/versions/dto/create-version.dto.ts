import { IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiProperty({ description: 'URL of the audio file' })
  @IsString()
  @MaxLength(500)
  audioUrl: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'Duration in seconds' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ description: 'Change note describing the update' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string;
}
