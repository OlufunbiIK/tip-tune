import apiClient from '../utils/api';

export enum LeaderboardType {
  ARTIST_MOST_TIPPED = 'artists/most-tipped',
  ARTIST_MOST_PLAYED = 'artists/most-played',
  ARTIST_FASTEST_GROWING = 'artists/fastest-growing',
  ARTIST_BY_GENRE = 'artists/by-genre',
  TIPPER_MOST_GENEROUS = 'tippers/most-generous',
  TIPPER_MOST_ACTIVE = 'tippers/most-active',
  TIPPER_BIGGEST_SINGLE = 'tippers/biggest-single',
  TRACK_TRENDING = 'tracks/trending',
  TRACK_MOST_TIPPED = 'tracks/most-tipped',
  TRACK_MOST_PLAYED = 'tracks/most-played',
}

export enum Timeframe {
  ALL_TIME = 'all-time',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank?: number;
  change?: number;
  score: number;
  name: string;
  avatarUrl?: string;
  additionalData?: Record<string, any>;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  timeframe: string;
  updatedAt: string;
}

export interface LeaderboardQuery {
  timeframe?: Timeframe;
  limit?: number;
  offset?: number;
  genre?: string;
}

class LeaderboardService {
  async getLeaderboard(
    type: LeaderboardType,
    query: LeaderboardQuery = {},
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    
    if (query.timeframe) params.append('timeframe', query.timeframe);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());
    if (query.genre && type !== LeaderboardType.ARTIST_BY_GENRE) {
      params.append('genre', query.genre);
    }

    let url: string;
    if (type === LeaderboardType.ARTIST_BY_GENRE && query.genre) {
      url = `/leaderboards/${type}/${query.genre}?${params.toString()}`;
    } else {
      url = `/leaderboards/${type}?${params.toString()}`;
    }

    const response = await apiClient.get<LeaderboardResponse>(url);
    return response.data;
  }

  async getArtistByGenre(
    genre: string,
    query: LeaderboardQuery = {},
  ): Promise<LeaderboardResponse> {
    return this.getLeaderboard(LeaderboardType.ARTIST_BY_GENRE, { ...query, genre });
  }
}

export const leaderboardService = new LeaderboardService();
