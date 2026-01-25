import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageModule } from "./storage/storage.module";
import { ArtistsModule } from "./artists/artists.module";
import { TracksModule } from "./tracks/tracks.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { TipsModule } from "./tips/tips.module";
import { StellarModule } from "./stellar/stellar.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SearchModule } from "./search/search.module";
import { PlaylistsModule } from "./playlists/playlists.module";
import { GenresModule } from "./genres/genres.module";
import { ActivitiesModule } from "./activities/activities.module";
import { FollowsModule } from "./follows/follows.module";
import { GoalsModule } from "./goals/goals.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_NAME || "tiptune",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: process.env.NODE_ENV !== "production",
      logging: process.env.NODE_ENV === "development",
    }),
    StorageModule,
    ArtistsModule,
    TracksModule,
    UsersModule,
    AuthModule,
    TipsModule,
    StellarModule,
    NotificationsModule,
    SearchModule,
    PlaylistsModule,
    GenresModule,
    ActivitiesModule,
    FollowsModule,
    GoalsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
