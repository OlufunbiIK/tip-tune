import {
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
} from "class-validator";
import { CollaborationRole } from "../entities/collaboration.entity";

export class InviteCollaboratorDto {
  @IsUUID()
  artistId: string;

  @IsEnum(CollaborationRole)
  role: CollaborationRole;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  splitPercentage: number;

  @IsOptional()
  @IsString()
  invitationMessage?: string;
}
