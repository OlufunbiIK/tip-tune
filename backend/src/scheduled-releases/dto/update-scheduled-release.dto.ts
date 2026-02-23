import { IsDateString, IsBoolean, IsOptional } from "class-validator";

export class UpdateScheduledReleaseDto {
  @IsDateString()
  @IsOptional()
  releaseDate?: Date;

  @IsBoolean()
  @IsOptional()
  notifyFollowers?: boolean;
}
