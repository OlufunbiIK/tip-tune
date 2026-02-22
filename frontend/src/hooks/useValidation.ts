import { useState, useCallback } from "react";
import type { OnboardingData, ValidationErrors } from "../types/onboarding";

const GENRES = [
  "Afrobeats",
  "Hip-Hop",
  "R&B",
  "Pop",
  "Jazz",
  "Electronic",
  "Classical",
  "Reggae",
  "Rock",
  "Soul",
  "Gospel",
  "Alternative",
];

export { GENRES };

export function useValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateProfile = useCallback((data: OnboardingData): boolean => {
    const errs: ValidationErrors = {};
    if (!data.profile.name.trim()) errs.name = "Artist name is required";
    else if (data.profile.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!data.profile.bio.trim()) errs.bio = "Bio is required";
    else if (data.profile.bio.trim().length < 20)
      errs.bio = "Bio should be at least 20 characters";
    if (data.profile.genre.length === 0)
      errs.genre = "Select at least one genre";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, []);

  const validateWallet = useCallback((data: OnboardingData): boolean => {
    const errs: ValidationErrors = {};
    if (!data.wallet.connected)
      errs.wallet = "Please connect your Stellar wallet to continue";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, []);

  const validateTrack = useCallback((data: OnboardingData): boolean => {
    const errs: ValidationErrors = {};
    if (!data.track.title.trim()) errs.trackTitle = "Track title is required";
    if (!data.track.file) errs.trackFile = "Please upload an audio file";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    errors,
    validateProfile,
    validateWallet,
    validateTrack,
    clearError,
    setErrors,
  };
}
