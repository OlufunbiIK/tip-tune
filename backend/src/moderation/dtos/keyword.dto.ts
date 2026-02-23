import { IsString, IsNotEmpty, IsIn, IsEnum } from "class-validator";
import { KeywordSeverity } from "../entities/blocked-keyword.entity";

export class AddKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @IsString()
  @IsEnum(KeywordSeverity)
  severity: string;
}

export class ReviewActionDto {
  @IsIn(["approve", "block"])
  action: "approve" | "block";
}
