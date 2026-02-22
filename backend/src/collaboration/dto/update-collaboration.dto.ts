import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '../entities/collaboration.entity';

export class UpdateCollaborationDto {
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}