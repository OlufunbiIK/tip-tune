import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackLicense } from "./track-license.entity";
import { LicenseRequest } from "./license-request.entity";
import { LicensingService } from './licensing.service';
import { LicensingController } from './licensing.controller';
import { LicensingMailService } from './licensing-mail.service';
import { NotificationsModule } from "@/notifications/notifications.module";
import { Track } from "@/tracks/entities/track.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackLicense, LicenseRequest, Track]),
    NotificationsModule,
  ],
  controllers: [LicensingController],
  providers: [LicensingService, LicensingMailService],
  exports: [LicensingService],
})
export class LicensingModule {}
