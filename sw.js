/* Service worker: instalación PWA, caché de estáticos propios, y notificaciones
   (clic, push para VAPID futuro, y mostrar notificación pedida por la página).
   Compatible con PWA en móvil, app de escritorio y navegador. */
const CACHE = 'se-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

/* --- Caché: solo GET del mismo origen (estáticos). Lo demás pasa directo. --- */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  let mismoOrigen = false;
  try { mismoOrigen = new URL(req.url).origin === self.location.origin; } catch (_) {}
  if (req.method !== 'GET' || !mismoOrigen) return;
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(req))
  );
});

/* --- Opciones por defecto de notificación (vibración, icono, badge) --- */
function _opts(d) {
  return {
    body: d.body || '',
    icon: d.icon || 'assets/imagenes/apple-touch-icon.png',
    badge: d.badge || 'assets/imagenes/favicon-32.png',
    vibrate: d.vibrate || [200, 100, 200],
    tag: d.tag || 'se-senal',
    renotify: true,
    silent: false,
    data: { url: d.url || './' },
  };
}

/* --- Push del servidor (para cuando exista backend VAPID). Hoy no se usa, pero deja listo el terreno. --- */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text ? e.data.text() : '' }; }
  const titulo = d.title || 'Sports Expectations';
  e.waitUntil(self.registration.showNotification(titulo, _opts(d)));
});

/* --- Clic en la notificación: enfoca la app si está abierta, o la abre. --- */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const c of lista) { if ('focus' in c) { c.navigate && c.navigate(url); return c.focus(); } }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

/* --- La página pide mostrar una notificación (funciona en móvil PWA y escritorio). --- */
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'mostrar-noti') {
    self.registration.showNotification(m.titulo || 'Sports Expectations', _opts(m.opts || {}));
  }
});
