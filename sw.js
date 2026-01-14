const CACHE='tp65-full-1';
const SHELL=['./','./index.html','./manifest.json','./assets/app.js','./assets/db.js','./assets/state.js','./icons/icon-192.png','./icons/icon-512.png','./data/db_partner.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const url=new URL(e.request.url);if(url.origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));}});
