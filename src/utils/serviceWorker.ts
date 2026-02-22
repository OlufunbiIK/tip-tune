/* Utilities for registering service worker and subscribing to Push.
   Keeps runtime lightweight; server endpoints are placeholders and must be
   implemented to accept push subscriptions.
*/
/* eslint-disable no-console */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  const permission = await Notification.requestPermission();
  return permission; // 'granted' | 'denied' | 'default'
}

export async function subscribeToPush(registration?: ServiceWorkerRegistration) {
  if (!registration) registration = await navigator.serviceWorker.ready;
  if (!('PushManager' in window) || !registration) return null;
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    // Send subscription to server so it can send push messages
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(subscription)
      });
    } catch (e) {
      console.warn('Failed to send subscription to server', e);
    }
    return subscription;
  } catch (err) {
    console.warn('Push subscription failed', err);
    return null;
  }
}

export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) {
    await r.unregister();
  }
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  requestNotificationPermission,
  subscribeToPush
};
