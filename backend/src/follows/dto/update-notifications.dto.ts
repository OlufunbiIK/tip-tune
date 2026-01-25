import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateNotificationsDto {
  @ApiProperty({
    description:
      "Whether to receive notifications when the artist posts or has updates",
    example: true,
  })
  @IsBoolean()
  notificationsEnabled: boolean;
}
