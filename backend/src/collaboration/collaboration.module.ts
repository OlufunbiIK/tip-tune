import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Collaboration } from "./entities/collaboration.entity";
import { CollaborationService } from "./collaboration.service";
import { CollaborationController } from "./collaboration.controller";
import { Track } from "../tracks/entities/track.entity";
import { Artist } from "../artists/entities/artist.entity";
import { CollaborationSplitPolicy } from "./collaboration-split-policy";

@Module({
  imports: [
    TypeOrmModule.forFeature([Collaboration, Track, Artist]),
    NotificationsModule,
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService, CollaborationOutboxService, CollaborationSplitPolicy],
  exports: [CollaborationService, CollaborationOutboxService, CollaborationSplitPolicy],
})
export class CollaborationModule {}
