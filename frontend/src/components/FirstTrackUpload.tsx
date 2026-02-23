import React, { useRef, useCallback, useState } from "react";
import { OnboardingStep, Tooltip } from "./OnboardingStep";
import { OnboardingData, ValidationErrors } from "@/types/onboarding";
import { analytics } from "@/types/analytics";

interface FirstTrackUploadProps {
  data: OnboardingData;
  errors: ValidationErrors;
  onChange: (updates: Partial<OnboardingData["track"]>) => void;
  clearError: (field: string) => void;
}

export const FirstTrackUpload: React.FC<FirstTrackUploadProps> = ({
  data,
  errors,
  onChange,
  clearError,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { track } = data;

  const handleAudioFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("audio/")) return;
      const url = URL.createObjectURL(file);
      onChange({
        file,
        previewUrl: url,
        title: track.title || file.name.replace(/\.[^.]+$/, ""),
      });
      clearError("trackFile");
      analytics.trackUploaded(file.size, file.type);
    },
    [onChange, clearError, track.title],
  );

  const handleAudioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleAudioFile(file);
    },
    [handleAudioFile],
  );

  const handleCoverChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onChange({ coverArt: file, coverArtUrl: url });
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleAudioFile(file);
    },
    [handleAudioFile],
  );

  return (
    <OnboardingStep
      title="Upload Your First Track"
      subtitle="Share your music with the world. We'll guide you through every step."
      icon={<span className="step-emoji">🎵</span>}
    >
      {/* Audio Upload */}
      <div className="form-group">
        <label className="form-label">
          Audio File *
          <Tooltip content="We support MP3, WAV, FLAC, and AAC. Max 100MB.">
            <span className="info-icon">?</span>
          </Tooltip>
        </label>
        <div
          className={`dropzone ${isDragging ? "dragging" : ""} ${track.file ? "has-file" : ""} ${errors.trackFile ? "error" : ""}`}
          onClick={() => audioInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {track.file ? (
            <div className="file-preview">
              <div className="audio-icon">🎧</div>
              <div className="file-info">
                <span className="file-name">{track.file.name}</span>
                <span className="file-size">
                  {(track.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              {track.previewUrl && (
                <audio
                  controls
                  src={track.previewUrl}
                  className="audio-preview"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <button
                type="button"
                className="replace-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  audioInputRef.current?.click();
                }}
              >
                Replace
              </button>
            </div>
          ) : (
            <div className="dropzone-empty">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <p>
                Drop your track here or{" "}
                <span className="link-text">browse files</span>
              </p>
              <span className="dropzone-hint">
                MP3, WAV, FLAC, AAC — up to 100MB
              </span>
            </div>
          )}
        </div>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={handleAudioChange}
        />
        {errors.trackFile && (
          <span className="form-error">{errors.trackFile}</span>
        )}
      </div>

      {/* Track Title */}
      <div className="form-group">
        <label className="form-label" htmlFor="track-title">
          Track Title *
        </label>
        <input
          id="track-title"
          type="text"
          className={`form-input ${errors.trackTitle ? "error" : ""}`}
          placeholder="Give your track a name"
          value={track.title}
          onChange={(e) => {
            onChange({ title: e.target.value });
            clearError("trackTitle");
          }}
        />
        {errors.trackTitle && (
          <span className="form-error">{errors.trackTitle}</span>
        )}
      </div>

      {/* Track Description */}
      <div className="form-group">
        <label className="form-label" htmlFor="track-desc">
          Description
        </label>
        <textarea
          id="track-desc"
          className="form-textarea"
          placeholder="Tell the story behind this track..."
          value={track.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
        />
      </div>

      {/* Cover Art */}
      <div className="form-group">
        <label className="form-label">
          Cover Art
          <Tooltip content="Square images (1:1) work best. At least 500×500px recommended.">
            <span className="info-icon">?</span>
          </Tooltip>
        </label>
        <div className="cover-upload-row">
          <div
            className="cover-preview-box"
            onClick={() => coverInputRef.current?.click()}
          >
            {track.coverArtUrl ? (
              <img
                src={track.coverArtUrl}
                alt="Cover art"
                className="cover-preview-img"
              />
            ) : (
              <div className="cover-placeholder">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Add Cover</span>
              </div>
            )}
          </div>
          <div className="cover-upload-hints">
            <p>A great cover art makes your track stand out.</p>
            <ul>
              <li>Square format (1:1 ratio)</li>
              <li>At least 500×500 pixels</li>
              <li>JPG or PNG format</li>
            </ul>
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={() => coverInputRef.current?.click()}
            >
              {track.coverArtUrl ? "Change Image" : "Upload Image"}
            </button>
          </div>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleCoverChange}
        />
      </div>
    </OnboardingStep>
  );
};
