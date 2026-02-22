export interface TipDataPoint {
  date: string;
  amount: number;
}

export interface GenreDistribution {
  genre: string;
  value: number;
  color: string;
}

export interface TrackStats {
  name: string;
  artist: string;
  playCount: number;
  tipAmount: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface FollowerGrowthPoint {
  date: string;
  followers: number;
}

export interface LiveTip {
  id: string;
  amount: number;
  userName: string;
  timestamp: number;
  x: number;
  y: number;
}

// Lightweight runtime analytics shim used across the UI. Replace with
// real analytics implementation (Amplitude, Plausible, Segment) in production.
export const analytics = {
  onboardingStepViewed: (_id: string | number, _index?: number) => {},
  onboardingStepCompleted: (_id: string | number, _index?: number, _elapsed?: number) => {},
  onboardingDraftSaved: (_currentStep?: string) => {},
  onboardingSkipped: (_id?: string | number) => {},
  walletConnected: (_network?: string) => {},
  trackUploaded: (_size?: number, _type?: string) => {},
};
