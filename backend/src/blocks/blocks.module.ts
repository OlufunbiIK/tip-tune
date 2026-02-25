import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { BlocksController, MutesController } from "./blocks.controller";
import { BlocksService } from "./blocks.service";
import { UserBlock } from "./entities/user-block.entity";
import { UserMute } from "./entities/user-mute.entity";
import { User } from "../users/entities/user.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBlock, UserMute, User]),
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [BlocksController, MutesController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
