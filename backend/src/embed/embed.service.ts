import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Track } from './entities/track.entity';
import {
  OEmbedResponseDto,
  EmbedTokenResponseDto,
  EmbedAnalyticsDto,
  PlayerDataDto,
} from './dto/embed.dto';
import { EmbedView } from './embed-view';

@Injectable()
export class EmbedService {
  private readonly appBaseUrl: string;
  private readonly tokenTtlMs: number;

  constructor(
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,

    @InjectRepository(EmbedView)
    private readonly embedViewRepo: Repository<EmbedView>,

    private readonly configService: ConfigService,
  ) {
    this.appBaseUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000');
    this.tokenTtlMs = this.configService.get<number>('EMBED_TOKEN_TTL_MS', 365 * 24 * 60 * 60 * 1000); // 1 year
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async findTrackOrThrow(trackId: string): Promise<Track> {
    const track = await this.trackRepo.findOne({ where: { id: trackId } });
    if (!track) throw new NotFoundException(`Track ${trackId} not found`);
    return track;
  }

  private assertEmbedsEnabled(track: Track): void {
    if (!track.embedsEnabled) {
      throw new ForbiddenException('Embeds are disabled for this track');
    }
  }

  private extractDomain(rawReferrer?: string): string | null {
    if (!rawReferrer) return null;
    try {
      const url = rawReferrer.startsWith('http') ? rawReferrer : `https://${rawReferrer}`;
      return new URL(url).hostname;
    } catch {
      return rawReferrer.slice(0, 255);
    }
  }

  // ─── Token Generation ────────────────────────────────────────────────────

  async generateToken(trackId: string): Promise<EmbedTokenResponseDto> {
    const track = await this.findTrackOrThrow(trackId);
    this.assertEmbedsEnabled(track);

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.tokenTtlMs);

    await this.trackRepo.update(trackId, {
      embedToken: token,
      embedTokenGeneratedAt: now,
    });

    return { token, trackId, generatedAt: now, expiresAt };
  }

  // ─── oEmbed ──────────────────────────────────────────────────────────────

  async getOEmbed(trackId: string, maxWidth?: number, maxHeight?: number): Promise<OEmbedResponseDto> {
    const track = await this.findTrackOrThrow(trackId);
    this.assertEmbedsEnabled(track);

    const width = maxWidth || 560;
    const height = maxHeight || 152;
    const playerUrl = `${this.appBaseUrl}/embed/${trackId}/player`;
    const trackPageUrl = `${this.appBaseUrl}/tracks/${trackId}`;
    const artistUrl = `${this.appBaseUrl}/artists/${encodeURIComponent(track.artistName)}`;

    return {
      type: 'rich',
      version: '1.0',
      title: track.title,
      author_name: track.artistName,
      author_url: artistUrl,
      provider_name: this.configService.get('APP_NAME', 'MusicApp'),
      provider_url: this.appBaseUrl,
      thumbnail_url: track.coverUrl || undefined,
      thumbnail_width: track.coverUrl ? 300 : undefined,
      thumbnail_height: track.coverUrl ? 300 : undefined,
      html: `<iframe src="${playerUrl}" width="${width}" height="${height}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`,
      width,
      height,
    };
  }

  // ─── Meta Tags ───────────────────────────────────────────────────────────

  async getMetaTags(trackId: string): Promise<string> {
    const track = await this.findTrackOrThrow(trackId);
    this.assertEmbedsEnabled(track);

    const trackUrl = `${this.appBaseUrl}/tracks/${trackId}`;
    const playerUrl = `${this.appBaseUrl}/embed/${trackId}/player`;
    const appName = this.configService.get('APP_NAME', 'MusicApp');
    const coverUrl = track.coverUrl || `${this.appBaseUrl}/default-cover.png`;
    const description = track.description
      ? track.description.slice(0, 200)
      : `Listen to ${track.title} by ${track.artistName}`;

    return `
<!-- Open Graph -->
<meta property="og:type" content="music.song" />
<meta property="og:url" content="${trackUrl}" />
<meta property="og:title" content="${this.escapeHtml(track.title)}" />
<meta property="og:description" content="${this.escapeHtml(description)}" />
<meta property="og:image" content="${coverUrl}" />
<meta property="og:image:width" content="300" />
<meta property="og:image:height" content="300" />
<meta property="og:site_name" content="${appName}" />
<meta property="music:musician" content="${this.escapeHtml(track.artistName)}" />
${track.durationSeconds ? `<meta property="music:duration" content="${track.durationSeconds}" />` : ''}

<!-- Twitter Card -->
<meta name="twitter:card" content="player" />
<meta name="twitter:title" content="${this.escapeHtml(track.title)}" />
<meta name="twitter:description" content="${this.escapeHtml(description)}" />
<meta name="twitter:image" content="${coverUrl}" />
<meta name="twitter:player" content="${playerUrl}" />
<meta name="twitter:player:width" content="560" />
<meta name="twitter:player:height" content="152" />

<!-- oEmbed Discovery -->
<link rel="alternate" type="application/json+oembed" href="${this.appBaseUrl}/api/embed/${trackId}/oembed" title="${this.escapeHtml(track.title)}" />
`.trim();
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ─── View Recording ──────────────────────────────────────────────────────

  async recordView(trackId: string, rawReferrer?: string): Promise<void> {
    const track = await this.findTrackOrThrow(trackId);
    this.assertEmbedsEnabled(track);

    const referrerDomain = this.extractDomain(rawReferrer);

    const view = this.embedViewRepo.create({
      trackId,
      referrerDomain,
    });

    await this.embedViewRepo.save(view);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  async getAnalytics(trackId: string): Promise<EmbedAnalyticsDto> {
    await this.findTrackOrThrow(trackId);

    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, viewsByDomain, last7DaysViews, last30DaysViews] = await Promise.all([
      this.embedViewRepo.count({ where: { trackId } }),

      this.embedViewRepo
        .createQueryBuilder('ev')
        .select('ev.referrerDomain', 'domain')
        .addSelect('COUNT(*)', 'views')
        .where('ev.trackId = :trackId', { trackId })
        .andWhere('ev.referrerDomain IS NOT NULL')
        .groupBy('ev.referrerDomain')
        .orderBy('views', 'DESC')
        .limit(20)
        .getRawMany(),

      this.embedViewRepo
        .createQueryBuilder('ev')
        .where('ev.trackId = :trackId', { trackId })
        .andWhere('ev.viewedAt >= :date', { date: last7 })
        .getCount(),

      this.embedViewRepo
        .createQueryBuilder('ev')
        .where('ev.trackId = :trackId', { trackId })
        .andWhere('ev.viewedAt >= :date', { date: last30 })
        .getCount(),
    ]);

    return {
      trackId,
      totalViews,
      viewsByDomain: viewsByDomain.map((r) => ({
        domain: r.domain,
        views: parseInt(r.views, 10),
      })),
      last7DaysViews,
      last30DaysViews,
    };
  }

  // ─── Player Data ─────────────────────────────────────────────────────────

  async getPlayerData(trackId: string): Promise<PlayerDataDto> {
    const track = await this.findTrackOrThrow(trackId);
    this.assertEmbedsEnabled(track);

    return {
      trackId: track.id,
      title: track.title,
      artistName: track.artistName,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl,
      durationSeconds: track.durationSeconds,
      genre: track.genre,
    };
  }
}