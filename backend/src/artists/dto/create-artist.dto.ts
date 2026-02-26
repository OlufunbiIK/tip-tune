import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Matches,
  IsIn,
  Length,
} from 'class-validator';
import { ArtistStatus } from '../entities/artist.entity';
import { SanitiseAsPlainText, SanitiseAsRichText } from '../../common/utils/sanitise.util';

const ARTIST_STATUS_VALUES = Object.values(ArtistStatus);

export class CreateArtistDto {
  @IsString()
  @IsNotEmpty()
  @SanitiseAsPlainText()
  artistName: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsString()
  @IsNotEmpty()
  @SanitiseAsRichText()
  bio: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar public key',
  })
  walletAddress: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsIn(ARTIST_STATUS_VALUES)
  status?: ArtistStatus;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  hasLocation?: boolean;
}
