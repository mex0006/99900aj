// Simple PWA SW — Ajanda v10.2.1
const CACHE_VERSION = 'v10.2.1';
const CORE = [
  './',
  './index.html?v=10.2.1',
  './css/main.css?v=10.2.1',
  './js/app.js?v=10.2.1',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest?v=10.2.1'
];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_VERSION?null:caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  const url = new URL(req.url);
  // HTML -> network first
  if(req.mode==='navigate' || (req.headers.get('accept')||'').includes('text/html')){
    e.respondWith(
      fetch(req).then(r=>{
        const copy = r.clone();
        caches.open(CACHE_VERSION).then(c=>c.put(req, copy));
        return r;
      }).catch(()=>caches.match(req))
    );
    return;
  }
  // others -> stale while revalidate
  e.respondWith(
    caches.match(req).then(cached=>{
      const fresher = fetch(req).then(r=>{
        caches.open(CACHE_VERSION).then(c=>c.put(req, r.clone()));
        return r;
      }).catch(()=>cached);
      return cached || fresher;
    })
  );
});
