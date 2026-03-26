import { IsUUID } from 'class-validator';

export class AssignReportDto {
  @IsUUID()
  assigneeId: string;
}
