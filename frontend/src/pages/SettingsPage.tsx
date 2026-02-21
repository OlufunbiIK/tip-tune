import { useState } from 'react';
import {
  User,
  Wallet,
  Bell,
  Lock,
  Sun,
  Trash2,
  Settings,
} from 'lucide-react';
import ProfileSettings from '../components/settings/ProfileSettings';
import { WalletSettings } from '@/components/settings';
import {NotificationSettings} from '@/components/settings';
import {PrivacySettings} from '@/components/settings';
import {DisplaySettings} from '@/components/settings';
import {AccountActions} from '@/components/settings';

type SettingsTab =
  | 'profile'
  | 'wallet'
  | 'notifications'
  | 'privacy'
  | 'display'
  | 'account';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: TabItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Update your personal information',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: Wallet,
    description: 'Manage your connected wallet',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure notification preferences',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Lock,
    description: 'Control your privacy settings',
  },
  {
    id: 'display',
    label: 'Display',
    icon: Sun,
    description: 'Customize appearance settings',
  },
  {
    id: 'account',
    label: 'Account',
    icon: Trash2,
    description: 'Account actions and data',
  },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'wallet':
        return <WalletSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'display':
        return <DisplaySettings />;
      case 'account':
        return <AccountActions />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary-blue" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-blue text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-deep-slate'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <span className="font-medium">{tab.label}</span>
                      {isActive && (
                        <p className="text-xs text-blue-200 mt-0.5">
                          {tab.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
