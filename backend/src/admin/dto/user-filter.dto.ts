import { IsOptional, IsEnum, IsString } from 'class-validator';
import { UserStatus } from '../../users/entities/user.entity';

export class UserFilterDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';
}
