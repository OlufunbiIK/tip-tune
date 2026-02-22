import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackLicense } from './entities/track-license.entity';
import { LicenseRequest } from './entities/license-request.entity';
import { LicensingService } from './licensing.service';
import { LicensingController } from './licensing.controller';
import { LicensingMailService } from './licensing-mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrackLicense, LicenseRequest])],
  controllers: [LicensingController],
  providers: [LicensingService, LicensingMailService],
  exports: [LicensingService],
})
export class LicensingModule {}
