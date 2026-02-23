import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';
import { LicenseType } from '../entities/track-license.entity';
import { LicenseRequestStatus } from '../entities/license-request.entity';

export class CreateTrackLicenseDto {
  @IsEnum(LicenseType)
  @IsOptional()
  licenseType?: LicenseType;

  @IsBoolean()
  @IsOptional()
  allowRemix?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCommercialUse?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDownload?: boolean;

  @IsBoolean()
  @IsOptional()
  requireAttribution?: boolean;

  @IsUrl()
  @IsOptional()
  licenseUrl?: string;

  @IsString()
  @IsOptional()
  customTerms?: string;
}

export class UpdateTrackLicenseDto extends CreateTrackLicenseDto {}

export class CreateLicenseRequestDto {
  @IsString()
  @IsNotEmpty()
  trackId: string;

  @IsString()
  @IsNotEmpty()
  intendedUse: string;
}

export class RespondToLicenseRequestDto {
  @IsEnum(LicenseRequestStatus)
  status: LicenseRequestStatus;

  @IsString()
  @IsOptional()
  responseMessage?: string;
}
