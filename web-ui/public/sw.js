const CACHE_NAME = 'goddessclaw-v2';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/claw-icon.svg',
];

// Install — cache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  e.waitUntil(self.clients.claim());
});

// Fetch — network-first for API/WS, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache WebSocket, API calls, or HMR
  if (
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('__vite') ||
    url.pathname.includes('@react-refresh') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // For navigation requests (HTML), always go network-first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Assets: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      });
      return cached || fetched;
    })
  );
});
