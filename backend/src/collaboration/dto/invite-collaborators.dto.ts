import { Type } from "class-transformer";
import {
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
} from "class-validator";
import { CollaborationRole } from "../entities/collaboration.entity";

class CollaboratorInvite {
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

export class InviteCollaboratorsDto {
  @IsUUID()
  trackId: string;

  @ValidateNested({ each: true })
  @Type(() => CollaboratorInvite)
  @ArrayMinSize(1)
  collaborators: CollaboratorInvite[];
}
