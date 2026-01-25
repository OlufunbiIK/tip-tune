import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from "class-validator";

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  goalAmount: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsOptional()
  rewards?: any;
}
