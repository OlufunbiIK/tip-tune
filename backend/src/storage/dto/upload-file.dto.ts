import { IsString, IsOptional, IsNumber, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum StorageType {
  LOCAL = "local",
  S3 = "s3",
}

export class UploadFileDto {
  @ApiProperty({
    description: "File to upload",
    type: "string",
    format: "binary",
  })
  file: any;

  @ApiPropertyOptional({
    description: "Track title",
    example: "My Awesome Track",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: "Artist name",
    example: "John Doe",
  })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional({
    description: "Track duration in seconds",
    example: 180,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;
}
