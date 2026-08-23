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
    id: c?.team?.id,
    nombre: c?.team?.displayName || c?.team?.name || '—',
    abrev: c?.team?.abbreviation || (c?.team?.displayName || '??').slice(0, 3).toUpperCase(),
    record: c?.records?.[0]?.summary || c?.team?.record || '',
    logo: c?.team?.logo || (c?.team?.logos?.[0]?.href) || '',
    score: c?.score,
    // lanzador probable (MLB) si viene en el scoreboard
    probable: c?.probables?.[0]?.athlete?.displayName || c?.probables?.[0]?.athlete?.fullName || null,
    _c: c,
  });
  return { local: eq(local), visita: eq(visita) };
}

/* Convierte un moneyline (número o texto "+120"/"-150") a número */
function mlNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const m = String(v).replace(/\s/g, '').match(/-?\+?\d+/);
  return m ? Number(m[0].replace('+', '')) : null;
}

/* Ventaja de localía por deporte (prob. base del local entre iguales) */
const HFA = { mlb: 0.54, nba: 0.60, nfl: 0.57, nhl: 0.55, _soc: 0.46 };
function factorLocal(ligaId, futbol) {
  const base = futbol ? HFA._soc : (HFA[ligaId] ?? 0.55);
  // convertir prob base (entre iguales) a un factor multiplicativo de cuota
  return base / (1 - base);
}

/* Modelo honesto sin cuota: Log5 (fuerza relativa por récord) + localía.
   Separa mucho más que normalizar el récord de forma lineal. */
function modeloSinCuota(ligaId, futbol, local, visita) {
  let pL = winPct(local.record, futbol); if (pL == null) pL = 0.5;
  let pV = winPct(visita.record, futbol); if (pV == null) pV = 0.5;
  pL = Math.min(0.85, Math.max(0.15, pL));
  pV = Math.min(0.85, Math.max(0.15, pV));
  // Log5: prob de que el local gane (sin considerar empate)
  const den = pL + pV - 2 * pL * pV;
  let e = den > 0 ? (pL - pL * pV) / den : 0.5;
  // Ventaja de localía (en espacio de cuotas)
  const oddsL = (e / (1 - e)) * factorLocal(ligaId, futbol);
  let pLocal = oddsL / (1 + oddsL);
  pLocal = Math.min(0.9, Math.max(0.1, pLocal));
  if (futbol) {
    const e26 = 0.26, r = 1 - e26;
    const L = Math.round(pLocal * r * 100), V = Math.round((1 - pLocal) * r * 100);
    return { local: L, empate: Math.max(0, 100 - L - V), visita: V };
  }
  const L = Math.round(pLocal * 100);
  return { local: L, empate: null, visita: 100 - L };
}

