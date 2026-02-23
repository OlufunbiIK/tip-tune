import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { VerificationStatus } from '../entities/verification-request.entity';

export class ReviewVerificationRequestDto {
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED;

  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
