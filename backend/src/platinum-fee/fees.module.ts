import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { FeeCalculatorService } from './fee-calculator.service';
import { PlatformFee } from './entities/platform-fee.entity';
import { FeeConfiguration } from './entities/fee-configuration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformFee, FeeConfiguration])],
  controllers: [FeesController],
  providers: [FeesService, FeeCalculatorService],
  exports: [FeesService, FeeCalculatorService],
})
export class FeesModule {}
