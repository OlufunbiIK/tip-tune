import { IsUUID, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreateScheduledReleaseDto {
  @IsUUID()
  trackId: string;

  @IsDateString()
  releaseDate: Date;

  @IsBoolean()
  @IsOptional()
  notifyFollowers?: boolean;
}

export class UpdateScheduledReleaseDto {
  @IsDateString()
  @IsOptional()
  releaseDate?: Date;

  @IsBoolean()
  @IsOptional()
  notifyFollowers?: boolean;
}