import { IsEnum, IsUUID, IsOptional, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ActivityType, EntityType } from "../entities/activity.entity";

export class CreateActivityDto {
  @ApiProperty({
    description: "User ID (wallet address or UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: "Type of activity",
    enum: ActivityType,
    example: ActivityType.NEW_TRACK,
  })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({
    description: "Type of entity this activity relates to",
    enum: EntityType,
    example: EntityType.TRACK,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: "ID of the related entity",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({
    description: "Additional metadata about the activity",
    example: { trackTitle: "New Song", artistName: "Artist Name" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