/* Mercado: cuota real si existe (mejor señal); si no, modelo Log5+localía */
function mercadoDe(comp, futbol, local, visita, ligaId) {
  const o = comp?.odds?.[0] || {};
  const hto = o.homeTeamOdds || {}, ato = o.awayTeamOdds || {};
  let mlH = mlNum(hto.moneyLine ?? hto.current?.moneyLine?.american ?? hto.close?.moneyLine?.american ?? hto.open?.moneyLine?.american);
  let mlA = mlNum(ato.moneyLine ?? ato.current?.moneyLine?.american ?? ato.close?.moneyLine?.american ?? ato.open?.moneyLine?.american);

  // parsear "ABBR -150" de details si falta un lado
  if ((mlH == null || mlA == null) && o.details) {
    const dm = String(o.details).match(/([A-Z]{2,4})\s*([+-]\d+)/);
    if (dm) {
      const favAb = dm[1], favMl = mlNum(dm[2]);
      if (favAb === local.abrev && mlH == null) mlH = favMl;
      else if (favAb === visita.abrev && mlA == null) mlA = favMl;
    }
  }

  let pL = probDeMoneyline(mlH), pV = probDeMoneyline(mlA);
  if (pL != null && pV == null) pV = 1 - pL;
  if (pV != null && pL == null) pL = 1 - pV;

  if (pL != null && pV != null) {
    const s = pL + pV || 1;
    if (futbol) { const e = 0.26, r = 1 - e; return norm(pL/s*r, e, pV/s*r, true); }
    return norm(pL/s, null, pV/s, false);
  }
  // sin cuota: modelo
  return modeloSinCuota(ligaId, futbol, local, visita);
}
function norm(l, e, v, futbol) {
  let L = Math.round(l * 100), V = Math.round(v * 100);
  if (futbol) { const E = Math.max(0, 100 - L - V); return { local: L, empate: E, visita: V }; }
  L = Math.max(1, Math.min(99, L)); return { local: L, empate: null, visita: 100 - L };
}
/* % de victorias. Fútbol: récord "V-E-D" (cuenta empate como medio punto) */
function winPct(record, futbol) {
  if (!record) return null;
  if (futbol) {
    const m = String(record).match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
    if (!m) return null;
    const w = +m[1], d = +m[2], l = +m[3], tot = w + d + l;
    return tot > 0 ? (w + d*0.5) / tot : null;
  }
  const m = String(record).match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const w = +m[1], l = +m[2], tot = w + l;
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
    cuando: ev?.date || comp?.date || null,          // ISO para la cuenta atrás
    sede: comp?.venue?.fullName || null,
    estado,
    local:  { id: local.id, nombre: local.nombre, abrev: local.abrev, record: local.record, logo: local.logo, probable: local.probable },
    visita: { id: visita.id, nombre: visita.nombre, abrev: visita.abrev, record: visita.record, logo: visita.logo, probable: visita.probable },
    marcador: (estado !== 'proximo' && local.score != null)
      ? { local: Number(local.score), visita: Number(visita.score) } : null,
    mercado: mercadoDe(comp, futbol, local, visita, ligaId),
    datos: datosDe(comp, futbol, local, visita),
    jugadores: null,     // se llena en el detalle (líderes)
    lesionados: null,    // se llena en el detalle
    analista: null,
  };
  return m;
}

/* Filas de comparación (sin repetir el récord, que ya va en la cabecera) */
function datosDe(comp, futbol, local, visita) {
  const filas = [];
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
    par('goalsAgainst', 'Goals against', 'Goles en contra');
  } else {
    par('avgPointsFor', 'Points/game', 'Puntos/juego');
    par('avgPointsAgainst', 'Points against', 'Puntos en contra');
  }
  return filas;
}

/* Líderes/jugadores clave por equipo desde el summary */
function lideresDe(summary, localId, visitaId) {
  const out = { local: [], visita: [] };
  const grupos = summary?.leaders || summary?.boxscore?.leaders || [];
  grupos.forEach(g => {
    const tid = String(g?.team?.id || '');
    const destino = tid === String(localId) ? out.local : (tid === String(visitaId) ? out.visita : null);
    if (!destino) return;
    (g?.leaders || []).slice(0, 3).forEach(cat => {
      const top = cat?.leaders?.[0];
      const at = top?.athlete;
      if (at) destino.push({
        nombre: at.displayName || at.shortName || at.fullName || '',
        pos: at.position?.abbreviation || at.position?.name || '',
        etiqueta: cat.displayName || cat.shortDisplayName || cat.name || '',
        dato: top.displayValue || '',
      });
    });
  });
  return out;
}

/* Lesionados por equipo desde el summary */
function lesionadosDe(summary, localId, visitaId) {
  const out = { local: [], visita: [] };
  (summary?.injuries || []).forEach(g => {
    const tid = String(g?.team?.id || '');
    const destino = tid === String(localId) ? out.local : (tid === String(visitaId) ? out.visita : null);
    if (!destino) return;
    (g?.injuries || []).slice(0, 5).forEach(inj => {
      const at = inj?.athlete;
      if (at) destino.push({
        nombre: at.displayName || at.fullName || '',
        pos: at.position?.abbreviation || '',
        estado: inj?.status || inj?.type?.description || '',
      });
    });
  });
  return out;
}

/* --- Interfaz pública --- */

