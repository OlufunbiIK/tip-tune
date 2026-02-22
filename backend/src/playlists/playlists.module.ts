import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';
import { PlaylistCollaborator } from './entities/playlist-collaborator.entity';
import { SmartPlaylist } from './entities/smart-playlist.entity';
import { PlaylistChangeRequest } from './entities/playlist-change-request.entity';
import { Track } from '../tracks/entities/track.entity';
import { ActivitiesModule } from '../activities/activities.module';
import { UsersModule } from '../users/users.module';
import { SmartPlaylistsService } from './smart-playlists.service';
import { SmartPlaylistsScheduler } from './smart-playlists.scheduler';
import { Follow } from '../follows/entities/follow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Playlist,
      PlaylistTrack,
      PlaylistCollaborator,
      SmartPlaylist,
      PlaylistChangeRequest,
      Track,
      Follow,
    ]),
    ActivitiesModule,
    UsersModule,
  ],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, SmartPlaylistsService, SmartPlaylistsScheduler],
  exports: [PlaylistsService, SmartPlaylistsService],
})
export class PlaylistsModule {}
