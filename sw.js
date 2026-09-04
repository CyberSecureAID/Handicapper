/* Service worker mínimo: habilita la instalación PWA. */
const CACHE = 'se-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  // Estrategia network-first sencilla; si la red falla, intenta la caché.
  e.respondWith(
    fetch(e.request).then(r => {
      try { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } catch (_) {}
      return r;
    }).catch(() => caches.match(e.request))
  );
});
