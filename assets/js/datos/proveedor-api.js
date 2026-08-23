/* ============================================================
   PROVEEDOR API — datos reales desde la API pública de ESPN.
   Sin API key, sin backend, sin Cloudflare: el navegador pide los
   datos cuando el usuario abre la lista o un partido.

   Endpoints (no oficiales pero estables):
     scoreboard:  https://site.api.espn.com/apis/site/v2/sports/{deporte}/{liga}/scoreboard
     resumen:     https://site.api.espn.com/apis/site/v2/sports/{deporte}/{liga}/summary?event={id}

   Devuelve la MISMA forma que proveedor-demo.js:
     LIGAS, listarPartidos(ligaId), detallePartido(id)

   NOTA: al ser no oficial, ESPN podría cambiar la estructura. Todo
   queda aquí aislado; si algo cambia, se ajusta solo en este archivo.
   ============================================================ */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

/* Mapa de nuestras ligas -> ruta ESPN {deporte}/{liga} */
const RUTA = {
  mlb:    'baseball/mlb',
  nba:    'basketball/nba',
  nfl:    'football/nfl',
  nhl:    'hockey/nhl',
  epl:    'soccer/eng.1',
  laliga: 'soccer/esp.1',
  ucl:    'soccer/uefa.champions',
  seriea: 'soccer/ita.1',
  bundes: 'soccer/ger.1',
};

/* Misma lista de ligas que el demo (con logos e iconos locales) */
export const LIGAS = [
  { id: 'mlb',    nombre: 'MLB',              corto: 'MLB',      logo: 'assets/imagenes/dep-mlb.png' },
  { id: 'nba',    nombre: 'NBA',              corto: 'NBA',      logo: 'assets/imagenes/dep-nba.png' },
  { id: 'nfl',    nombre: 'NFL',              corto: 'NFL',      logo: 'assets/imagenes/dep-nfl.png' },
  { id: 'nhl',    nombre: 'NHL',              corto: 'NHL',      logo: 'assets/imagenes/dep-nhl.png' },
  { id: 'epl',    nombre: 'Premier League',   corto: 'Premier',  logo: 'assets/imagenes/dep-premier.png' },
  { id: 'laliga', nombre: 'LaLiga',           corto: 'LaLiga',   logo: 'assets/imagenes/dep-laliga.png' },
  { id: 'ucl',    nombre: 'Champions League', corto: 'Champions',logo: 'assets/imagenes/dep-champions.png' },
  { id: 'seriea', nombre: 'Serie A',          corto: 'Serie A',  logo: 'assets/imagenes/dep-seriea.png' },
  { id: 'bundes', nombre: 'Bundesliga',       corto: 'Bundes.',  logo: 'assets/imagenes/dep-bundesliga.png' },
];

const esFutbol = (ligaId) => (RUTA[ligaId] || '').startsWith('soccer');

/* Caché simple en memoria para no repetir peticiones seguidas */
const _cache = new Map();          // clave -> { t, data }
const TTL = 60 * 1000;             // 60s

async function pedir(url) {
  const c = _cache.get(url);
  if (c && (Date.now() - c.t) < TTL) return c.data;
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('ESPN ' + r.status);
  const data = await r.json();
  _cache.set(url, { t: Date.now(), data });
  return data;
}

/* --- Utilidades de mapeo --- */

function estadoDe(ev) {
  const st = ev?.status?.type || ev?.competitions?.[0]?.status?.type || {};
  if (st.completed) return 'final';
  if (st.state === 'in') return 'vivo';
  return 'proximo';
}

function inicioDe(ev) {
  const st = ev?.status?.type || {};
  const estado = estadoDe(ev);
  if (estado === 'vivo') return { en: st.shortDetail || 'Live', es: st.shortDetail || 'En vivo' };
  if (estado === 'final') return { en: 'Final', es: 'Final' };
  // próximo: fecha/hora local del navegador
  const d = ev?.date ? new Date(ev.date) : null;
  if (!d) return { en: 'Upcoming', es: 'Próximo' };
  const optEn = { weekday: 'short', hour: 'numeric', minute: '2-digit' };
  return {
    en: d.toLocaleString('en-US', optEn),
    es: d.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
  };
}

/* Probabilidad implícita a partir de la cuota americana (moneyline) */
function probDeMoneyline(ml) {
  const n = Number(ml);
  if (!isFinite(n) || n === 0) return null;
  return n > 0 ? 100 / (n + 100) : (-n) / (-n + 100);
}

/* Extrae competidores local/visita de un evento */
function equiposDe(comp) {
  const cs = comp?.competitors || [];
  const local = cs.find(c => c.homeAway === 'home') || cs[0];
  const visita = cs.find(c => c.homeAway === 'away') || cs[1];
  const eq = (c) => ({
    nombre: c?.team?.displayName || c?.team?.name || '—',
    abrev: c?.team?.abbreviation || (c?.team?.displayName || '??').slice(0, 3).toUpperCase(),
    record: c?.records?.[0]?.summary || c?.team?.record || '',
    logo: c?.team?.logo || (c?.team?.logos?.[0]?.href) || '',
    score: c?.score,
    _c: c,
  });
  return { local: eq(local), visita: eq(visita) };
}

