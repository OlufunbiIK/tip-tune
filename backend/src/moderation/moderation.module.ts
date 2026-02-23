import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModerationLog } from './entities/message-moderation-log.entity';
import { BlockedKeyword } from './entities/blocked-keyword.entity';
import { ModerationService } from './moderation.service';
import { MessageFilterService } from './message-filter.service';
import { ModerationController } from './moderation.controller';
import { Artist } from '../artists/entities/artist.entity';
import { User } from '../users/entities/user.entity';
import { ModerateMessagePipe } from './pipes/moderate-message.pipe';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageModerationLog, BlockedKeyword, Artist, User]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService, MessageFilterService, ModerateMessagePipe],
  exports: [ModerationService, MessageFilterService, ModerateMessagePipe],
})
export class ModerationModule {}

