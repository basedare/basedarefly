self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
  const options = {
    body: payload.body || 'A new BaseDare alert is waiting for you.',
    icon: '/assets/basedare-logo.png',
    badge: '/assets/basedaresolid.png',
    tag: payload.tag || 'basedare-signal',
    renotify: true,
    data: {
      url: payload.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'map', title: 'Map' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.action === 'map' ? '/map' : event.notification.data?.url || '/dashboard';
  const url = typeof rawUrl === 'string' && rawUrl.startsWith('/') && !rawUrl.startsWith('//')
    ? rawUrl
    : '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(url);
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
