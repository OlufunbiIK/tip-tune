import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportAction, ReportPriority, ReportStatus } from '../entities/report.entity';

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsEnum(ReportAction)
  @IsOptional()
  action?: ReportAction;

  @IsEnum(ReportPriority)
  @IsOptional()
  priority?: ReportPriority;
}
