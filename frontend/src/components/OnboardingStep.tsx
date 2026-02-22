import React from "react";

interface OnboardingStepProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => (
  <div className="tooltip-wrapper">
    {children}
    <div className="tooltip-bubble" role="tooltip">
      {content}
    </div>
  </div>
);

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = "",
}) => {
  return (
    <div className={`onboarding-step ${className}`}>
      <div className="step-header">
        {icon && <div className="step-icon">{icon}</div>}
        <div className="step-header-text">
          <h2 className="step-title">{title}</h2>
          <p className="step-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="step-content">{children}</div>
    </div>
  );
};
