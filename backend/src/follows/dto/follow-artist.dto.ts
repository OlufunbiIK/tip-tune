import { IsOptional, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FollowArtistDto {
  @ApiPropertyOptional({
    description: "Whether to receive notifications (default: true)",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
