import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedPlatformFee } from './entities/unified-platform-fee.entity';
import { UnifiedFeeConfiguration } from './entities/unified-fee-configuration.entity';
import { UnifiedFeesService } from './unified-fees.service';
import { UnifiedFeeCalculatorService } from './unified-fee-calculator.service';
import { UnifiedFeesController } from './unified-fees.controller';
import { StellarModule } from '../stellar/stellar.module';
import { ArtistsModule } from '../artists/artists.module';
import { TipsModule } from '../tips/tips.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnifiedPlatformFee, UnifiedFeeConfiguration]),
    StellarModule,
    ArtistsModule,
    TipsModule,
  ],
  controllers: [UnifiedFeesController],
  providers: [UnifiedFeesService, UnifiedFeeCalculatorService],
  exports: [UnifiedFeesService, UnifiedFeeCalculatorService],
})
export class UnifiedFeesModule {}
