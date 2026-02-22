import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmbedController } from './embed.controller';
import { EmbedService } from './embed.service';
import { Track } from './entities/track.entity';
import { EmbedView } from './embed-view';
import { EmbedTokenGuard } from './embed.token.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Track, EmbedView]),
  ],
  controllers: [EmbedController],
  providers: [EmbedService, EmbedTokenGuard],
  exports: [EmbedService],
})
export class EmbedModule {}