import React from "react";
import { OnboardingStep } from "./OnboardingStep";
import { OnboardingData } from "@/types/onboarding";

interface OnboardingCompleteProps {
  data: OnboardingData;
  onChecklistToggle: (key: string) => void;
}

const CHECKLIST_ITEMS = [
  { key: "profile_complete", label: "Profile complete", icon: "👤" },
  { key: "wallet_connected", label: "Stellar wallet connected", icon: "💫" },
  { key: "track_uploaded", label: "First track uploaded", icon: "🎵" },
  { key: "social_shared", label: "Shared on social media", icon: "📣" },
  { key: "bio_written", label: "Bio written", icon: "✍️" },
];

const NEXT_STEPS = [
  {
    icon: "💰",
    title: "Set Up Tipping",
    desc: "Enable fans to send you XLM tips directly.",
  },
  {
    icon: "📊",
    title: "Check Your Analytics",
    desc: `See who's listening and where your fans are.`,
  },
  {
    icon: "🎙️",
    title: "Upload More Tracks",
    desc: "Keep your profile fresh with regular releases.",
  },
  {
    icon: "🤝",
    title: "Collaborate",
    desc: "Connect with other TipTune artists.",
  },
];

export const OnboardingComplete: React.FC<OnboardingCompleteProps> = ({
  data,
  onChecklistToggle,
}) => {
  const completedCount = Object.values(data.checklist).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allDone = completedCount === totalCount;

  return (
    <OnboardingStep
      title={allDone ? "You're All Set! 🎉" : "Almost There!"}
      subtitle={
        allDone
          ? "Your artist profile is live. Start sharing your music with the world."
          : `Complete your setup — ${totalCount - completedCount} item${totalCount - completedCount !== 1 ? "s" : ""} remaining.`
      }
    >
      {/* Celebration */}
      <div className="celebration-banner">
        <div className="confetti-strip">
          {["🎊", "🎵", "⭐", "🎤", "💫", "🎸", "🎹", "🎺"].map((emoji, i) => (
            <span
              key={i}
              className="confetti-emoji"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <div className="artist-card">
          {data.profile.profilePictureUrl ? (
            <img
              src={data.profile.profilePictureUrl}
              alt={data.profile.name}
              className="artist-card-avatar"
            />
          ) : (
            <div className="artist-card-avatar-placeholder">
              {data.profile.name ? data.profile.name[0]?.toUpperCase() : "🎤"}
            </div>
          )}
          <div className="artist-card-info">
            <h3>{data.profile.name || "Your Artist Name"}</h3>
            {data.profile.genre.length > 0 && (
              <p>{data.profile.genre.slice(0, 3).join(" · ")}</p>
            )}
            {data.wallet.connected && (
              <span className="wallet-badge">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                Stellar Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="section-title">Your Setup Checklist</div>
      <div className="checklist">
        <div className="checklist-progress">
          <div className="checklist-bar">
            <div
              className="checklist-bar-fill"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="checklist-count">
            {completedCount}/{totalCount} complete
          </span>
        </div>
        {CHECKLIST_ITEMS.map((item) => (
          <label
            key={item.key}
            className={`checklist-item ${data.checklist[item.key] ? "checked" : ""}`}
          >
            <input
              type="checkbox"
              checked={!!data.checklist[item.key]}
              onChange={() => onChecklistToggle(item.key)}
            />
            <span className="checklist-checkbox">
              {data.checklist[item.key] && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <span className="checklist-icon">{item.icon}</span>
            <span className="checklist-label">{item.label}</span>
          </label>
        ))}
      </div>

      {/* Next Steps */}
      <div className="section-title" style={{ marginTop: "2rem" }}>
        What's Next?
      </div>
      <div className="next-steps-grid">
        {NEXT_STEPS.map((step) => (
          <div key={step.title} className="next-step-card">
            <span className="next-step-icon">{step.icon}</span>
            <div>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary btn-large"
        style={{ width: "100%", marginTop: "2rem" }}
      >
        Go to Your Dashboard →
      </button>
    </OnboardingStep>
  );
};
