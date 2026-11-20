// SMARAN (स्मरण) Service Worker
// Operational Reliability & Privacy Architecture
// STRICT SAFEGUARD: Never caches private user chanting records, auth tokens, or API requests.

const CACHE_NAME = 'smaran-static-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/media/nav-drsti.jpg',
  '/media/nav-gita.jpg',
  '/media/nav-japa.jpg',
  '/media/nav-lakshya.jpg',
  '/media/nav-satsang.jpg',
  '/media/vrindavan-login-bg.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_PRECACHE_URLS).catch(() => {
          // Continue if any individual asset fails
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. PRIVACY BOUNDARY: Never cache mutations
  if (req.method !== 'GET') {
    return;
  }

  // 2. PRIVACY BOUNDARY: Never cache authenticated APIs, auth callbacks, or Supabase endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase.co')
  ) {
    return; // Pass through to network, never store in CacheStorage
  }

  // 3. Navigation requests: Network-first with cached shell fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          return caches.match('/');
        });
      })
    );
    return;
  }

  // 4. Static assets (CSS, JS, fonts, public media): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/media/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

