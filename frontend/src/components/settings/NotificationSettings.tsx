import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  DollarSign,
  Users,
  Save,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { userService, NotificationSettings as NotificationSettingsType } from '../../services/userService';
import { useWallet } from '../../hooks/useWallet';

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

interface NotificationItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const NotificationItem = ({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
  disabled,
}: NotificationItemProps) => (
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

const NotificationSettings = () => {
  const { isConnected } = useWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<NotificationSettingsType>({
    emailNotifications: true,
    pushNotifications: true,
    tipNotifications: true,
    followNotifications: true,
    commentNotifications: true,
  });

  const [originalSettings, setOriginalSettings] = useState<NotificationSettingsType>({
    emailNotifications: true,
    pushNotifications: true,
    tipNotifications: true,
    followNotifications: true,
    commentNotifications: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!isConnected) {
        setIsLoading(false);
        return;
      }

      try {
        const userSettings = await userService.getSettings();
        setSettings(userSettings.notifications);
        setOriginalSettings(userSettings.notifications);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        // Use defaults if settings don't exist yet
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isConnected]);

  const handleSettingChange = (key: keyof NotificationSettingsType, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await userService.updateNotificationSettings(settings);
      setOriginalSettings(settings);
      setSuccessMessage('Notification preferences saved');
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
        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please connect your wallet to manage notification settings</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-2">Notification Settings</h2>
      <p className="text-gray-500 mb-6">
        Choose what notifications you'd like to receive
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

      {/* General Notifications */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">General</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-6">
          <NotificationItem
            icon={Mail}
            title="Email Notifications"
            description="Receive email notifications for important updates"
            enabled={settings.emailNotifications}
            onChange={(value) => handleSettingChange('emailNotifications', value)}
          />
          <NotificationItem
            icon={Bell}
            title="Push Notifications"
            description="Receive push notifications in your browser"
            enabled={settings.pushNotifications}
            onChange={(value) => handleSettingChange('pushNotifications', value)}
          />
        </div>
      </div>

      {/* Activity Notifications */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-deep-slate mb-4">Activity</h3>
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-6">
          <NotificationItem
            icon={DollarSign}
            title="Tips"
            description="Get notified when someone tips your content"
            enabled={settings.tipNotifications}
            onChange={(value) => handleSettingChange('tipNotifications', value)}
          />
          <NotificationItem
            icon={Users}
            title="New Followers"
            description="Get notified when someone follows you"
            enabled={settings.followNotifications}
            onChange={(value) => handleSettingChange('followNotifications', value)}
          />
          <NotificationItem
            icon={MessageSquare}
            title="Comments"
            description="Get notified when someone comments on your tracks"
            enabled={settings.commentNotifications}
            onChange={(value) => handleSettingChange('commentNotifications', value)}
          />
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

export default NotificationSettings;
