import {
  IsString,
  IsNumber,
  IsPositive,
  IsIn,
  Length,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayoutDto {
  @ApiProperty({ description: 'Artist ID requesting the payout' })
  @IsUUID()
  artistId: string;

  @ApiProperty({ description: 'Amount to withdraw', example: 50 })
  @IsNumber({ maxDecimalPlaces: 7 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Asset code', enum: ['XLM', 'USDC'], example: 'XLM' })
  @IsString()
  @IsIn(['XLM', 'USDC'])
  assetCode: string;

  @ApiProperty({
    description: 'Stellar destination address (must be owned by artist)',
    example: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
  })
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z2-7]{55}$/, { message: 'Invalid Stellar address format' })
  destinationAddress: string;
}
