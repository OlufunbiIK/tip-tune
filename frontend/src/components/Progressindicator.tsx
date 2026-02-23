import { Step } from "@/types/onboarding";
import React from "react";

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (index: number) => void;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="progress-indicator">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="steps-row">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isAccessible = isCompleted || index <= currentStep;

          return (
            <button
              key={step.id}
              className={`step-dot ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${isAccessible ? "accessible" : "locked"}`}
              onClick={() => isAccessible && onStepClick?.(index)}
              disabled={!isAccessible}
              title={step.title}
              aria-label={`Step ${index + 1}: ${step.title}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
            >
              <span className="dot-inner">
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="dot-number">{index + 1}</span>
                )}
              </span>
              <span className="dot-label">{step.title}</span>
            </button>
          );
        })}
      </div>
      <div className="progress-text">
        Step {currentStep + 1} of {steps.length} — {steps[currentStep]?.title}
      </div>
    </div>
  );
};
