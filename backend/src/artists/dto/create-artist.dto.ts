import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Matches,
} from "class-validator";

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  artistName: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsString()
  @IsNotEmpty()
  bio: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: "Invalid Stellar public key",
  })
  walletAddress: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
