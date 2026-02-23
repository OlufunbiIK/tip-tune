import { IsString, IsNotEmpty } from 'class-validator';

export class RemoveTrackDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
