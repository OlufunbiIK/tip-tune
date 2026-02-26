import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import { Tip } from "./entities/tip.entity";
import { StellarModule } from "../stellar/stellar.module";
import { UsersModule } from "../users/users.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ActivitiesModule } from "../activities/activities.module";
import { FeesModule } from "../fees/fees.module";
import { ModerationModule } from "../moderation/moderation.module";
import { BlocksModule } from "../blocks/blocks.module";
// --- NEW ADDITIONS ---
import { TracksModule } from "../tracks/tracks.module";
import { TipReconciliationService } from "./tip-reconciliation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip]),
    StellarModule,
    UsersModule,
    NotificationsModule,
    forwardRef(() => ActivitiesModule),
    FeesModule,
    ModerationModule,
    BlocksModule,
    // --- NEW ADDITION ---
    forwardRef(() => TracksModule),
  ],
  controllers: [TipsController],
  // --- NEW ADDITION: Added TipReconciliationService ---
  providers: [TipsService, TipReconciliationService],
  exports: [TipsService, TipReconciliationService],
})
export class TipsModule {}