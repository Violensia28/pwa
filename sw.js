// TechPartner PWA Service Worker (Project Pages safe)
// Offline-first app shell caching.

const CACHE_NAME = 'techpartner-shell-v1.3';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/app.js',
  './assets/state.js',
  './assets/db.js',
  './assets/ui.js',
  './assets/pm.js',
  './assets/wo.js',
  './assets/qr.js',
  './assets/media.js',
  './assets/reports.js',
  './assets/qrscan.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Runtime cache for CDN libs (best effort)
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.sheetjs.com')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => cached))
    );
  }
});
