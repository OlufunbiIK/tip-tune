import { IsString, IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
