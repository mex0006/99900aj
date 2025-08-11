
const CACHE = 'ajanda-cache-v10-2-7';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll([
    './','./index.html','./css/main.css','./js/app.js',
    './manifest.webmanifest',
    './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
  ])));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request)));
  }
});
