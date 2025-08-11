
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open('ajanda-v10-2-3').then(c => c.addAll([
    './','./index.html','./css/main.css','./js/app.js','./manifest.webmanifest',
    './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
  ])));
});
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open('ajanda-v10-2-3').then(c => c.put(e.request, copy));
      return r;
    }).catch(()=>res))
  );
});
