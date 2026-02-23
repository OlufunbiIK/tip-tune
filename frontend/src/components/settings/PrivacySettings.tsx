import { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  Globe,
  Users,
  MessageSquare,
  History,
  Save,
  Loader2,
  Check,
  X,
  Info,
} from 'lucide-react';
import { userService, PrivacySettings as PrivacySettingsType } from '../../services/userService';
import { useWallet } from '../../hooks/useWallet';

type ProfileVisibility = 'public' | 'private' | 'followers';

interface RadioOptionProps {
  value: ProfileVisibility;
  currentValue: ProfileVisibility;
  onChange: (value: ProfileVisibility) => void;
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
}

const RadioOption = ({
  value,
  currentValue,
  onChange,
  icon: Icon,
  title,
  description,
  disabled,
}: RadioOptionProps) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(value)}
    disabled={disabled}
    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
      currentValue === value
        ? 'border-primary-blue bg-primary-blue/10'
        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          currentValue === value ? 'bg-primary-blue/20' : 'bg-gray-100'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            currentValue === value ? 'text-primary-blue' : 'text-gray-400'
          }`}
        />
      </div>
      <div className="flex-1">
        <h4
          className={`font-medium ${
            currentValue === value ? 'text-deep-slate' : 'text-gray-600'
          }`}
        >
          {title}
        </h4>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          currentValue === value
            ? 'border-primary-blue bg-primary-blue'
            : 'border-gray-300'
        }`}
      >
        {currentValue === value && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </div>
    </div>
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

interface PrivacyItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const PrivacyItem = ({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
  disabled,
}: PrivacyItemProps) => (
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

const PrivacySettings = () => {
  const { isConnected } = useWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PrivacySettingsType>({
    profileVisibility: 'public',
    showTipHistory: true,
    showPlayHistory: true,
    allowMessages: true,
  });

  const [originalSettings, setOriginalSettings] = useState<PrivacySettingsType>({
    profileVisibility: 'public',
    showTipHistory: true,
    showPlayHistory: true,
    allowMessages: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!isConnected) {
        setIsLoading(false);
        return;
      }

      try {
        const userSettings = await userService.getSettings();
        setSettings(userSettings.privacy);
        setOriginalSettings(userSettings.privacy);
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
        // Use defaults if settings don't exist yet
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isConnected]);

  const handleVisibilityChange = (visibility: ProfileVisibility) => {
    setSettings((prev) => ({ ...prev, profileVisibility: visibility }));
  };

  const handleToggleChange = (key: keyof PrivacySettingsType, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await userService.updatePrivacySettings(settings);
      setOriginalSettings(settings);
      setSuccessMessage('Privacy settings saved');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
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

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please connect your wallet to manage privacy settings</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-2">Privacy Settings</h2>
      <p className="text-gray-500 mb-6">
        Control who can see your profile and activity
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

      {/* Profile Visibility */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Profile Visibility</h3>
        <div className="space-y-3">
          <RadioOption
            value="public"
            currentValue={settings.profileVisibility}
            onChange={handleVisibilityChange}
            icon={Globe}
            title="Public"
            description="Anyone can view your profile and activity"
          />
          <RadioOption
            value="followers"
            currentValue={settings.profileVisibility}
            onChange={handleVisibilityChange}
            icon={Users}
            title="Followers Only"
            description="Only people who follow you can see your profile"
          />
          <RadioOption
            value="private"
            currentValue={settings.profileVisibility}
            onChange={handleVisibilityChange}
            icon={Lock}
            title="Private"
            description="Your profile is hidden from everyone"
          />
        </div>
      </div>

      {/* Activity Privacy */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Activity Privacy</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-6">
          <PrivacyItem
            icon={History}
            title="Show Tip History"
            description="Allow others to see tips you've sent"
            enabled={settings.showTipHistory}
            onChange={(value) => handleToggleChange('showTipHistory', value)}
          />
          <PrivacyItem
            icon={Eye}
            title="Show Play History"
            description="Allow others to see tracks you've listened to"
            enabled={settings.showPlayHistory}
            onChange={(value) => handleToggleChange('showPlayHistory', value)}
          />
          <PrivacyItem
            icon={MessageSquare}
            title="Allow Messages"
            description="Let other users send you direct messages"
            enabled={settings.allowMessages}
            onChange={(value) => handleToggleChange('allowMessages', value)}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-blue-700 text-sm">
            Your wallet address is always public on the blockchain. These settings control what information is visible on your TipTune profile.
          </p>
        </div>
      </div>

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

export default PrivacySettings;
