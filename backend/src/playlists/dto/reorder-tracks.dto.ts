import { IsArray, IsUUID, ValidateNested, ArrayMinSize } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class TrackPositionDto {
  @ApiProperty({
    description: "Track ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  trackId: string;

  @ApiProperty({
    description: "New position in playlist (0-based)",
    example: 0,
  })
  position: number;
}

export class ReorderTracksDto {
  @ApiProperty({
    description: "Array of track positions",
    type: [TrackPositionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TrackPositionDto)
  tracks: TrackPositionDto[];
}
