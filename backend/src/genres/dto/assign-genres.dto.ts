import { IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignGenresDto {
  @ApiProperty({
    description: "Array of genre IDs to assign to track",
    example: [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID("4", { each: true })
  genreIds: string[];
}
