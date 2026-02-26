import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../utils/theme';

type ThemeToggleProps = {
  className?: string;
  showAdvanced?: boolean;
  compact?: boolean;
};

const modeOptions: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ElementType;
}> = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'auto', label: 'Auto', icon: Monitor },
];

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 py-2">
    <span>
      <span className="block text-sm font-medium text-app">{label}</span>
      <span className="block text-xs text-muted">{description}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-12 rounded-full transition-colors ${
        checked ? 'bg-primary-blue' : 'bg-gray-300 dark:bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </label>
);

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showAdvanced = false,
  compact = false,
}) => {
  const {
    preferences,
    resolvedTheme,
    setThemeMode,
    setHighContrast,
    setOledDark,
    setAnimationsEnabled,
  } = useTheme();

  return (
    <div
      className={`rounded-xl border border-app bg-surface p-2 shadow-sm theme-transition ${className}`}
      data-testid="theme-toggle"
    >
      <div className="inline-flex rounded-lg bg-surface-muted p-1">
        {modeOptions.map(({ mode, label, icon: Icon }) => {
          const isActive = preferences.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface text-app shadow-sm'
                  : 'text-muted hover:text-app'
              }`}
              aria-pressed={isActive}
              title={label}
            >
              <Icon className="h-4 w-4" />
              {!compact && <span>{label}</span>}
            </button>
          );
        })}
      </div>

      {showAdvanced && !compact && (
        <div className="mt-3 border-t border-app pt-3">
          <ToggleRow
            label="High Contrast"
            description="Boost legibility for text and controls."
            checked={preferences.highContrast}
            onChange={setHighContrast}
          />
          <ToggleRow
            label="True Black"
            description="Use OLED pure black surfaces in dark mode."
            checked={preferences.oledDark}
            onChange={setOledDark}
          />
          <ToggleRow
            label="UI Motion"
            description="Enable theme transition and UI animations."
            checked={preferences.animationsEnabled}
            onChange={setAnimationsEnabled}
          />
          <p className="mt-2 text-xs text-muted">
            Active theme: <span className="font-medium text-app">{resolvedTheme}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
