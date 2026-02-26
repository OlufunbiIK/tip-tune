import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbedView } from './entities/embed-view.entity';
import { EmbedService } from './embed.service';
import { EmbedController } from './embed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmbedView])],
  providers: [EmbedService],
  controllers: [EmbedController],
  exports: [EmbedService],
})
export class EmbedModule {}