const CACHE='codequest-v53';
const APP=['/cloud/cloud-sync.js','/pets/pixel.png','/pets/byte.png','/pets/flama.png','/pets/nube.png','/pets/rayo.png','/pets/luna.png','/','/app.css','/learning.css','/account.css','/install.css','/app.js','/app.js?v=53','/app.css?v=53','/learning.css?v=53','/account.css?v=53','/install.css?v=53','/manifest.webmanifest','/icon.svg','/icon-96.png','/icon-180.png','/icon-192.png','/icon-512.png','/favicon.ico'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/'))));
});
