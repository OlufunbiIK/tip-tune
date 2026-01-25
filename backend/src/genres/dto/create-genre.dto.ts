import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateGenreDto {
  @ApiProperty({
    description: "Genre name",
    example: "Electronic",
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: "Genre description",
    example: "Electronic music genre",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Parent genre ID for sub-genres",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  parentGenreId?: string;
}
