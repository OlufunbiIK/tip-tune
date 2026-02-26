import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeeCalculatorService } from './fee-calculator.service';
import { PlatformFee } from './entities/platform-fee.entity';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformFee, FeeConfiguration, Tip, Artist, User]),
    StellarModule,
  ],
  controllers: [FeesController],
  providers: [FeesService, FeeCalculatorService],
  exports: [FeesService, FeeCalculatorService],
})
export class FeesModule {}

