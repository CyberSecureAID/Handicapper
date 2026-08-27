/* ============================================================
   FOTOS-WIKI — segundo proveedor de fotos: Wikipedia (Wikimedia).
   GRATIS, sin clave, sin límite práctico y con CORS habilitado
   (origin=*). Una sola llamada por equipo (batch de hasta 50 nombres).
   Cubre jugadores famosos que ESPN no tiene fichados.
   Las fotos traen fondo, así que se usan como respaldo (avatares),
   nunca reemplazan el recorte transparente de ESPN cuando existe.
   ============================================================ */

const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function api(lang, titles) {
  const t = encodeURIComponent(titles.join('|'));
  return `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=300&titles=${t}`;
}

async function consultar(lang, nombres) {
  const mapa = {};
  try {
    const r = await fetch(api(lang, nombres.slice(0, 50)));
    if (!r.ok) return mapa;
    const d = await r.json();
    // 'normalized' y 'redirects' mapean el título pedido -> título real
    const alias = {};
    (d?.query?.normalized || []).forEach(n => { alias[norm(n.to)] = norm(n.from); });
    (d?.query?.redirects || []).forEach(n => { alias[norm(n.to)] = alias[norm(n.from)] || norm(n.from); });
    const pages = d?.query?.pages || {};
    Object.values(pages).forEach(p => {
      const src = p?.thumbnail?.source;
      if (!src) return;
      const kReal = norm(p.title);
      mapa[kReal] = src;
      if (alias[kReal]) mapa[alias[kReal]] = src;   // también bajo el nombre pedido
    });
  } catch (_) {}
  return mapa;
}

/* Devuelve Map(nombreNormalizado -> urlFoto) para una lista de nombres.
   Intenta inglés (más cobertura) y completa con español. */
export async function fotosWikipedia(nombres) {
  const limpios = [...new Set((nombres || []).filter(Boolean))];
  if (!limpios.length) return {};
  const en = await consultar('en', limpios);
  // Los que no aparecieron, se intentan en español
  const faltan = limpios.filter(n => !en[norm(n)]);
  let es = {};
  if (faltan.length) es = await consultar('es', faltan);
  return { ...es, ...en };
}
