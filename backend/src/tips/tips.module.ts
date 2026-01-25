import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import { Tip } from "./tips.entity";
import { StellarModule } from "../stellar/stellar.module";
import { UsersModule } from "../users/users.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ActivitiesModule } from "../activities/activities.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip]),
    StellarModule,
    UsersModule,
    NotificationsModule,
    forwardRef(() => ActivitiesModule),
  ],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
