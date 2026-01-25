import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TracksService } from "./tracks.service";
import { TracksController } from "./tracks.controller";
import { Track } from "./entities/track.entity";
import { Artist } from "../artists/entities/artist.entity";
import { StorageModule } from "../storage/storage.module";
import { ActivitiesModule } from "../activities/activities.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, Artist]),
    StorageModule,
    forwardRef(() => ActivitiesModule),
  ],
  controllers: [TracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
