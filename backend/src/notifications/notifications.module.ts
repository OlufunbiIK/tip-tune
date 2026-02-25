import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { NotificationsGateway } from "./notifications.gateway";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { Notification } from "./notification.entity";
import { BlocksModule } from "../blocks/blocks.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    AuthModule,
    forwardRef(() => BlocksModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
