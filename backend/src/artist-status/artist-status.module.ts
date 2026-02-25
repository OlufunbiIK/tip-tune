import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistStatus } from './entities/artist-status.entity';
import { StatusHistory } from './entities/status-history.entity';
import { ArtistStatusService } from './artist-status.service';
import { ArtistStatusController } from './artist-status.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArtistsModule } from '../artists/artists.module';
import { Follow } from '../follows/entities/follow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArtistStatus, StatusHistory, Follow]),
    NotificationsModule,
    ArtistsModule,
  ],
  providers: [ArtistStatusService],
  controllers: [ArtistStatusController],
  exports: [ArtistStatusService],
})
export class ArtistStatusModule {}
