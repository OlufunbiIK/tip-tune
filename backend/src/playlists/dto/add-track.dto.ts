import { IsUUID, IsOptional, IsInt, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddTrackDto {
  @ApiProperty({
    description: "Track ID to add to playlist",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({
    description: "Position in playlist (0-based). If not provided, adds to end",
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