export async function listarPartidos(ligaId = null) {
  // "Todos" = todas las ligas en temporada; por liga = solo esa
  const ids = ligaId ? [ligaId] : ['mlb', 'epl', 'laliga', 'seriea', 'bundes', 'ucl', 'nba', 'nfl', 'nhl'];
  const nombre = (id) => (LIGAS.find(l => l.id === id) || {}).nombre || id.toUpperCase();
  const listas = await Promise.all(ids.map(async id => {
    const ruta = RUTA[id]; if (!ruta) return [];
    try {
      const data = await pedir(`${BASE}/${ruta}/scoreboard`);
      const eventos = data?.events || [];
      return eventos.slice(0, ligaId ? 40 : 6).map(ev => aMatch(ev, id, nombre(id)));
    } catch (_) { return []; }
  }));
  const orden = { vivo: 0, proximo: 1, final: 2 };
  return listas.flat().sort((a, b) => (orden[a.estado] - orden[b.estado]));
}

export async function detallePartido(id) {
  const [ligaId, evId] = String(id).split(':');
  const ruta = RUTA[ligaId]; if (!ruta) return null;
  const nombre = (LIGAS.find(l => l.id === ligaId) || {}).nombre || ligaId.toUpperCase();
  const futbol = esFutbol(ligaId);

  let m = null;
  // 1) scoreboard (normalmente ya cacheado)
  try {
    const data = await pedir(`${BASE}/${ruta}/scoreboard`);
    const ev = (data?.events || []).find(e => String(e.id) === String(evId));
    if (ev) m = aMatch(ev, ligaId, nombre);
  } catch (_) {}

  // 2) enriquecer con el resumen: predicción de ESPN + más estadísticas
  try {
    const s = await pedir(`${BASE}/${ruta}/summary?event=${evId}`);
    if (!m && s?.header?.competitions?.[0]) {
      const c = s.header.competitions[0];
      m = aMatch({ id: evId, competitions: [c], status: c.status, date: c.date }, ligaId, nombre);
    }
    // Cuota real del resumen (pickcenter) — la señal más fiable
    const pc = (s?.pickcenter || []).find(x => x?.homeTeamOdds?.moneyLine != null || x?.awayTeamOdds?.moneyLine != null);
    if (m && pc) {
      const mlH = mlNum(pc.homeTeamOdds?.moneyLine), mlA = mlNum(pc.awayTeamOdds?.moneyLine);
      let pL = probDeMoneyline(mlH), pV = probDeMoneyline(mlA);
      if (pL != null && pV == null) pV = 1 - pL;
      if (pV != null && pL == null) pL = 1 - pV;
      if (pL != null && pV != null) {
        const tot = pL + pV || 1;
        if (futbol) { const e = 0.26, r = 1 - e; const L = Math.round(pL/tot*r*100), V = Math.round(pV/tot*r*100); m.mercado = { local: L, empate: Math.max(0, 100 - L - V), visita: V }; }
        else { const L = Math.max(1, Math.min(99, Math.round(pL/tot*100))); m.mercado = { local: L, empate: null, visita: 100 - L }; }
      }
    }
    // Predicción de ESPN (home/away win %). Si no hay cuota, la usamos.
    const pred = s?.predictor;
    const hg = Number(pred?.homeTeam?.gameProjection);
    const ag = Number(pred?.awayTeam?.gameProjection);
    if (m && !pc && isFinite(hg) && isFinite(ag) && (hg + ag) > 0) {
      if (futbol) {
        const e = 26, r = (100 - e) / 100, tot = hg + ag || 1;
        const L = Math.round((hg / tot) * 100 * r);
        const V = Math.round((ag / tot) * 100 * r);
        m.mercado = { local: L, empate: Math.max(0, 100 - L - V), visita: V };
      } else {
        const L = Math.max(1, Math.min(99, Math.round(hg)));
        m.mercado = { local: L, empate: null, visita: 100 - L };
      }
    }
    // Jugadores clave y lesionados
    if (m) {
      m.jugadores = lideresDe(s, m.local.id, m.visita.id);
      m.lesionados = lesionadosDe(s, m.local.id, m.visita.id);
      if (!m.sede) m.sede = s?.gameInfo?.venue?.fullName || null;
    }
  } catch (_) {}

  return m;
}

/* ¿el mercado quedó en el "plano" por falta de datos? */
function esPlano(mk, futbol) {
  if (!mk) return true;
  return futbol ? (mk.local === 38 && mk.visita === 36) : (mk.local === 50 && mk.visita === 50);
}
