import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePlaylistDto {
  @ApiProperty({
    description: "Playlist name",
    example: "Chill Vibes",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: "Playlist description",
    example: "A collection of relaxing tracks for unwinding",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Whether the playlist is public",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: "Cover image URL",
    example: "https://example.com/cover.jpg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;
}
