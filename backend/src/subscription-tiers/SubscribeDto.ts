import {  IsString, IsUUID, Length } from "class-validator";

export class SubscribeDto {
  @IsUUID()
  tierId: string;

  @IsString()
  @Length(10, 200)
  stellarTxHash: string;
}