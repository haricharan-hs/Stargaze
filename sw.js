const CACHE_NAME = 'dark-sky-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/Stargaze/',
  '/Stargaze/index.html',
  '/Stargaze/manifest.json',
  '/Stargaze/icon-192.png',
  '/Stargaze/icon-512.png',
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache when offline, network when online
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For API calls (Open-Meteo), always try network first
  // If offline, return a friendly error response
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({
          error: true,
          message: 'You are offline. Connect to the internet to get live forecasts.'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // For everything else: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
