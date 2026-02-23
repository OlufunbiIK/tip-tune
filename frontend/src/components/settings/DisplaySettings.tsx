import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Minimize2,
  Sparkles,
  Save,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { userService, DisplaySettings as DisplaySettingsType } from '../../services/userService';
import { useWallet } from '../../hooks/useWallet';

type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'tiptune_display_settings';

interface ThemeOptionProps {
  value: Theme;
  currentValue: Theme;
  onChange: (value: Theme) => void;
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
}

const ThemeOption = ({
  value,
  currentValue,
  onChange,
  icon: Icon,
  title,
  description,
  disabled,
}: ThemeOptionProps) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(value)}
    disabled={disabled}
    className={`flex-1 p-4 rounded-lg border-2 text-center transition-all ${
      currentValue === value
        ? 'border-primary-blue bg-primary-blue/10'
        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
        currentValue === value ? 'bg-primary-blue/20' : 'bg-gray-100'
      }`}
    >
      <Icon
        className={`w-6 h-6 ${
          currentValue === value ? 'text-primary-blue' : 'text-gray-400'
        }`}
      />
    </div>
    <h4
      className={`font-medium mb-1 ${
        currentValue === value ? 'text-deep-slate' : 'text-gray-600'
      }`}
    >
      {title}
    </h4>
    <p className="text-gray-400 text-sm">{description}</p>
  </button>
);

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch = ({ enabled, onChange, disabled }: ToggleSwitchProps) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
      enabled ? 'bg-primary-blue' : 'bg-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute left-0 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
);

interface DisplayItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const DisplayItem = ({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
  disabled,
}: DisplayItemProps) => (
  <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <h4 className="text-deep-slate font-medium">{title}</h4>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

// Load settings from localStorage
const loadFromStorage = (): DisplaySettingsType => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load display settings from storage:', e);
  }
  return { theme: 'light', compactMode: false, showAnimations: true };
};

// Save settings to localStorage
const saveToStorage = (settings: DisplaySettingsType) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save display settings to storage:', e);
  }
};

const DisplaySettings = () => {
  const { isConnected } = useWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<DisplaySettingsType>({
    theme: 'light',
    compactMode: false,
    showAnimations: true,
  });

  const [originalSettings, setOriginalSettings] = useState<DisplaySettingsType>({
    theme: 'light',
    compactMode: false,
    showAnimations: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      // First load from localStorage (works for everyone)
      const localSettings = loadFromStorage();
      setSettings(localSettings);
      setOriginalSettings(localSettings);
      applyTheme(localSettings.theme);

      // If connected, try to load from server (synced settings)
      if (isConnected) {
        try {
          const userSettings = await userService.getSettings();
          setSettings(userSettings.display);
          setOriginalSettings(userSettings.display);
          applyTheme(userSettings.display.theme);
        } catch (error) {
          console.error('Failed to load display settings from server:', error);
          // Use local settings if server fails
        }
      }

      setIsLoading(false);
    };

    loadSettings();
  }, [isConnected]);

  const handleThemeChange = (theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme }));
    // Apply theme immediately for preview
    applyTheme(theme);
  };

  const handleToggleChange = (key: keyof DisplaySettingsType, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      // Always save to localStorage
      saveToStorage(settings);

      // If connected, also save to server
      if (isConnected) {
        await userService.updateDisplaySettings(settings);
      }

      setOriginalSettings(settings);
      applyTheme(settings.theme);
      setSuccessMessage('Display settings saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-blue animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-2">Display Settings</h2>
      <p className="text-gray-500 mb-6">
        Customize how TipTune looks and feels
      </p>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <X className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}

      {/* Theme Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Theme</h3>
        <div className="flex gap-4">
          <ThemeOption
            value="dark"
            currentValue={settings.theme}
            onChange={handleThemeChange}
            icon={Moon}
            title="Dark"
            description="Easy on the eyes"
          />
          <ThemeOption
            value="light"
            currentValue={settings.theme}
            onChange={handleThemeChange}
            icon={Sun}
            title="Light"
            description="Bright and clean"
          />
          <ThemeOption
            value="system"
            currentValue={settings.theme}
            onChange={handleThemeChange}
            icon={Monitor}
            title="System"
            description="Match your device"
          />
        </div>
      </div>

      {/* Display Options */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Options</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-6">
          <DisplayItem
            icon={Minimize2}
            title="Compact Mode"
            description="Use smaller spacing and font sizes"
            enabled={settings.compactMode}
            onChange={(value) => handleToggleChange('compactMode', value)}
          />
          <DisplayItem
            icon={Sparkles}
            title="Animations"
            description="Enable smooth animations and transitions"
            enabled={settings.showAnimations}
            onChange={(value) => handleToggleChange('showAnimations', value)}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Preview</h3>
        <div className={`p-6 rounded-xl border border-gray-200 ${
          settings.theme === 'dark' ? 'bg-gray-900' : settings.theme === 'light' ? 'bg-white' : 'bg-gray-100'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full ${
              settings.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`} />
            <div>
              <div className={`h-4 w-24 rounded ${
                settings.theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
              }`} />
              <div className={`h-3 w-32 rounded mt-2 ${
                settings.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`} />
            </div>
          </div>
          <div className={`h-20 w-full rounded-lg ${
            settings.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`} />
        </div>
      </div>

      {!isConnected && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            Settings are saved locally. Connect your wallet to sync settings across devices.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-primary-blue hover:bg-secondary-indigo text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DisplaySettings;
