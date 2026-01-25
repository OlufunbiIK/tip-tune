import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SEARCH_TYPES, SearchType } from "./search-query.dto";

export class SearchSuggestionsQueryDto {
  @ApiProperty({
    description: "Partial search query for autocomplete",
    example: "roc",
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: "Limit to artist or track suggestions; both when omitted",
    enum: SEARCH_TYPES,
  })
  @IsOptional()
  @IsIn(SEARCH_TYPES)
  type?: SearchType;

  @ApiPropertyOptional({
    description: "Max number of suggestions to return",
    default: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
