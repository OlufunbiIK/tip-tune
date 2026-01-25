import { IsNumber, Min, IsUUID, IsOptional, IsString } from "class-validator";

export class CreateGoalSupportDto {
  @IsUUID()
  goalId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  rewardTier?: string;
}
