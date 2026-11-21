/* =====================================================================
   Ligas Invernales del Caribe (beisbol de invierno)
   Fuente GRATIS: MLB Stats API, sportId=17 (la MISMA API que ya usa MLB).
   Cubre octubre-febrero, justo cuando MLB para. Le habla al nucleo cubano
   y llena el vacio de noviembre a febrero en el tablero.

   Expone:
     listarInvernales()        -> [match]  (formato de la app, listo para el tablero)
     detalleInvernal(gamePk)   -> match    (con abridores + linescore + bateadores)

   No usa ESPN: los equipos invernales no estan en ESPN. Por eso vive en su
   propio modulo y el proveedor lo enchufa aparte.
   ===================================================================== */
import { pedirJSON } from './red.js';
import { analizar } from '../analisis/motor.js';

const API = 'https://statsapi.mlb.com/api/v1';

/* Ligas que le importan al publico (Caribe + Pacifico mexicano). El resto
   (p. ej. Australia) se filtra fuera para no meter ruido. */
const CARIBE = [
  { re: /dominican|lidom/i,                corto: 'LIDOM', pais: { en: 'Dominican Rep.', es: 'Rep. Dominicana' } },
  { re: /venezuela/i,                      corto: 'LVBP',  pais: { en: 'Venezuela',       es: 'Venezuela' } },
  { re: /roberto clemente|puerto rico/i,   corto: 'LBPRC', pais: { en: 'Puerto Rico',     es: 'Puerto Rico' } },
  { re: /mexicana del pac|pacific/i,       corto: 'LMP',   pais: { en: 'Mexican Pacific',  es: 'Pacifico Mex.' } },
  { re: /caribe|caribbean/i,               corto: 'Serie', pais: { en: 'Caribbean Series', es: 'Serie del Caribe' } },
];
function ligaCaribe(nombre) { return CARIBE.find(c => c.re.test(nombre || '')); }

function ymd(d) { return d.toISOString().slice(0, 10); }

