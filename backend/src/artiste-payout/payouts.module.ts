import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { PayoutsService } from "./payouts.service";
import { PayoutsController } from "./payouts.controller";
import { PayoutProcessorService } from "./payout-processor.service";
import { PayoutReconciliationService } from "./payout-reconciliation.service";
import { PayoutReconciliationScheduler } from "./payout-reconciliation.scheduler";
import { PayoutRequest } from "./payout-request.entity";
import { ArtistBalance } from "./artist-balance.entity";
import { ArtistBalanceAudit } from "./artist-balance-audit.entity";
import { Artist } from "../artists/entities/artist.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      PayoutRequest,
      ArtistBalance,
      ArtistBalanceAudit,
      Artist,
    ]),
  ],
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutProcessorService, PayoutReconciliationService, PayoutReconciliationScheduler],
  exports: [PayoutsService, PayoutReconciliationService],
})
export class PayoutsModule {}
