self.addEventListener('install', () => {
  // Let the new worker wait until open tabs naturally reload or navigate.
  // Forcing skipWaiting here made fresh deploys feel like the homepage reloaded twice.
});

self.addEventListener('activate', (event) => {
  const clearOldCaches = typeof caches === 'undefined'
    ? Promise.resolve()
    : caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));

  event.waitUntil(clearOldCaches);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack') ||
    url.pathname.includes('walletconnect') ||
    url.pathname.includes('onchainkit')
  ) {
    return;
  }

  // Network-only by design: wallet sessions, live rails, and campaign state must not go stale.
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'BaseDare';
  const notificationId = payload.id || `push-${Date.now()}`;
  const options = {
    body: payload.body || 'A new BaseDare alert is waiting for you.',
    icon: '/assets/basedare-icon-192.png',
    badge: '/assets/basedaresolid.png',
    tag: payload.tag || `basedare-${payload.topic || 'signal'}-${notificationId}`,
    renotify: true,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    data: {
      url: payload.url || '/dashboard',
      id: notificationId,
      topic: payload.topic || 'wallet',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'map', title: 'Map' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function normalizeClientUrl(rawUrl) {
  try {
    const target = new URL(rawUrl || '/dashboard', self.location.origin);
    if (target.origin !== self.location.origin) {
      return '/dashboard';
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/dashboard';
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.action === 'map' ? '/map' : event.notification.data?.url || '/dashboard';
  const url = normalizeClientUrl(rawUrl);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          if ('navigate' in client) {
            return client
              .navigate(url)
              .then((navigatedClient) => (navigatedClient || client).focus())
              .catch(() => client.focus());
          }

          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    })
  );
});
