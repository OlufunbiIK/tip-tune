import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
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
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GamificationModule } from "./gamification/gamification.module";
import { ScheduledReleasesModule } from "./scheduled-releases/scheduled-releases.module";
import { LeaderboardsModule } from "./leaderboards/leaderboards.module";
import { ReportsModule } from "./reports/reports.module";
import { FeesModule } from "./fees/fees.module";
import { ModerationModule } from "./moderation/moderation.module";
import { EventsModule } from "./events/events.module";
import { BlocksModule } from "./blocks/blocks.module";
import { VersionsModule } from "./versions/versions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MetricsModule,
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
    ScheduleModule.forRoot(),
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
    GamificationModule,
    EventEmitterModule.forRoot(),
    ScheduledReleasesModule,
    LeaderboardsModule,
    ReportsModule,
    FeesModule,
    ModerationModule,
    EventsModule,
    BlocksModule,
    VersionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
