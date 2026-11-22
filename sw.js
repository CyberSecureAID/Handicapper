/* ============================================================================
   Service worker de Sports Expectations.
   index.html ya registra 'sw.js'; antes este archivo NO existia y daba un 404
   en cada carga, ademas de impedir la instalacion PWA en Android (que exige un
   SW con handler de fetch).

   Estrategia: NETWORK FIRST. Con conexion siempre se sirve la version fresca de
   la red (nada de contenido viejo). La cache solo se usa cuando NO hay conexion,
   como respaldo offline. Las APIs y CDNs externas van directo a la red.
   Para forzar una limpieza de cache en el futuro, sube el numero de CACHE.
   ============================================================================ */
const CACHE = 'se-shell-v1';
const SHELL = ['index.html', 'manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // APIs/CDN externas: directo a la red

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      if (req.mode === 'navigate') {
        const c = await caches.open(CACHE);
        c.put(req, net.clone()).catch(() => {});
      }
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = await caches.match('index.html');
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
