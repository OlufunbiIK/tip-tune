import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Matches } from "class-validator";

export class VerifySignatureDto {
  @ApiProperty({
    description: "Challenge ID from challenge endpoint",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description: "Stellar public key (wallet address)",
    example: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: "Invalid Stellar public key format",
  })
  publicKey: string;

  @ApiProperty({
    description: "Signed challenge message (base64 encoded signature)",
    example: "base64encodedsignature...",
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
