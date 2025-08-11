// sw.js
const CACHE = 'ajanda-v10-2-4h';
const ASSETS = [
  './','./index.html','./main.css','./app.js','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png'
];


self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try{
      const res = await fetch(e.request);
      const copy = res.clone();
      const c = await caches.open(CACHE);
      c.put(e.request, copy);
      return res;
    }catch(_){
      return cached || Response.error();
    }
  })());
});
