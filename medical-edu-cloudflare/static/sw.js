// ============================================================
// Service Worker — PWA support
// - cache-first for static assets
// - network-first for everything else (with offline fallback)
// ============================================================

const CACHE_VERSION = 'med-edu-v1';
const STATIC_ASSETS = [
  '/static/app.css',
  '/static/app.js',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/offline.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // Skip API requests (always go to network)
  if (url.pathname.startsWith('/api/')) return;

  // Skip cross-origin (CDN)
  if (url.origin !== self.location.origin) {
    // استفاده از stale-while-revalidate برای CDNها
    e.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets: cache-first
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && res.headers.get('Content-Type')?.includes('text/html')) {
        const clone = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then(c => c || caches.match('/static/offline.html')))
  );
});
