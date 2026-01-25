import { IsOptional, IsNumber, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationDto {
  @ApiPropertyOptional({
    description: "Page number (starts from 1)",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Sort field",
    example: "createdAt",
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order (ASC or DESC)",
    example: "DESC",
    default: "DESC",
  })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";
}

export class TrackFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filter by artist ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional({
    description: "Filter by genre",
    example: "rock",
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({
    description: "Filter by album",
    example: "My Album",
  })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({
    description: "Filter by public status",
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: "Filter by release date (YYYY-MM-DD format)",
    example: "2023-01-01",
  })
  @IsOptional()
  @IsString()
  releaseDate?: string;
}
