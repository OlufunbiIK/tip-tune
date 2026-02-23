import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Monitor, Save, Volume2, VolumeX } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../ThemeToggle';
import { userService } from '../../services/userService';
import { setComboSoundEnabled } from '../../utils/combo';

const STORAGE_KEY = 'tiptune.display.controls.v1';

type LocalDisplayControls = {
  compactMode: boolean;
  comboSoundEnabled: boolean;
};

const defaultControls: LocalDisplayControls = {
  compactMode: false,
  comboSoundEnabled: true,
};

const readLocalControls = (): LocalDisplayControls => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultControls;
    const parsed = JSON.parse(saved) as Partial<LocalDisplayControls>;
    return {
      compactMode:
        typeof parsed.compactMode === 'boolean'
          ? parsed.compactMode
          : defaultControls.compactMode,
      comboSoundEnabled:
        typeof parsed.comboSoundEnabled === 'boolean'
          ? parsed.comboSoundEnabled
          : defaultControls.comboSoundEnabled,
    };
  } catch {
    return defaultControls;
  }
};

const persistLocalControls = (controls: LocalDisplayControls): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  setComboSoundEnabled(controls.comboSoundEnabled);
};

const ToggleRow: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}> = ({ icon: Icon, title, description, value, onChange }) => (
  <div className="flex items-center justify-between rounded-xl border border-app bg-surface p-4">
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-surface-muted p-2">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold text-app">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-12 rounded-full transition-colors ${
        value ? 'bg-primary-blue' : 'bg-gray-300 dark:bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const DisplaySettings = () => {
  const { isConnected } = useWallet();
  const { preferences, isSynced } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [controls, setControls] = useState<LocalDisplayControls>(defaultControls);
  const [originalControls, setOriginalControls] =
    useState<LocalDisplayControls>(defaultControls);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const local = readLocalControls();
      if (!cancelled) {
        setControls(local);
        setOriginalControls(local);
      }

      if (isConnected) {
        try {
          const response = await userService.getSettings();
          if (cancelled) return;
          setControls((prev) => ({
            ...prev,
            compactMode: response.display?.compactMode ?? prev.compactMode,
          }));
        } catch {
          // Keep local values when backend settings are unavailable.
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  const hasChanges = useMemo(
    () => JSON.stringify(controls) !== JSON.stringify(originalControls),
    [controls, originalControls],
  );

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    persistLocalControls(controls);

    try {
      if (isConnected) {
        await userService.updateDisplaySettings({
          theme: preferences.mode === 'auto' ? 'system' : preferences.mode,
          compactMode: controls.compactMode,
          showAnimations: preferences.animationsEnabled,
          highContrast: preferences.highContrast,
          oledDark: preferences.oledDark,
        });
      }

      setOriginalControls(controls);
      setStatusMessage('Display preferences saved');
    } catch {
      setStatusMessage('Saved locally. Remote sync is currently unavailable.');
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-app">Display Settings</h2>
        <p className="text-sm text-muted">
          Theme updates apply immediately and are persisted automatically.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-app">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-app bg-surface p-5">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-accent" />
          <h3 className="text-base font-semibold text-app">Theme</h3>
        </div>
        <ThemeToggle showAdvanced />
        <p className="text-xs text-muted">
          System preference is used when mode is set to Auto. Sync status:{' '}
          <span className={isSynced ? 'text-emerald-500' : 'text-amber-500'}>
            {isSynced ? 'connected' : 'local only'}
          </span>
          .
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-app bg-surface p-5">
        <h3 className="text-base font-semibold text-app">Layout</h3>
        <ToggleRow
          icon={Monitor}
          title="Compact Layout"
          description="Reduce spacing across selected dashboard sections."
          value={controls.compactMode}
          onChange={(next) => setControls((prev) => ({ ...prev, compactMode: next }))}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-app bg-surface p-5">
        <h3 className="text-base font-semibold text-app">Gamification Audio</h3>
        <ToggleRow
          icon={controls.comboSoundEnabled ? Volume2 : VolumeX}
          title="Combo Sound Effects"
          description="Play short audio cues during active tip combos."
          value={controls.comboSoundEnabled}
          onChange={(next) =>
            setControls((prev) => ({ ...prev, comboSoundEnabled: next }))
          }
        />
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
            hasChanges
              ? 'bg-primary-blue text-white hover:bg-secondary-indigo'
              : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Controls
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DisplaySettings;
