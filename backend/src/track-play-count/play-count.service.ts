import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { TrackPlay, PlaySource } from './entities/track-play.entity';
import { RecordPlayDto } from './dto/record-play.dto';
import {
  RecordPlayResponseDto,
  TrackStatsDto,
  SourceBreakdownDto,
  ArtistOverviewDto,
  TopTracksDto,
  TopTrackDto,
} from './dto/play-count-response.dto';

export const MINIMUM_LISTEN_SECONDS = 30;
export const DEDUP_WINDOW_HOURS = 1;

@Injectable()
export class PlayCountService {
  private readonly logger = new Logger(PlayCountService.name);

  constructor(
    @InjectRepository(TrackPlay)
    private readonly trackPlayRepo: Repository<TrackPlay>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip + 'tip-tune-salt').digest('hex');
  }

  private dedupWindowStart(): Date {
    const d = new Date();
    d.setHours(d.getHours() - DEDUP_WINDOW_HOURS);
    return d;
  }

  async isDuplicate(
    trackId: string,
    userId: string | null,
    sessionId: string,
    ipHash: string,
  ): Promise<boolean> {
    const since = this.dedupWindowStart();

    // Check by userId if authenticated
    if (userId) {
      const existing = await this.trackPlayRepo.findOne({
        where: {
          trackId,
          userId,
          countedAsPlay: true,
          playedAt: MoreThan(since),
        },
      });
      if (existing) return true;
    }

    // Check by sessionId (covers anonymous)
    const bySession = await this.trackPlayRepo.findOne({
      where: {
        trackId,
        sessionId,
        countedAsPlay: true,
        playedAt: MoreThan(since),
      },
    });
    if (bySession) return true;

    // Check by ipHash as last fallback
    const byIp = await this.trackPlayRepo.findOne({
      where: {
        trackId,
        ipHash,
        countedAsPlay: true,
        playedAt: MoreThan(since),
      },
    });
    return !!byIp;
  }

  // ─── Record Play ─────────────────────────────────────────────────────────────

  async recordPlay(
    dto: RecordPlayDto,
    ip: string,
  ): Promise<RecordPlayResponseDto> {
    const ipHash = this.hashIp(ip);
    const meetsMinimum = dto.listenDuration >= MINIMUM_LISTEN_SECONDS;

    // Always persist the raw event regardless of whether it counts
    const play = this.trackPlayRepo.create({
      trackId: dto.trackId,
      userId: dto.userId ?? null,
      sessionId: dto.sessionId,
      listenDuration: dto.listenDuration,
      completedFull: dto.completedFull,
      source: dto.source,
      ipHash,
      countedAsPlay: false,
    });

    if (!meetsMinimum) {
      await this.trackPlayRepo.save(play);
      return {
        counted: false,
        reason: `Listen duration ${dto.listenDuration}s is below the 30-second minimum`,
        playId: play.id,
      };
    }

    const duplicate = await this.isDuplicate(
      dto.trackId,
      dto.userId ?? null,
      dto.sessionId,
      ipHash,
    );

    if (duplicate) {
      await this.trackPlayRepo.save(play);
      return {
        counted: false,
        reason: 'Duplicate play detected within the 1-hour deduplication window',
        playId: play.id,
      };
    }

    // Mark as a genuine counted play and update Track.plays atomically
    play.countedAsPlay = true;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(TrackPlay, play);
      await manager
        .createQueryBuilder()
        .update('tracks')
        .set({ plays: () => 'plays + 1' })
        .where('id = :id', { id: dto.trackId })
        .execute();
    });

    this.logger.log(`Counted play for track ${dto.trackId} by ${dto.userId ?? dto.sessionId}`);

    return {
      counted: true,
      reason: 'Play recorded successfully',
      playId: play.id,
    };
  }

  // ─── Track Stats ─────────────────────────────────────────────────────────────

  async getTrackStats(trackId: string, period = '7d'): Promise<TrackStatsDto> {
    const since = this.periodToDate(period);

    const qb = this.trackPlayRepo
      .createQueryBuilder('p')
      .where('p.track_id = :trackId', { trackId })
      .andWhere('p.played_at >= :since', { since });

    const [totalPlays, totalEvents, avgDuration, completedCount] =
      await Promise.all([
        qb.clone().andWhere('p.counted_as_play = true').getCount(),
        qb.clone().getCount(),
        qb
          .clone()
          .select('COALESCE(AVG(p.listen_duration), 0)', 'avg')
          .getRawOne<{ avg: string }>()
          .then((r) => parseFloat(r?.avg ?? '0')),
        qb
          .clone()
          .andWhere('p.counted_as_play = true')
          .andWhere('p.completed_full = true')
          .getCount(),
      ]);

    const skippedEvents = totalEvents - totalPlays; // events that didn't reach 30s
    const skipRate = totalEvents > 0 ? skippedEvents / totalEvents : 0;
    const completionRate = totalPlays > 0 ? completedCount / totalPlays : 0;

    const uniqueListeners = await this.trackPlayRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT COALESCE(p.user_id::text, p.session_id))', 'cnt')
      .where('p.track_id = :trackId', { trackId })
      .andWhere('p.counted_as_play = true')
      .andWhere('p.played_at >= :since', { since })
      .getRawOne<{ cnt: string }>()
      .then((r) => parseInt(r?.cnt ?? '0', 10));

    return {
      trackId,
      totalPlays,
      uniqueListeners,
      completionRate: parseFloat(completionRate.toFixed(4)),
      skipRate: parseFloat(skipRate.toFixed(4)),
      avgListenDuration: parseFloat(avgDuration.toFixed(2)),
      period,
    };
  }

  // ─── Source Attribution ───────────────────────────────────────────────────

  async getTrackSources(trackId: string): Promise<SourceBreakdownDto> {
    const rows = await this.trackPlayRepo
      .createQueryBuilder('p')
      .select('p.source', 'source')
      .addSelect('COUNT(*)', 'cnt')
      .where('p.track_id = :trackId', { trackId })
      .andWhere('p.counted_as_play = true')
      .groupBy('p.source')
      .getRawMany<{ source: PlaySource; cnt: string }>();

    const sources = Object.values(PlaySource).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<PlaySource, number>,
    );
    rows.forEach((r) => {
      sources[r.source] = parseInt(r.cnt, 10);
    });

    return { trackId, sources };
  }

  // ─── Artist Overview ──────────────────────────────────────────────────────

  async getArtistOverview(artistId: string): Promise<ArtistOverviewDto> {
    // Fetch per-track aggregates for this artist
    const trackRows = await this.dataSource
      .createQueryBuilder()
      .select('p.track_id', 'trackId')
      .addSelect('COUNT(p.id)', 'plays')
      .addSelect(
        'AVG(CASE WHEN p.completed_full THEN 1.0 ELSE 0.0 END)',
        'completionRate',
      )
      .from(TrackPlay, 'p')
      .innerJoin('tracks', 't', 't.id = p.track_id AND t.artist_id = :artistId', {
        artistId,
      })
      .where('p.counted_as_play = true')
      .groupBy('p.track_id')
      .orderBy('plays', 'DESC')
      .getRawMany<{ trackId: string; plays: string; completionRate: string }>();

    const totalPlays = trackRows.reduce((s, r) => s + parseInt(r.plays, 10), 0);
    const avgCompletionRate =
      trackRows.length > 0
        ? trackRows.reduce((s, r) => s + parseFloat(r.completionRate), 0) /
          trackRows.length
        : 0;

    const uniqueListeners = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT COALESCE(p.user_id::text, p.session_id))', 'cnt')
      .from(TrackPlay, 'p')
      .innerJoin('tracks', 't', 't.id = p.track_id AND t.artist_id = :artistId', {
        artistId,
      })
      .where('p.counted_as_play = true')
      .getRawOne<{ cnt: string }>()
      .then((r) => parseInt(r?.cnt ?? '0', 10));

    const topTracks: TopTrackDto[] = trackRows.slice(0, 5).map((r) => ({
      trackId: r.trackId,
      plays: parseInt(r.plays, 10),
      completionRate: parseFloat(parseFloat(r.completionRate).toFixed(4)),
    }));

    return {
      artistId,
      totalPlays,
      uniqueListeners,
      totalTracks: trackRows.length,
      avgCompletionRate: parseFloat(avgCompletionRate.toFixed(4)),
      topTracks,
    };
  }

  // ─── Top Tracks ───────────────────────────────────────────────────────────

  async getTopTracks(period = '7d', limit = 20): Promise<TopTracksDto> {
    const since = this.periodToDate(period);

    const rows = await this.trackPlayRepo
      .createQueryBuilder('p')
      .select('p.track_id', 'trackId')
      .addSelect('COUNT(p.id)', 'plays')
      .addSelect(
        'AVG(CASE WHEN p.completed_full THEN 1.0 ELSE 0.0 END)',
        'completionRate',
      )
      .where('p.counted_as_play = true')
      .andWhere('p.played_at >= :since', { since })
      .groupBy('p.track_id')
      .orderBy('plays', 'DESC')
      .limit(limit)
      .getRawMany<{ trackId: string; plays: string; completionRate: string }>();

    return {
      period,
      tracks: rows.map((r) => ({
        trackId: r.trackId,
        plays: parseInt(r.plays, 10),
        completionRate: parseFloat(parseFloat(r.completionRate).toFixed(4)),
      })),
    };
  }

  // ─── Period Helper ────────────────────────────────────────────────────────

  periodToDate(period: string): Date {
    const now = new Date();
    const match = /^(\d+)([dwhm])$/.exec(period);
    if (!match) throw new BadRequestException(`Invalid period format: ${period}. Use e.g. 7d, 4w, 1m`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - value * 7);
        break;
      case 'h':
        now.setHours(now.getHours() - value);
        break;
      case 'm':
        now.setMonth(now.getMonth() - value);
        break;
    }
    return now;
  }
}
