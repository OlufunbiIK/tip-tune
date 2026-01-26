import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collaboration } from './collaboration.entity';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';
import { Track } from '../tracks/track.entity';
import { Artist } from '../artists/artist.entity';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Collaboration,
      Track,
      Artist,
    ]),
    NotificationModule,
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
