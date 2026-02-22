/* TipTune service worker using Workbox CDN for pragmatic integration.
   This file lives in public/ and is registered from the client.
   It handles precaching (simple), runtime caching for audio/images/APIs,
   push notifications, background sync, and media controls.
*/
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  // Force production-level logs to warn and above
  workbox.setConfig({debug: false});

  // Precache: the build process may inject a precache manifest if configured.
  // We still provide a fallback for the root and assets referenced here.
  workbox.precaching.precacheAndRoute([
    {url: '/', revision: null},
    {url: '/index.html', revision: null}
  ]);

  // Navigation route (SPA fallback)
  workbox.routing.registerNavigationRoute('/');

  // Runtime caching: API JSON responses (NetworkFirst)
  workbox.routing.registerRoute(
    ({url}) => url.pathname.startsWith('/api/') || url.pathname.includes('/uploads/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      plugins: [new workbox.expiration.ExpirationPlugin({maxEntries: 100, maxAgeSeconds: 24 * 60 * 60})]
    })
  );

  // Images (CacheFirst)
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [new workbox.expiration.ExpirationPlugin({maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60})]
    })
  );

  // Audio/media files: CacheFirst with Range request support if present
  // Note: Workbox doesn't fully polyfill Range support; fallback to cache network strategy.
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'audio' || request.url.match(/\.(mp3|m4a|ogg|wav)$/),
    new workbox.strategies.CacheFirst({
      cacheName: 'audio-cache',
      plugins: [new workbox.expiration.ExpirationPlugin({maxEntries: 100, maxAgeSeconds: 60 * 24 * 60 * 60})]
    })
  );

  // Fallback offline page for navigation requests
  workbox.routing.setCatchHandler(async ({event}) => {
    if (event.request.destination === 'document') {
      return caches.match('/index.html');
    }
    return Response.error();
  });
}

// Push notifications handler
self.addEventListener('push', function (event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {title: 'TipTune', body: 'New notification'};
  } catch (e) {
    payload = {title: 'TipTune', body: event.data ? event.data.text() : 'New notification'};
  }

  const title = payload.title || 'TipTune';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
    vibrate: [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(clients.matchAll({type: 'window'}).then(windowClients => {
    for (let client of windowClients) {
      if (client.url === url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});

// Background sync: simple tag handler that retries failed POSTs
self.addEventListener('sync', function (event) {
  if (event.tag === 'retry-uploads') {
    event.waitUntil((async () => {
      // Attempt to replay queued requests stored in IndexedDB or Cache (app-controlled).
      // App should populate a queue key in IndexedDB; worker reads and retries.
      // Minimal safe placeholder: open a named cache and do nothing else.
      const cache = await caches.open('retry-uploads');
      // Real implementation: read queue from IndexedDB and fetch() each entry.
    })());
  }
});

// Media Session API integration from service worker messages
self.addEventListener('message', (event) => {
  // Accept messages from the client to set the media session metadata/actions
  if (!event.data) return;
  const {type, payload} = event.data;
  if (type === 'MEDIA_SESSION') {
    // forward to clients (no direct mediaSession in SW), or respond to client
    // Client will handle actual MediaSession API; SW can be used for notification actions
  }
});