/* Mercado (probabilidades) desde las cuotas si existen; si no, desde el récord */
function mercadoDe(comp, futbol, local, visita) {
  const odds = comp?.odds?.[0];
  // 1) moneyline por equipo (más fiable cuando está)
  const mlH = odds?.homeTeamOdds?.moneyLine ?? odds?.homeTeamOdds?.current?.moneyLine?.american;
  const mlA = odds?.awayTeamOdds?.moneyLine ?? odds?.awayTeamOdds?.current?.moneyLine?.american;
  let pL = probDeMoneyline(mlH), pV = probDeMoneyline(mlA);
  if (pL != null && pV != null) {
    const empate = futbol ? Math.max(0, 1 - pL - pV) : null;
    const tot = pL + pV + (empate || 0);
    return norm(pL/tot, empate != null ? empate/tot : null, pV/tot, futbol);
  }
  // 2) fallback: a partir del % de victorias del récord
  const wL = winPct(local.record), wV = winPct(visita.record);
  if (wL != null && wV != null && (wL + wV) > 0) {
    if (futbol) { const e = 0.26; const r = 1 - e; const s = wL + wV || 1;
      return norm(wL/s*r, e, wV/s*r, true); }
    const s = wL + wV; return norm(wL/s, null, wV/s, false);
  }
  // 3) sin datos: 50/50 (o 38/26/36 en fútbol)
  return futbol ? { local: 38, empate: 26, visita: 36 } : { local: 50, empate: null, visita: 50 };
}
function norm(l, e, v, futbol) {
  const L = Math.round(l * 100);
  const V = Math.round(v * 100);
  if (futbol) { const E = Math.max(0, 100 - L - V); return { local: L, empate: E, visita: V }; }
  return { local: L, empate: null, visita: 100 - L };
}
function winPct(record) {
  if (!record) return null;
  const m = String(record).match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const w = +m[1], l = +m[2];
  const tot = w + l;
  return tot > 0 ? w / tot : null;
}

/* Construye un "match" de lista a partir de un evento ESPN */
function aMatch(ev, ligaId, ligaNombre) {
  const comp = ev?.competitions?.[0] || {};
  const futbol = esFutbol(ligaId);
  const { local, visita } = equiposDe(comp);
  const estado = estadoDe(ev);
  const m = {
    id: `${ligaId}:${ev.id}`,
    liga: ligaNombre, ligaId,
    inicio: inicioDe(ev),
    estado,
    local:  { nombre: local.nombre, abrev: local.abrev, record: local.record, logo: local.logo },
    visita: { nombre: visita.nombre, abrev: visita.abrev, record: visita.record, logo: visita.logo },
    marcador: (estado !== 'proximo' && local.score != null)
      ? { local: Number(local.score), visita: Number(visita.score) } : null,
    mercado: mercadoDe(comp, futbol, local, visita),
    datos: datosDe(comp, futbol, local, visita),
    analista: null,   // las señales del analista vendrán del panel (Fase 6)
  };
  return m;
}

/* Filas de comparación básicas con lo que trae el scoreboard */
function datosDe(comp, futbol, local, visita) {
  const filas = [];
  if (local.record || visita.record)
    filas.push({ etiqueta: { en: 'Record', es: 'Récord' }, local: local.record || '—', visita: visita.record || '—' });

  // estadísticas del competidor si vienen (varía por deporte)
  const stats = (c) => {
    const o = {};
    (c?._c?.statistics || []).forEach(s => { if (s?.name) o[s.name] = s.displayValue; });
    return o;
  };
  const sL = stats(local), sV = stats(visita);
  const par = (clave, etEn, etEs) => {
    if (sL[clave] != null || sV[clave] != null)
      filas.push({ etiqueta: { en: etEn, es: etEs }, local: sL[clave] ?? '—', visita: sV[clave] ?? '—' });
  };
  if (futbol) {
    par('possessionPct', 'Possession %', 'Posesión %');
    par('shotsOnTarget', 'Shots on target', 'Tiros a puerta');
    par('wins', 'Wins', 'Victorias');
  } else {
    par('avgPointsFor', 'Points/game', 'Puntos/juego');
    par('avgPointsAgainst', 'Points against', 'Puntos en contra');
  }
  return filas;
}

/* --- Interfaz pública --- */

export async function listarPartidos(ligaId = null) {
  const ids = ligaId ? [ligaId] : ['mlb', 'nba', 'nfl', 'epl', 'laliga'];  // destacados
  const nombre = (id) => (LIGAS.find(l => l.id === id) || {}).nombre || id.toUpperCase();
  const listas = await Promise.all(ids.map(async id => {
    const ruta = RUTA[id]; if (!ruta) return [];
    try {
      const data = await pedir(`${BASE}/${ruta}/scoreboard`);
      const eventos = data?.events || [];
      return eventos.slice(0, ligaId ? 30 : 3).map(ev => aMatch(ev, id, nombre(id)));
    } catch (_) { return []; }
  }));
  // Ordena: en vivo primero, luego próximos, luego finales
  const orden = { vivo: 0, proximo: 1, final: 2 };
  return listas.flat().sort((a, b) => (orden[a.estado] - orden[b.estado]));
}

export async function detallePartido(id) {
  const [ligaId, evId] = String(id).split(':');
  const ruta = RUTA[ligaId]; if (!ruta) return null;
  const nombre = (LIGAS.find(l => l.id === ligaId) || {}).nombre || ligaId.toUpperCase();
  // 1) intenta con el scoreboard (ya cacheado normalmente)
  try {
    const data = await pedir(`${BASE}/${ruta}/scoreboard`);
    const ev = (data?.events || []).find(e => String(e.id) === String(evId));
    if (ev) return aMatch(ev, ligaId, nombre);
  } catch (_) {}
  // 2) fallback: endpoint de resumen del evento
  try {
    const data = await pedir(`${BASE}/${ruta}/summary?event=${evId}`);
    const ev = data?.header?.competitions?.[0] ? { id: evId, competitions: data.header.competitions, status: data.header.competitions[0].status, date: data.header.competitions[0].date } : null;
    if (ev) return aMatch(ev, ligaId, nombre);
  } catch (_) {}
  return null;
}
