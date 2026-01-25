import { ApiProperty } from "@nestjs/swagger";

export class ChallengeResponseDto {
  @ApiProperty({
    description: "Challenge message to sign with wallet",
    example:
      "Sign this message to authenticate: 550e8400-e29b-41d4-a716-446655440000",
  })
  challenge: string;

  @ApiProperty({
    description: "Unique challenge ID for verification",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  challengeId: string;

  @ApiProperty({
    description: "Challenge expiration timestamp",
    example: "2024-01-01T12:00:00.000Z",
  })
  expiresAt: string;
}
