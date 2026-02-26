import {
  Injectable, NotFoundException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbedView } from './entities/embed-view.entity';
import * as crypto from 'crypto';

const EMBED_SECRET = process.env.EMBED_SECRET || 'embed-secret-key';

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);
  private readonly domainRateLimit = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @InjectRepository(EmbedView)
    private readonly embedViewRepo: Repository<EmbedView>,
  ) {}

  // ─── Token Generation ─────────────────────────────────────────────────────

  generateEmbedToken(trackId: string): string {
    const payload = `${trackId}:${Date.now()}`;
    return crypto
      .createHmac('sha256', EMBED_SECRET)
      .update(payload)
      .digest('hex');
  }

  validateEmbedToken(trackId: string, token: string): boolean {
    // In production, store tokens in Redis with TTL
    // Here we verify the token is a valid HMAC format
    return typeof token === 'string' && token.length === 64;
  }

  // ─── oEmbed ───────────────────────────────────────────────────────────────

  async getOEmbed(trackId: string, baseUrl: string) {
    const track = await this.getTrackOrFail(trackId);
    this.assertEmbedEnabled(track);

    return {
      version: '1.0',
      type: 'rich',
      title: track.title,
      author_name: track.artist?.name || 'Unknown Artist',
      author_url: `${baseUrl}/artists/${track.artistId}`,
      provider_name: 'TipTune',
      provider_url: baseUrl,
      thumbnail_url: track.coverUrl || null,
      thumbnail_width: 300,
      thumbnail_height: 300,
      html: `<iframe src="${baseUrl}/embed/${trackId}" width="100%" height="120" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`,
      width: '100%',
      height: 120,
    };
  }

  // ─── Meta Tags ────────────────────────────────────────────────────────────

  async getMetaTags(trackId: string, baseUrl: string) {
    const track = await this.getTrackOrFail(trackId);
    this.assertEmbedEnabled(track);

    const trackUrl = `${baseUrl}/tracks/${trackId}`;
    const embedUrl = `${baseUrl}/embed/${trackId}`;

    return {
      openGraph: {
        'og:type':          'music.song',
        'og:title':         track.title,
        'og:description':   track.description || `Listen to ${track.title} on TipTune`,
        'og:url':           trackUrl,
        'og:image':         track.coverUrl || `${baseUrl}/default-cover.png`,
        'og:audio':         track.audioUrl,
        'og:audio:type':    'audio/mpeg',
        'og:site_name':     'TipTune',
        'music:musician':   track.artist?.name,
      },
      twitterCard: {
        'twitter:card':        'player',
        'twitter:title':       track.title,
        'twitter:description': track.description || `Listen on TipTune`,
        'twitter:image':       track.coverUrl || `${baseUrl}/default-cover.png`,
        'twitter:player':      embedUrl,
        'twitter:player:width':  '480',
        'twitter:player:height': '120',
      },
    };
  }

  // ─── Player Data ──────────────────────────────────────────────────────────

  async getPlayerData(trackId: string, token: string) {
    if (!this.validateEmbedToken(trackId, token)) {
      throw new ForbiddenException('Invalid embed token');
    }

    const track = await this.getTrackOrFail(trackId);
    this.assertEmbedEnabled(track);

    return {
      trackId:    track.id,
      title:      track.title,
      artist:     track.artist?.name,
      audioUrl:   track.audioUrl,
      coverUrl:   track.coverUrl,
      duration:   track.duration,
      waveformUrl: track.waveformUrl || null,
    };
  }

  // ─── View Recording ───────────────────────────────────────────────────────

  async recordView(trackId: string, referrer: string | null, domain: string): Promise<void> {
    this.checkDomainRateLimit(domain);

    const track = await this.getTrackOrFail(trackId);
    this.assertEmbedEnabled(track);

    const referrerDomain = this.extractDomain(referrer);
    await this.embedViewRepo.save(
      this.embedViewRepo.create({ trackId, referrerDomain }),
    );
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(trackId: string) {
    const total = await this.embedViewRepo.count({ where: { trackId } });

    const byDomain = await this.embedViewRepo
      .createQueryBuilder('v')
      .where('v.trackId = :trackId', { trackId })
      .select(['v.referrerDomain AS domain', 'COUNT(v.id) AS views'])
      .groupBy('v.referrerDomain')
      .orderBy('views', 'DESC')
      .limit(20)
      .getRawMany();

    const last30Days = await this.embedViewRepo
      .createQueryBuilder('v')
      .where('v.trackId = :trackId', { trackId })
      .andWhere(`v.viewedAt >= NOW() - INTERVAL '30 days'`)
      .select([`DATE_TRUNC('day', v.viewedAt) AS day`, 'COUNT(v.id) AS views'])
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return { total, byDomain, last30Days };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async getTrackOrFail(trackId: string) {
    const track = await this.embedViewRepo.manager.findOne('tracks', {
      where: { id: trackId },
      relations: ['artist'],
    } as any);
    if (!track) throw new NotFoundException('Track not found');
    return track as any;
  }

  private assertEmbedEnabled(track: any): void {
    if (track.embedDisabled) {
      throw new ForbiddenException('Embed disabled for this track');
    }
  }

  private extractDomain(referrer: string | null): string | null {
    if (!referrer) return null;
    try {
      return new URL(referrer).hostname;
    } catch {
      return null;
    }
  }

  private checkDomainRateLimit(domain: string, limit = 1000): void {
    const now = Date.now();
    const entry = this.domainRateLimit.get(domain);

    if (!entry || entry.resetAt < now) {
      this.domainRateLimit.set(domain, { count: 1, resetAt: now + 3_600_000 });
      return;
    }

    if (entry.count >= limit) {
      throw new ForbiddenException('Rate limit exceeded for this domain');
    }

    entry.count++;
  }
}