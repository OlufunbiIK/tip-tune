import { useState, useEffect, useCallback, useRef } from "react";
import type { OnboardingData } from "../types/onboarding";
import { analytics } from "@/types/analytics";

const STORAGE_KEY = "tiptune_onboarding_draft";

const initialData: OnboardingData = {
  currentStep: 0,
  completedSteps: [],
  profile: {
    name: "",
    bio: "",
    genre: [],
    profilePicture: null,
    profilePictureUrl: "",
  },
  wallet: {
    connected: false,
    publicKey: "",
    network: "testnet",
  },
  track: {
    file: null,
    title: "",
    description: "",
    coverArt: null,
    coverArtUrl: "",
    previewUrl: "",
  },
  checklist: {
    profile_complete: false,
    wallet_connected: false,
    track_uploaded: false,
    social_shared: false,
    bio_written: false,
  },
  startedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
};

function serializeForStorage(data: OnboardingData): string {
  const serializable = {
    ...data,
    profile: {
      ...data.profile,
      profilePicture: null, // File objects can't be serialized
    },
    track: {
      ...data.track,
      file: null,
      coverArt: null,
    },
  };
  return JSON.stringify(serializable);
}

export function useOnboardingPersistence() {
  const [data, setDataInternal] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialData, ...parsed };
      }
    } catch {}
    return initialData;
  });

  const stepStartTime = useRef<number>(Date.now());

  const setData = useCallback(
    (
      updater:
        | Partial<OnboardingData>
        | ((prev: OnboardingData) => OnboardingData),
    ) => {
      setDataInternal((prev) => {
        const next =
          typeof updater === "function"
            ? updater(prev)
            : { ...prev, ...updater, lastUpdated: new Date().toISOString() };
        return { ...next, lastUpdated: new Date().toISOString() };
      });
    },
    [],
  );

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeForStorage(data));
    } catch {}
  }, [data]);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeForStorage(data));
      analytics.onboardingDraftSaved(String(data.currentStep));
    } catch {}
  }, [data]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasDraft = useCallback(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  }, []);

  const goToStep = useCallback(
    (stepIndex: number) => {
      const elapsed = Date.now() - stepStartTime.current;
      analytics.onboardingStepCompleted(
        String(data.currentStep),
        data.currentStep,
        elapsed,
      );
      stepStartTime.current = Date.now();
      analytics.onboardingStepViewed(String(stepIndex), stepIndex);
      setData((prev) => ({
        ...prev,
        currentStep: stepIndex,
        completedSteps: prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep],
      }));
    },
    [data.currentStep, setData],
  );

  const markStepComplete = useCallback(
    (stepIndex: number) => {
      setData((prev) => ({
        ...prev,
        completedSteps: prev.completedSteps.includes(stepIndex)
          ? prev.completedSteps
          : [...prev.completedSteps, stepIndex],
      }));
    },
    [setData],
  );

  return {
    data,
    setData,
    saveDraft,
    clearDraft,
    hasDraft,
    goToStep,
    markStepComplete,
    stepStartTime,
  };
}
