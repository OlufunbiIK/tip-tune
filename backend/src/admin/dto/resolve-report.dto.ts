import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ReportResolution {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTION_TAKEN = 'action_taken',
}

export class ResolveReportDto {
  @IsEnum(ReportResolution)
  resolution: ReportResolution;

  @IsString()
  @IsNotEmpty()
  notes: string;
}
