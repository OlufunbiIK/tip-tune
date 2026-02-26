import { ApiProperty } from '@nestjs/swagger';
import { StatusHistory } from '../entities/status-history.entity';

export class StatusHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  artistId: string;

  @ApiProperty()
  statusType: string;

  @ApiProperty({ required: false, type: String })
  statusMessage: string | null;

  @ApiProperty()
  setAt: Date;

  @ApiProperty({ required: false, type: Date })
  clearedAt: Date | null;

  static fromEntity(entity: StatusHistory): StatusHistoryResponseDto {
    return {
      id: entity.id,
      artistId: entity.artistId,
      statusType: entity.statusType,
      statusMessage: entity.statusMessage,
      setAt: entity.setAt,
      clearedAt: entity.clearedAt,
    };
  }
}
