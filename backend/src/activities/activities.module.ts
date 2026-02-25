import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService } from "./activities.service";
import { Activity } from "./entities/activity.entity";
import { UsersModule } from "../users/users.module";
import { BlocksModule } from "../blocks/blocks.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    forwardRef(() => UsersModule),
    BlocksModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
