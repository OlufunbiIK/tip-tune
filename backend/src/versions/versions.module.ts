import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TrackVersion } from './entities/track-version.entity';
import { Track } from '../tracks/entities/track.entity';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackVersion, Track]),
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
