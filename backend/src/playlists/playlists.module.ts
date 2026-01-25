import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlaylistsService } from "./playlists.service";
import { PlaylistsController } from "./playlists.controller";
import { Playlist } from "./entities/playlist.entity";
import { PlaylistTrack } from "./entities/playlist-track.entity";
import { Track } from "../tracks/entities/track.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, PlaylistTrack, Track])],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
