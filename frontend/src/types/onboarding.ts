export interface OnboardingProfile {
  name: string;
  bio: string;
  genre: string[];
  profilePicture: File | null;
  profilePictureUrl: string;
}

export interface WalletState {
  connected: boolean;
  publicKey: string;
  network: "mainnet" | "testnet";
}

export interface TrackUpload {
  file: File | null;
  title: string;
  description: string;
  coverArt: File | null;
  coverArtUrl: string;
  previewUrl: string;
}

export interface OnboardingData {
  currentStep: number;
  completedSteps: number[];
  profile: OnboardingProfile;
  wallet: WalletState;
  track: TrackUpload;
  checklist: Record<string, boolean>;
  startedAt: string;
  lastUpdated: string;
}

export type StepId =
  | "welcome"
  | "profile"
  | "wallet"
  | "upload"
  | "promotion"
  | "complete";

export interface Step {
  id: StepId;
  index: number;
  title: string;
  subtitle: string;
  skippable: boolean;
}

export interface ValidationErrors {
  [field: string]: string;
}

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
}
