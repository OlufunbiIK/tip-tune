import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApprovalStatus } from "../entities/collaboration.entity";

export class UpdateApprovalDto {
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