/* Foto oficial del pelotero (con respaldo generico incorporado: no da 404) */
function fotoMLB(id) {
  if (!id) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_120,q_auto:best/v1/people/${id}/headshot/67/current`;
}

function equipoInv(side, caribe) {
  const t = (side && side.team) || {};
  const rec = (side && side.leagueRecord) || {};
  const record = (rec.wins != null && rec.losses != null) ? `${rec.wins}-${rec.losses}` : null;
  const winPct = rec.pct != null ? Number(rec.pct) : null;
  const pp = side && side.probablePitcher;
  return {
    id: String(t.id || ''),
    nombre: t.name || t.teamName || t.clubName || '—',
    abrev: t.abbreviation || String(t.teamName || t.name || '??').slice(0, 3).toUpperCase(),
    record,
    winPct: isFinite(winPct) ? winPct : null,
    posicion: null,
    division: caribe ? caribe.corto : null,
    logo: null,   // los equipos invernales no tienen logo publico: la tarjeta usa la abreviatura
    abridor: pp ? { nombre: pp.fullName || '', id: pp.id || null, pos: 'P', mano: null, era: null, wl: null, foto: fotoMLB(pp.id) } : null,
  };
}

function inicioInv(g, estado) {
  if (estado === 'vivo') {
    const ls = g && g.linescore;
    const ord = ls && ls.currentInningOrdinal;
    const st = ls && ls.inningState;
    if (ord) {
      const en = `${st ? st + ' ' : ''}${ord}`;
      const stEs = { Top: 'Alta', Bottom: 'Baja', Middle: 'Medio', End: 'Fin' }[st] || '';
      return { en, es: `${stEs ? stEs + ' ' : ''}${ord}` };
    }
    return { en: 'Live', es: 'En vivo' };
  }
  if (estado === 'final') return { en: 'Final', es: 'Final' };
  const d = g && g.gameDate ? new Date(g.gameDate) : null;
  if (!d || isNaN(d)) return { en: 'Upcoming', es: 'Próximo' };
  return {
    en: d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
    es: d.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
  };
}

function aMatchInv(g) {
  const nombreLiga = (g && g.teams && g.teams.home && g.teams.home.team && g.teams.home.team.league && g.teams.home.team.league.name)
    || (g && g.teams && g.teams.away && g.teams.away.team && g.teams.away.team.league && g.teams.away.team.league.name) || '';
  const caribe = ligaCaribe(nombreLiga);
  const abst = g && g.status && g.status.abstractGameState;
  const estado = abst === 'Final' ? 'final' : (abst === 'Live' ? 'vivo' : 'proximo');
  const home = g && g.teams && g.teams.home;
  const away = g && g.teams && g.teams.away;
  const local = equipoInv(home, caribe), visita = equipoInv(away, caribe);
  const marcador = (estado !== 'proximo' && home && home.score != null && away && away.score != null)
    ? { local: Number(home.score), visita: Number(away.score) } : null;
  const m = {
    id: `invierno:${g.gamePk}`,
    // En la tarjeta mostramos la sub-liga real (LIDOM, LVBP, LMP...), que el
    // publico del Caribe reconoce al instante; el cuño ya dice "invernal".
    liga: caribe ? caribe.corto : 'Invernal', ligaId: 'invierno', futbol: false,
    subliga: caribe ? caribe.corto : null, pais: caribe ? caribe.pais : null,
    inicio: inicioInv(g, estado),
    cuando: (g && g.gameDate) || null,
    sede: (g && g.venue && g.venue.name) || null,
    estado,
    local, visita,
    marcador,
    mercado: null, _fuenteProb: null,
    datos: [], jugadores: null, lesionados: null, analista: null,
  };
  const r = analizar(m);
  m.mercado = { local: r.local, empate: r.empate, visita: r.visita };
  m.confianza = r.confianza; m.sinDatos = r.sinDatos; m.factores = r.factores;
  return m;
}

/* Lista de partidos invernales (Caribe + Pacifico) para el tablero */
export async function listarInvernales() {
  const hoy = new Date();
  const ini = new Date(hoy.getTime() - 20 * 3600e3);       // ayer (margen de zona horaria)
  const fin = new Date(hoy.getTime() + 2 * 24 * 3600e3);   // +2 dias
  const url = `${API}/schedule?sportId=17&startDate=${ymd(ini)}&endDate=${ymd(fin)}&hydrate=team,linescore,probablePitcher,venue`;
  let data;
  try { data = await pedirJSON(url); } catch (_) { return []; }
  const out = [];
  (data && data.dates || []).forEach(dia => (dia && dia.games || []).forEach(g => {
    const nombreLiga = (g && g.teams && g.teams.home && g.teams.home.team && g.teams.home.team.league && g.teams.home.team.league.name)
      || (g && g.teams && g.teams.away && g.teams.away.team && g.teams.away.team.league && g.teams.away.team.league.name) || '';
    if (!ligaCaribe(nombreLiga)) return;                   // solo Caribe + Pacifico mexicano
    const det = (g && g.status && g.status.detailedState) || '';
    if (/cancel/i.test(det)) return;
    try { out.push(aMatchInv(g)); } catch (_) {}
  }));
  const seen = new Set();
  return out.filter(m => seen.has(m.id) ? false : (seen.add(m.id), true));
}

/* Mejores bateadores (top 3 por AVG) desde el boxscore, si hay datos */
function topBat(bx, side) {
  const equipo = bx && bx.teams && bx.teams[side];
  const players = (equipo && equipo.players) || {};
  const arr = [];
  Object.keys(players).forEach(k => {
    const p = players[k];
    const avg = p && p.seasonStats && p.seasonStats.batting && p.seasonStats.batting.avg;
    const at = (p && (p.seasonStats && p.seasonStats.batting && p.seasonStats.batting.atBats)) || 0;
    if (avg != null && avg !== '.---' && at > 0) {
      arr.push({
        nombre: (p.person && p.person.fullName) || '',
        pos: (p.position && p.position.abbreviation) || '',
        avg: String(avg),
        id: (p.person && p.person.id) || null,
        foto: fotoMLB(p.person && p.person.id),
        _n: parseFloat(String(avg).replace('.', '0.')) || 0,
      });
    }
  });
  arr.sort((a, b) => b._n - a._n);
  return arr.slice(0, 3);
}

/* Detalle de un partido invernal: abridores anunciados + linescore + bateadores */
export async function detalleInvernal(gamePk) {
  const url = `${API}/schedule?sportId=17&gamePks=${gamePk}&hydrate=team,linescore,probablePitcher,venue`;
  let g = null;
  try {
    const d = await pedirJSON(url);
    g = (d && d.dates || []).flatMap(x => (x && x.games) || []).find(x => String(x.gamePk) === String(gamePk));
  } catch (_) {}
  if (!g) return null;
  const m = aMatchInv(g);

  // Linescore -> filas de comparacion (R-H-E) cuando el juego ya corre
  const ls = g && g.linescore;
  if (ls && ls.teams && (m.estado !== 'proximo')) {
    const h = ls.teams.home || {}, a = ls.teams.away || {};
    m.datos = [
      { etiqueta: { en: 'Runs', es: 'Carreras' }, local: String(h.runs != null ? h.runs : '—'), visita: String(a.runs != null ? a.runs : '—') },
      { etiqueta: { en: 'Hits', es: 'Hits' },     local: String(h.hits != null ? h.hits : '—'), visita: String(a.hits != null ? a.hits : '—') },
      { etiqueta: { en: 'Errors', es: 'Errores' },local: String(h.errors != null ? h.errors : '—'), visita: String(a.errors != null ? a.errors : '—') },
    ];
  }

  // Bateadores destacados desde el boxscore (si la liga los publica)
  try {
    const bx = await pedirJSON(`${API}/game/${gamePk}/boxscore`);
    const bl = topBat(bx, 'home'), bv = topBat(bx, 'away');
    if (bl.length || bv.length) m.bateadores = { local: bl, visita: bv };
  } catch (_) {}

  return m;
}
