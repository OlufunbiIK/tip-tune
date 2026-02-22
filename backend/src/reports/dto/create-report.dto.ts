import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ReportEntityType, ReportReason } from '../entities/report.entity';

export class CreateReportDto {
  @IsEnum(ReportEntityType)
  entityType: ReportEntityType;

  @IsUUID()
  entityId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsNotEmpty()
  description: string;
}
