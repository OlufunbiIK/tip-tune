import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FollowsController } from "./follows.controller";
import { FollowsService } from "./follows.service";
import { Follow } from "./entities/follow.entity";
import { Artist } from "../artists/entities/artist.entity";
import { User } from "../users/entities/user.entity";
import { ArtistsModule } from "../artists/artists.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, Artist, User]),
    ArtistsModule,
    AuthModule,
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
