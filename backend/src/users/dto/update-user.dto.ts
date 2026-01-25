import { PartialType } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: "Unique username",
    example: "johndoe",
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  username?: string;

  @ApiPropertyOptional({
    description: "User email address",
    example: "john.doe@example.com",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: "Stellar wallet public key",
    example: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  walletAddress?: string;

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
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isArtist?: boolean;
}
