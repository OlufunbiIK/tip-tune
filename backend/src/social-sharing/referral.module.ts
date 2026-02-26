import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralCode, Referral]),
    ConfigModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService], // Export so TipModule can call claimReward()
})
export class ReferralModule {}
