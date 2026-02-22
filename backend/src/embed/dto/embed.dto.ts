import { IsOptional, IsString, IsUrl } from 'class-validator';

export class RecordEmbedViewDto {
  @IsOptional()
  @IsString()
  referrerDomain?: string;
}

export class OEmbedResponseDto {
  type: string;
  version: string;
  title: string;
  author_name: string;
  author_url: string;
  provider_name: string;
  provider_url: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html: string;
  width: number;
  height: number;
}

export class EmbedTokenResponseDto {
  token: string;
  trackId: string;
  generatedAt: Date;
  expiresAt: Date;
}

export class EmbedAnalyticsDto {
  trackId: string;
  totalViews: number;
  viewsByDomain: { domain: string; views: number }[];
  last7DaysViews: number;
  last30DaysViews: number;
}

export class PlayerDataDto {
  trackId: string;
  title: string;
  artistName: string;
  audioUrl: string;
  coverUrl?: string;
  durationSeconds?: number;
  genre?: string;
}