/* ============================================================
   RED — capa de red compartida para TODA la data de terceros.
   ------------------------------------------------------------
   Un solo lugar con: timeout real (AbortController), respaldo de
   proxies CORS y reintento. Antes cada motor por deporte pedia los
   datos a su manera: solo NHL tenia respaldo de proxy, y por eso era
   el unico que no se caia. Aqui se unifica esa robustez para todos
   (NBA, NFL, soccer, MLB), que es la causa raiz de los servicios vacios.

   Fuente del problema: ESPN/MLB SI devuelven los datos, pero un fetch
   DIRECTO desde el navegador falla por CORS/region/rate-limit. La vuelta
   es pasar por un proxy que agregue CORS. Lo ideal es un Worker PROPIO
   (gratis, fiable); mientras no este, se usan proxies publicos como
   respaldo (igual que hacia NHL).

   Para activar tu Worker propio: despliega worker/sports-proxy.js en
   Cloudflare y pon su URL en WORKER (abajo). Pasa a ser el primer intento.
   ============================================================ */

/* URL de tu Worker de Cloudflare, con el parametro de la URL al final.
   Vacio = usa solo directo + proxies publicos (funciona, menos fiable).
   Ej: 'https://sports-proxy.TUCUENTA.workers.dev/?url=' */
export const WORKER = '';

/* Proxies publicos de respaldo (los mismos que ya usaba NHL y funcionaban). */
const PROXIES_PUB = ['https://corsproxy.io/?url=', 'https://api.allorigins.win/raw?url='];

const TIMEOUT_MS = 8000;

/* Orden de intento: Worker propio (si existe) -> directo -> proxies publicos. */
function _rutas() {
  const r = [];
  if (WORKER) r.push(WORKER);
  r.push('');                 // directo (sin proxy)
  for (const p of PROXIES_PUB) r.push(p);
  return r;
}

/* Un intento contra una ruta concreta, con timeout duro. */
async function _una(url, px, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const u = px ? px + encodeURIComponent(url) : url;
    const r = await fetch(u, { headers, signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* Pide un JSON probando cada ruta en orden hasta que una responda.
   opts: { reintentos = 0, headers }.  Lanza si TODAS las rutas fallan. */
export async function pedirJSON(url, opts = {}) {
  const reintentos = opts.reintentos == null ? 0 : opts.reintentos;
  const headers = opts.headers || { 'Accept': 'application/json' };
  let ultimo;
  for (let intento = 0; intento <= reintentos; intento++) {
    for (const px of _rutas()) {
      try { return await _una(url, px, headers); }
      catch (e) { ultimo = e; }
    }
  }
  throw ultimo || new Error('red: sin respuesta para ' + url);
}
