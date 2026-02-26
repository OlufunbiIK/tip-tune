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

type AnalyticsEvent =
  | {
      name: "onboarding_step_viewed";
      stepId: string;
      stepIndex: number;
    }
  | {
      name: "onboarding_step_completed";
      stepId: string;
      stepIndex: number;
      elapsedMs: number;
    }
  | {
      name: "onboarding_skipped";
      stepId: string;
    }
  | {
      name: "onboarding_draft_saved";
      stepId: string;
    }
  | {
      name: "wallet_connected";
      network: string;
    }
  | {
      name: "track_uploaded";
      fileSize: number;
      fileType: string;
    };

function track(event: AnalyticsEvent) {
  // Replace this with your analytics provider integration.
  if (typeof window !== "undefined") {
    // Keep this visible during development and harmless in production.
    console.debug("[analytics]", event);
  }
}

export const analytics = {
  onboardingStepViewed(stepId: string, stepIndex: number) {
    track({ name: "onboarding_step_viewed", stepId, stepIndex });
  },
  onboardingStepCompleted(
    stepId: string,
    stepIndex: number,
    elapsedMs: number,
  ) {
    track({ name: "onboarding_step_completed", stepId, stepIndex, elapsedMs });
  },
  onboardingSkipped(stepId: string) {
    track({ name: "onboarding_skipped", stepId });
  },
  onboardingDraftSaved(stepId: string) {
    track({ name: "onboarding_draft_saved", stepId });
  },
  walletConnected(network: string) {
    track({ name: "wallet_connected", network });
  },
  trackUploaded(fileSize: number, fileType: string) {
    track({ name: "track_uploaded", fileSize, fileType });
  },
};
