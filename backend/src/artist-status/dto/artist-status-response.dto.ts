import { ArtistStatus } from '../entities/artist-status.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ArtistStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty()
  statusType: string;

  @ApiProperty({ required: false, type: String })
  statusMessage: string | null;

  @ApiProperty({ required: false, type: String })
  emoji: string | null;

  @ApiProperty()
  showOnProfile: boolean;

  @ApiProperty({ required: false, type: Date })
  autoResetAt: Date | null;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ArtistStatus): ArtistStatusResponseDto {
    return {
      id: entity.id,
      artistId: entity.artistId,
      statusType: entity.statusType,
      statusMessage: entity.statusMessage,
      emoji: entity.emoji,
      showOnProfile: entity.showOnProfile,
      autoResetAt: entity.autoResetAt,
      updatedAt: entity.updatedAt,
    };
  }
}
