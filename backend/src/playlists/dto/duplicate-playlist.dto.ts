import { IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DuplicatePlaylistDto {
  @ApiPropertyOptional({
    description: "Name for the duplicated playlist",
    example: "Chill Vibes (Copy)",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: "Whether the duplicated playlist should be public",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
