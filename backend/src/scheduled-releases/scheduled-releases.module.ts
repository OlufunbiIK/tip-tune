import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ScheduledReleasesController } from "./scheduled-releases.controller";
import { ScheduledReleasesService } from "./scheduled-releases.service";
import { PreSavesService } from "./presaves.service";
import { ScheduledRelease } from "./entities/scheduled-release.entity";
import { PreSave } from "./entities/presave.entity";
import { Track } from "../tracks/entities/track.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { FollowsModule } from "../follows/follows.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledRelease, PreSave, Track]),
    ScheduleModule.forRoot(),
    NotificationsModule,
    FollowsModule,
  ],
  controllers: [ScheduledReleasesController],
  providers: [ScheduledReleasesService, PreSavesService],
  exports: [ScheduledReleasesService, PreSavesService],
})
export class ScheduledReleasesModule {}
