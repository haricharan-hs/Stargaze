const CACHE_NAME = 'dark-sky-v2';

const STATIC_ASSETS = [
  '/Stargaze/',
  '/Stargaze/index.html',
  '/Stargaze/manifest.json',
  '/Stargaze/icon-192.png',
  '/Stargaze/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      // Cache individually so one failure doesn't break all
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — network first, offline fallback
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('doc.govt.nz')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({
          error: true,
          message: 'You are offline. Connect to fetch live data.'
        }), { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
