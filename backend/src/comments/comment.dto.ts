import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { SanitiseAsPlainText } from '../common/utils/sanitise.util';

export class CreateCommentDto {
  @IsUUID()
  @IsNotEmpty()
  trackId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @SanitiseAsPlainText()
  content: string;

  @IsUUID()
  @IsOptional()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @SanitiseAsPlainText()
  content: string;
}

export class PaginationQueryDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
