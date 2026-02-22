import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SmartPlaylistsService } from './smart-playlists.service';

@Injectable()
export class SmartPlaylistsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmartPlaylistsScheduler.name);
  private intervalId?: NodeJS.Timeout;

  constructor(private readonly smartPlaylistsService: SmartPlaylistsService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const enabled =
      (process.env.SMART_PLAYLIST_REFRESH_ENABLED || 'true').toLowerCase() ===
      'true';
    if (!enabled) {
      return;
    }

    const intervalMs = Number(
      process.env.SMART_PLAYLIST_REFRESH_INTERVAL_MS || 900000,
    );
    const safeInterval = Number.isFinite(intervalMs)
      ? Math.max(intervalMs, 60000)
      : 900000;

    this.intervalId = setInterval(() => {
      this.smartPlaylistsService
        .refreshAll()
        .catch((error) =>
          this.logger.warn(`Smart playlist refresh failed: ${error.message}`),
        );
    }, safeInterval);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
