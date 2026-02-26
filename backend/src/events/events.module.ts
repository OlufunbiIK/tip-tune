import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistEvent } from './entities/artist-event.entity';
import { EventRSVP } from './entities/event-rsvp.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follows/entities/follow.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsScheduler } from './events.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArtistEvent, EventRSVP, Artist, User, Follow]),
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsScheduler],
  exports: [EventsService],
})
export class EventsModule {}

