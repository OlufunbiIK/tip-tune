import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialProofDto {
  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}

export class CreateVerificationRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialProofDto)
  socialProof: SocialProofDto[];

  @IsString()
  @IsOptional()
  additionalInfo?: string;
}
