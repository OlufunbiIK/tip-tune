import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GenresController } from "./genres.controller";
import { GenresService } from "./genres.service";
import { Genre } from "./entities/genre.entity";
import { TrackGenre } from "./entities/track-genre.entity";
import { Track } from "../tracks/entities/track.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Genre, TrackGenre, Track])],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
