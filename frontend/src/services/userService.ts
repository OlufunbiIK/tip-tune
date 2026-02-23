import apiClient from '../utils/api';
import { User } from '../types';

export interface UpdateProfileData {
  username?: string;
  email?: string;
  bio?: string;
  profileImage?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  tipNotifications: boolean;
  followNotifications: boolean;
  commentNotifications: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'followers';
  showTipHistory: boolean;
  showPlayHistory: boolean;
  allowMessages: boolean;
}

export interface DisplaySettings {
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  showAnimations: boolean;
}

export interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
}

export const userService = {
  searchByWallet: async (wallet: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/search?wallet=${wallet}`);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  updateProfile: async (userId: string, data: UpdateProfileData): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${userId}`, data);
    return response.data;
  },

  uploadProfileImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>('/users/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get<UserSettings>('/users/settings');
    return response.data;
  },

  updateNotificationSettings: async (settings: NotificationSettings): Promise<NotificationSettings> => {
    const response = await apiClient.patch<NotificationSettings>('/users/settings/notifications', settings);
    return response.data;
  },

  updatePrivacySettings: async (settings: PrivacySettings): Promise<PrivacySettings> => {
    const response = await apiClient.patch<PrivacySettings>('/users/settings/privacy', settings);
    return response.data;
  },

  updateDisplaySettings: async (settings: DisplaySettings): Promise<DisplaySettings> => {
    const response = await apiClient.patch<DisplaySettings>('/users/settings/display', settings);
    return response.data;
  },

  exportUserData: async (): Promise<Blob> => {
    const response = await apiClient.get('/users/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/users/me');
  },
};
