import { useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import apiClient from '../utils/api';
import { useWallet } from './useWallet';
import { enqueueTipToast, type ToastPriority } from '../contexts/tipToastQueue';

export interface Notification {
  id: string;
  type: 'TIP_RECEIVED' | 'SYSTEM';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const { publicKey } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const inferTipPriority = (notification: Notification): ToastPriority => {
    const rawAmount =
      typeof notification.data?.amount === 'number'
        ? notification.data.amount
        : typeof notification.data?.tipAmount === 'number'
          ? notification.data.tipAmount
          : 0;

    return rawAmount >= 25 ? 'high' : 'normal';
  };

  const enqueueTipToastFromNotification = useCallback((notification: Notification) => {
    enqueueTipToast({
      id: notification.id,
      tipId: notification.id,
      title: notification.title,
      message: notification.message,
      priority: inferTipPriority(notification),
      createdAt: notification.createdAt,
      duration: 5000,
    });
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data.data);
      seenNotificationIdsRef.current = new Set(
        (response.data.data as Notification[])
          .map((notification) => notification.id)
          .filter((id): id is string => Boolean(id)),
      );
      
      const countResponse = await apiClient.get('/notifications/unread-count');
      setUnreadCount(countResponse.data.count);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    // Use /notifications namespace
    const socketUrl = `${apiUrl.replace('/api', '')}/notifications`;

    if (!token) return;

    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to notification server');
    });

    socketRef.current.on('tipReceived', (notification: Notification) => {
      if (seenNotificationIdsRef.current.has(notification.id)) {
        return;
      }

      seenNotificationIdsRef.current.add(notification.id);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      enqueueTipToastFromNotification(notification);
      
      // Optional: Play sound
      // const audio = new Audio('/notification.mp3');
      // audio.play().catch(e => console.log('Audio play failed', e));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [enqueueTipToastFromNotification]);

  // Initial fetch
  useEffect(() => {
    if (publicKey) {
      fetchNotifications();
    }
  }, [publicKey, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
};
