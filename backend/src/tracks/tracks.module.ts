import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';
import { Track } from './entities/track.entity';
import { Artist } from '../artists/entities/artist.entity';
import { StorageModule } from '../storage/storage.module';
import { ActivitiesModule } from '../activities/activities.module';
import { LicensingModule } from "@/track-listening-right-management/licensing.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, Artist]),
    StorageModule,
    forwardRef(() => ActivitiesModule),
    EventEmitterModule,
    LicensingModule,
  ],
  controllers: [TracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
