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
import { analizar } from '../analisis/motor.js';

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
  const eq = (c) => {
    const recs = c?.records || [];
    const rec = (t) => (recs.find(r => (r.type || r.name || '').toLowerCase() === t)?.summary) || null;
    return {
      id: c?.team?.id,
      nombre: c?.team?.displayName || c?.team?.name || '—',
      abrev: c?.team?.abbreviation || (c?.team?.displayName || '??').slice(0, 3).toUpperCase(),
      record: rec('total') || recs[0]?.summary || c?.team?.record || '',
      recordCasa: rec('home'),
      recordFuera: rec('road') || rec('away'),
      logo: c?.team?.logo || (c?.team?.logos?.[0]?.href) || '',
      score: c?.score,
      abridor: abridorDe(c),
      _c: c,
    };
  };
  return { local: eq(local), visita: eq(visita) };
}

/* Abridor anunciado (MLB): nombre, mano (LHP/RHP) y stats (ERA, W-L) */
function abridorDe(c) {
  const p = c?.probables?.[0];
  const at = p?.athlete;
  if (!at) return null;
  const nombre = at.displayName || at.fullName || at.shortName || '';
  if (!nombre) return null;
  // Mano: probamos varias ubicaciones (ESPN varía)
  const manoRaw = at.hand?.abbreviation || at.hand?.type || at.hand?.displayValue || at.throws || null;
  let mano = null;
  if (manoRaw) {
    const s = String(manoRaw).toUpperCase();
    if (s.startsWith('L')) mano = 'L';
    else if (s.startsWith('R')) mano = 'R';
  }
  // Stats del abridor si vienen (ERA, W-L)
  let era = null, wl = null;
  (p?.statistics || []).forEach(st => {
    const ab = (st.abbreviation || st.name || '').toUpperCase();
    if (ab === 'ERA') era = st.displayValue;
    if (ab === 'W-L' || ab === 'WL' || ab === 'RECORD') wl = st.displayValue;
  });
  const foto = at.headshot?.href || at.headshot || null;
  const pos = at.position?.abbreviation || at.position?.name || '';
  return { nombre, mano, era, wl, id: at.id || null, foto, pos };
}

/* Convierte un moneyline (número o texto "+120"/"-150") a número */
function mlNum(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const m = String(v).replace(/\s/g, '').match(/-?\+?\d+/);
  return m ? Number(m[0].replace('+', '')) : null;
}



/* Lee la cuota real si existe. Devuelve { prob, fuente } donde
   fuente='cuota' si se usó moneyline; si no, { prob:null, fuente:null }
   y será el MOTOR quien calcule la probabilidad. */
function mercadoDe(comp, futbol, local, visita, ligaId) {
  const o = comp?.odds?.[0] || {};
  const hto = o.homeTeamOdds || {}, ato = o.awayTeamOdds || {};
  let mlH = mlNum(hto.moneyLine ?? hto.current?.moneyLine?.american ?? hto.close?.moneyLine?.american ?? hto.open?.moneyLine?.american);
  let mlA = mlNum(ato.moneyLine ?? ato.current?.moneyLine?.american ?? ato.close?.moneyLine?.american ?? ato.open?.moneyLine?.american);
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
    const prob = futbol
      ? norm(pL/s*(1-0.26), 0.26, pV/s*(1-0.26), true)
      : norm(pL/s, null, pV/s, false);
    return { prob, fuente: 'cuota' };
  }
  return { prob: null, fuente: null };
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
  const mk = mercadoDe(comp, futbol, local, visita, ligaId);
  const m = {
    id: `${ligaId}:${ev.id}`,
    liga: ligaNombre, ligaId, futbol,
    inicio: inicioDe(ev),
    cuando: ev?.date || comp?.date || null,
    sede: comp?.venue?.fullName || null,
    estado,
    local:  { id: local.id, nombre: local.nombre, abrev: local.abrev, record: local.record, recordCasa: local.recordCasa, recordFuera: local.recordFuera, logo: local.logo, abridor: local.abridor },
    visita: { id: visita.id, nombre: visita.nombre, abrev: visita.abrev, record: visita.record, recordCasa: visita.recordCasa, recordFuera: visita.recordFuera, logo: visita.logo, abridor: visita.abridor },
    marcador: (estado !== 'proximo' && local.score != null)
      ? { local: Number(local.score), visita: Number(visita.score) } : null,
    mercado: mk.prob,          // cuota real si la hay; si no, null
    _fuenteProb: mk.fuente,    // 'cuota' | null
    datos: datosDe(comp, futbol, local, visita),
    jugadores: null,
    lesionados: null,
    analista: null,
  };
  // El MOTOR calcula la probabilidad final (con regresión a la media y confianza)
  const r = analizar(m);
  m.mercado = { local: r.local, empate: r.empate, visita: r.visita };
  m.confianza = r.confianza;
  m.sinDatos = r.sinDatos;
  m.factores = r.factores;
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

