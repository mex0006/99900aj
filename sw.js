const CACHE_NAME='ajanda-v9-4-full';
const ASSETS=[
  './',
  './index.html',
  './css/main.css?v=9.4',
  './js/app.js?v=9.4',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install',e=>{e.waitUntil(
  caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))
)});
self.addEventListener('activate',e=>{e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));
});
