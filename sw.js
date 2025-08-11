// Simple service worker for Ajanda v10
const CACHE = 'ajanda-v10-cache';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/ios-180.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE?null:caches.delete(k))))
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
