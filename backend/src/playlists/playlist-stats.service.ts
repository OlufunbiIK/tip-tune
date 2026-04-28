import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist } from './entities/playlist.entity';
import { PlaylistTrack } from './entities/playlist-track.entity';

@Injectable()
export class PlaylistStatsService {
  private readonly logger = new Logger(PlaylistStatsService.name);

  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistTrack)
    private readonly playlistTrackRepository: Repository<PlaylistTrack>,
  ) {}

  /**
   * Rebuild playlist statistics from source playlist_tracks data
   * This ensures counters stay in sync with actual data
   */
  async rebuildStats(playlistId: string): Promise<void> {
    const stats = await this.playlistTrackRepository
      .createQueryBuilder('pt')
      .leftJoin('pt.track', 'track')
      .select('COUNT(pt.id)', 'trackCount')
      .addSelect('COALESCE(SUM(track.duration), 0)', 'totalDuration')
      .where('pt.playlistId = :playlistId', { playlistId })
      .getRawOne();

    await this.playlistRepository.update(playlistId, {
      trackCount: parseInt(stats.trackCount, 10),
      totalDuration: parseInt(stats.totalDuration, 10),
    });

    this.logger.log(`Rebuilt stats for playlist ${playlistId}: ${stats.trackCount} tracks, ${stats.totalDuration}s duration`);
  }

  /**
   * Get current stats for a playlist (for validation)
   */
  async getCurrentStats(playlistId: string): Promise<{ trackCount: number; totalDuration: number }> {
    const stats = await this.playlistTrackRepository
      .createQueryBuilder('pt')
      .leftJoin('pt.track', 'track')
      .select('COUNT(pt.id)', 'trackCount')
      .addSelect('COALESCE(SUM(track.duration), 0)', 'totalDuration')
      .where('pt.playlistId = :playlistId', { playlistId })
      .getRawOne();

    return {
      trackCount: parseInt(stats.trackCount, 10),
      totalDuration: parseInt(stats.totalDuration, 10),
    };
  }
}