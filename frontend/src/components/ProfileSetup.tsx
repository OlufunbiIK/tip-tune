import React, { useRef, useCallback } from "react";
import { OnboardingStep, Tooltip } from "./OnboardingStep";
import { OnboardingData, ValidationErrors } from "@/types/onboarding";
import { GENRES } from "@/hooks/useValidation";

interface ProfileSetupProps {
  data: OnboardingData;
  errors: ValidationErrors;
  onChange: (updates: Partial<OnboardingData["profile"]>) => void;
  clearError: (field: string) => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  data,
  errors,
  onChange,
  clearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = data;

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onChange({ profilePicture: file, profilePictureUrl: url });
      clearError("profilePicture");
    },
    [onChange, clearError],
  );

  const toggleGenre = useCallback(
    (genre: string) => {
      const current = profile.genre;
      const next = current.includes(genre)
        ? current.filter((g) => g !== genre)
        : [...current, genre];
      onChange({ genre: next });
      clearError("genre");
    },
    [profile.genre, onChange, clearError],
  );

  return (
    <OnboardingStep
      title="Set Up Your Artist Profile"
      subtitle="Let fans know who you are and what you create."
    >
      {/* Profile Picture */}
      <div className="form-group">
        <label className="form-label">
          Profile Picture
          <Tooltip content="A great photo helps fans connect with you. Square images work best.">
            <span className="info-icon">?</span>
          </Tooltip>
        </label>
        <div
          className="avatar-upload-area"
          onClick={() => fileInputRef.current?.click()}
        >
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt="Profile preview"
              className="avatar-preview"
            />
          ) : (
            <div className="avatar-placeholder">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>Upload Photo</span>
            </div>
          )}
          <div className="avatar-overlay">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Change
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />
      </div>

      {/* Artist Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="artist-name">
          Artist Name *
        </label>
        <input
          id="artist-name"
          type="text"
          className={`form-input ${errors.name ? "error" : ""}`}
          placeholder="Your stage name"
          value={profile.name}
          onChange={(e) => {
            onChange({ name: e.target.value });
            clearError("name");
          }}
          maxLength={60}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
        <span className="form-hint">{profile.name.length}/60</span>
      </div>

      {/* Bio */}
      <div className="form-group">
        <label className="form-label" htmlFor="artist-bio">
          Bio *
          <Tooltip content="Tell your story! What inspired you? Where are you from? Keep it authentic.">
            <span className="info-icon">?</span>
          </Tooltip>
        </label>
        <textarea
          id="artist-bio"
          className={`form-textarea ${errors.bio ? "error" : ""}`}
          placeholder="Tell fans about yourself, your sound, your story..."
          value={profile.bio}
          onChange={(e) => {
            onChange({ bio: e.target.value });
            clearError("bio");
          }}
          rows={4}
          maxLength={500}
        />
        {errors.bio && <span className="form-error">{errors.bio}</span>}
        <span className="form-hint">{profile.bio.length}/500</span>
      </div>

      {/* Genre */}
      <div className="form-group">
        <label className="form-label">
          Genre(s) *
          <Tooltip content="Select all genres that describe your music. This helps fans discover you.">
            <span className="info-icon">?</span>
          </Tooltip>
        </label>
        <div className="genre-grid">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`genre-chip ${profile.genre.includes(genre) ? "selected" : ""}`}
              onClick={() => toggleGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
        {errors.genre && <span className="form-error">{errors.genre}</span>}
      </div>
    </OnboardingStep>
  );
};
