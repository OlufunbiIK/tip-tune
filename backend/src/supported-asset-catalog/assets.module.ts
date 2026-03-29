import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SupportedAsset } from './entities/supported-asset.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupportedAsset])],
  controllers: [AssetsController],
  providers: [AssetsService],
  /**
   * Export AssetsService so other modules (e.g. StellarModule, PaymentsModule)
   * can inject it for issuer-aware asset resolution without re-importing the
   * entire module.
   */
  exports: [AssetsService],
})
export class AssetsModule {}
