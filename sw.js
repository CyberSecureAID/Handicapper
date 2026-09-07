/* Service worker mínimo: habilita la instalación PWA y cachea SOLO estáticos propios.
   No intercepta POST ni llamadas a APIs externas (ESPN, NHL, Firestore) para no
   ensuciar la consola ni interferir con esas peticiones. */
const CACHE = 'se-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  let mismoOrigen = false;
  try { mismoOrigen = new URL(req.url).origin === self.location.origin; } catch (_) {}
  if (req.method !== 'GET' || !mismoOrigen) return;   // POST y APIs externas pasan directo
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req))
  );
});
