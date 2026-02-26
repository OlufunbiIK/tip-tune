export interface TipSummaryDto {
  totalTips: number;
  totalAmount: number;
  averageTipAmount: number;
  uniqueTippers: number;
  uniqueArtists: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface TrendDataPoint {
  timestamp: Date;
  tipCount: number;
  totalAmount: number;
  uniqueTippers: number;
}

export interface TrendsResponseDto {
  data: TrendDataPoint[];
  period: string;
  groupBy: string;
  summary: {
    totalTips: number;
    totalAmount: number;
    growthRate: number;
  };
}

export interface ArtistRankingDto {
  artistId: string;
  artistName: string;
  profileImage?: string;
  rank: number;
  totalTips: number;
  totalAmount: number;
  averageTipAmount: number;
  uniqueTippers: number;
  genre?: string;
}

export interface RankingsResponseDto {
  rankings: ArtistRankingDto[];
  period: string;
  total: number;
  updatedAt: Date;
}

export interface GenreDistributionDto {
  genre: string;
  tipCount: number;
  totalAmount: number;
  percentage: number;
  artistCount: number;
}

export interface GenreDistributionResponseDto {
  distribution: GenreDistributionDto[];
  period: string;
  totalAmount: number;
  updatedAt: Date;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface TimeSeriesResponseDto {
  series: TimeSeriesDataPoint[];
  metric: string;
  period: string;
}

export interface ArtistAnalyticsDto {
  artistId: string;
  artistName: string;
  totalTips: number;
  totalAmount: number;
  averageTipAmount: number;
  uniqueTippers: number;
  tipGrowthRate: number;
  topTippers: {
    userId: string;
    username: string;
    totalAmount: number;
    tipCount: number;
  }[];
  dailyTrends: TrendDataPoint[];
}

export interface ExportReportDto {
  format: 'csv' | 'json' | 'xlsx';
  data: any[] | string;
  filename: string;
  generatedAt: Date;
}
