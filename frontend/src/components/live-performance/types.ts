export interface LiveTipEvent {
  id: string;
  tipperName: string;
  amount: number;
  asset: string;
  createdAt: string;
  isLargeTip: boolean;
}

export interface LeaderboardEntry {
  tipperName: string;
  total: number;
  tipCount: number;
}

export interface LiveSessionState {
  artistId: string;
  isSessionActive: boolean;
  privacyMode: boolean;
  sessionStartedAt: string | null;
  sessionTotalXlm: number;
  tipCount: number;
  hypeScore: number;
  alerts: LiveTipEvent[];
  leaderboard: LeaderboardEntry[];
}
