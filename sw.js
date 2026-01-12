// TechPartner PWA Service Worker (Project Pages safe)
// Offline-first app shell caching.

const CACHE_NAME = 'techpartner-shell-v1';
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
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          // Optionally cache runtime assets
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          return resp;
        }).catch(() => cached);
      })
    );
  }
});
