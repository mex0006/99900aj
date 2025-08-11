
const CACHE = 'ajanda-v11';
const CORE = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=> k===CACHE?null:caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }else{
    // runtime cache for tiles
    e.respondWith(caches.open('tiles').then(async c=>{
      const r = await c.match(e.request);
      if(r) return r;
      const f = await fetch(e.request);
      c.put(e.request, f.clone());
      return f;
    }));
  }
});
