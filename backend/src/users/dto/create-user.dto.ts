import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({
    description: "Unique username",
    example: "johndoe",
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  username: string;

  @ApiProperty({
    description: "User email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: "Stellar wallet public key",
    example: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
  })
  @IsString()
  @MaxLength(255)
  walletAddress: string;

  @ApiPropertyOptional({
    description: "Profile image URL",
    example: "https://example.com/profile.jpg",
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  profileImage?: string;

  @ApiPropertyOptional({
    description: "User biography",
    example: "Music enthusiast and artist",
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: "Whether the user is an artist",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isArtist?: boolean;
}
