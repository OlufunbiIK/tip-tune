import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: "New access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;
}