/* Líderes reales por equipo desde el summary (nombre + estadística) */
function lideresDe(summary, localId, visitaId) {
  const out = { local: [], visita: [] };
  const grupos = summary?.leaders || summary?.boxscore?.leaders || [];
  grupos.forEach(g => {
    const tid = String(g?.team?.id || '');
    const destino = tid === String(localId) ? out.local : (tid === String(visitaId) ? out.visita : null);
    if (!destino) return;
    (g?.leaders || []).slice(0, 5).forEach(cat => {
      const top = cat?.leaders?.[0];
      const at = top?.athlete;
      if (at) destino.push({
        nombre: at.displayName || at.shortName || at.fullName || '',
        pos: at.position?.abbreviation || at.position?.name || '',
        etiqueta: cat.shortDisplayName || cat.displayName || cat.name || '',
        dato: top.displayValue || top.value || '',
        id: at.id || null,
        foto: at.headshot?.href || at.headshot || null,
      });
    });
  });
  return out;
}

/* Mejores bateadores por AVG (top 3 por equipo).
   Busca la categoría de promedio de bateo dentro de los líderes de ESPN
   (que trae varios por categoría) y toma los 3 primeros. */
function bateadoresDe(summary, localId, visitaId) {
  const out = { local: [], visita: [] };
  const grupos = summary?.leaders || summary?.boxscore?.leaders || [];
  const esAvg = (cat) => {
    const k = (cat?.abbreviation || cat?.shortDisplayName || cat?.name || '').toLowerCase();
    return k === 'avg' || k.includes('batting') || k === 'ba';
  };
  grupos.forEach(g => {
    const tid = String(g?.team?.id || '');
    const destino = tid === String(localId) ? out.local : (tid === String(visitaId) ? out.visita : null);
    if (!destino) return;
    const cat = (g?.leaders || []).find(esAvg);
    if (!cat) return;
    (cat.leaders || []).slice(0, 3).forEach(top => {
      const at = top?.athlete; if (!at) return;
      destino.push({
        nombre: at.displayName || at.shortName || at.fullName || '',
        pos: at.position?.abbreviation || at.position?.name || '',
        avg: top.displayValue || top.value || '',
        id: at.id || null,
        foto: at.headshot?.href || at.headshot || null,
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
        m._fuenteProb = 'cuota';
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
      m._fuenteProb = 'prediccion';
    }
    // Re-ejecutar el motor con la mejor señal disponible (cuota/predicción)
    if (m && m._fuenteProb) {
      const r = analizar(m);
      m.mercado = { local: r.local, empate: r.empate, visita: r.visita };
      m.confianza = r.confianza; m.sinDatos = r.sinDatos; m.factores = r.factores;
    }
    // Jugadores clave y lesionados
    if (m) {
      m.jugadores = lideresDe(s, m.local.id, m.visita.id);
      m.lesionados = lesionadosDe(s, m.local.id, m.visita.id);
      m.plantilla = rosterDe(s, m.local.id, m.visita.id);
      m.bateadores = bateadoresDe(s, m.local.id, m.visita.id);
      if (!m.sede) m.sede = s?.gameInfo?.venue?.fullName || null;
    }
  } catch (_) {}

  return m;
}

/* Roster / plantilla con estadísticas por jugador (desde boxscore o rosters).
   Devoto: intenta varias formas del summary de ESPN y falla en silencio. */
function rosterDe(summary, localId, visitaId) {
  const out = { local: [], visita: [] };
  const meter = (lado, at, stats, pos) => {
    if (!at) return;
    const nombre = at.displayName || at.shortName || at.fullName;
    if (!nombre) return;
    out[lado].push({
      nombre,
      pos: pos || at.position?.abbreviation || at.position?.name || '',
      foto: at.headshot?.href || at.headshot || null,
      stats: stats || {},
    });
  };
  try {
    // 1) boxscore.players[].statistics[].athletes[] (juegos en vivo/finalizados)
    const bx = summary?.boxscore?.players || [];
    bx.forEach(teamBlock => {
      const tid = String(teamBlock?.team?.id || '');
      const lado = tid === String(localId) ? 'local' : (tid === String(visitaId) ? 'visita' : null);
      if (!lado) return;
      (teamBlock?.statistics || []).forEach(grp => {
        const labels = grp?.labels || grp?.names || [];
        (grp?.athletes || []).slice(0, 12).forEach(a => {
          const st = {};
          (a?.stats || []).forEach((val, i) => { if (labels[i]) st[labels[i]] = val; });
          if (!out[lado].find(x => x.nombre === (a?.athlete?.displayName))) meter(lado, a?.athlete, st, a?.athlete?.position?.abbreviation);
        });
      });
    });
    // 2) rosters[].roster[] (partidos próximos)
    if (!out.local.length && !out.visita.length) {
      (summary?.rosters || []).forEach(teamBlock => {
        const tid = String(teamBlock?.team?.id || '');
        const lado = tid === String(localId) ? 'local' : (tid === String(visitaId) ? 'visita' : null);
        if (!lado) return;
        (teamBlock?.roster || []).slice(0, 16).forEach(r => meter(lado, r?.athlete || r, null, r?.position?.abbreviation));
      });
    }
  } catch (_) {}
  return out;
}

