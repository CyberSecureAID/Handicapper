/* =====================================================================
   Ligas Invernales del Caribe (beisbol de invierno)
   Fuente GRATIS: MLB Stats API, sportId=17 (la MISMA API que ya usa MLB).
   Cubre octubre-febrero, justo cuando MLB para. Le habla al nucleo cubano.

   Expone:
     listarInvernales()        -> [match]  (tablero, con escudo de cada equipo)
     detalleInvernal(gamePk)   -> match    (comparacion REAL de equipos,
                                            mejores bateadores con foto y
                                            abridores con estadisticas)

   No usa ESPN: los equipos invernales no estan en ESPN ni traen logo, por eso
   generamos un escudo propio por equipo y traemos las stats de statsapi.
   ===================================================================== */
import { pedirJSON } from './red.js';
import { analizar } from '../analisis/motor.js';
import { escudoEquipo } from './proveedor-sportsdb.js';   // logo REAL del equipo (strBadge)

const API = 'https://statsapi.mlb.com/api/v1';

/* Ligas que le importan al publico (Caribe + Pacifico mexicano). El resto
   (Australia, Arizona Fall League, etc.) se filtra fuera para no meter ruido. */
const CARIBE = [
  { re: /dominican|lidom/i,                corto: 'LIDOM', pais: { en: 'Dominican Rep.', es: 'Rep. Dominicana' } },
  { re: /venezuela/i,                      corto: 'LVBP',  pais: { en: 'Venezuela',       es: 'Venezuela' } },
  { re: /roberto clemente|puerto rico/i,   corto: 'LBPRC', pais: { en: 'Puerto Rico',     es: 'Puerto Rico' } },
  { re: /mexicana del pac|pacific/i,       corto: 'LMP',   pais: { en: 'Mexican Pacific',  es: 'Pacifico Mex.' } },
  { re: /caribe|caribbean/i,               corto: 'Serie', pais: { en: 'Caribbean Series', es: 'Serie del Caribe' } },
];
function ligaCaribe(nombre) { return CARIBE.find(c => c.re.test(nombre || '')); }

function ymd(d) { return d.toISOString().slice(0, 10); }

/* Temporada invernal: arranca en octubre; de enero-febrero es el anio anterior. */
function temporadaInv() {
  const d = new Date();
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}

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
  const nombre = t.name || t.teamName || t.clubName || '—';
  const abrev = t.abbreviation || String(t.teamName || t.name || '??').slice(0, 3).toUpperCase();
  return {
    id: String(t.id || ''),
    nombre, abrev,
    record,
    winPct: isFinite(winPct) ? winPct : null,
    posicion: null,
    division: caribe ? caribe.corto : null,
    logo: null,   // se rellena con el escudo REAL de TheSportsDB (ver resolverEscudos)
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
  const limpio = out.filter(m => seen.has(m.id) ? false : (seen.add(m.id), true));
  await resolverEscudos(limpio);   // logos REALES de cada equipo
  return limpio;
}

/* Rellena el logo REAL de cada equipo (strBadge de TheSportsDB), cacheado. No
   bloquea el tablero mas de ~3.5s; lo que no llegue, se cachea para la proxima.
   Si un equipo no tiene escudo en la fuente, queda sin logo (nunca inventado). */
async function resolverEscudos(matches) {
  const nombres = [...new Set(matches.flatMap(m => [m.local.nombre, m.visita.nombre]).filter(Boolean))];
  if (!nombres.length) return;
  const mapa = {};
  const trabajo = Promise.all(nombres.map(async n => { try { mapa[n] = await escudoEquipo(n); } catch (_) { mapa[n] = null; } }));
  await Promise.race([trabajo, new Promise(r => setTimeout(r, 3500))]);
  matches.forEach(m => {
    if (mapa[m.local.nombre]) m.local.logo = mapa[m.local.nombre];
    if (mapa[m.visita.nombre]) m.visita.logo = mapa[m.visita.nombre];
  });
}

/* ---- Estadisticas reales para la ventana de comparacion ---- */
function _num(v) { const n = parseFloat(String(v)); return isFinite(n) ? n : null; }
function _f1(v) { return v == null ? null : v.toFixed(1); }

async function statsEquipo(id, season) {
  const out = { hit: {}, pit: {} };
  if (!id) return out;
  try {
    const d = await pedirJSON(`${API}/teams/${id}/stats?stats=season&group=hitting,pitching&season=${season}&sportId=17`);
    (d && d.stats || []).forEach(s => {
      const g = s && s.group && (s.group.displayName || s.group.name);
      const st = s && s.splits && s.splits[0] && s.splits[0].stat;
      if (!st) return;
      if (g === 'hitting') out.hit = st; else if (g === 'pitching') out.pit = st;
    });
  } catch (_) {}
  return out;
}

async function topBateadores(id, season) {
  if (!id) return [];
  try {
    const d = await pedirJSON(`${API}/teams/${id}/leaders?leaderCategories=battingAverage&season=${season}&sportId=17&limit=3`);
    const cat = (d && d.teamLeaders || []).find(c => c.leaderCategory === 'battingAverage') || (d && d.teamLeaders || [])[0];
    return ((cat && cat.leaders) || []).slice(0, 3).map(l => ({
      nombre: (l && l.person && l.person.fullName) || '',
      id: (l && l.person && l.person.id) || null,
      avg: (l && l.value) || '',
      pos: '',
      foto: fotoMLB(l && l.person && l.person.id),
    })).filter(b => b.nombre);
  } catch (_) { return []; }
}

async function statsPitcher(id, season) {
  if (!id) return null;
  try {
    const d = await pedirJSON(`${API}/people/${id}?hydrate=stats(group=pitching,type=season,season=${season},sportId=17)`);
    const per = d && d.people && d.people[0];
    const st = (per && per.stats && per.stats[0] && per.stats[0].splits && per.stats[0].splits[0] && per.stats[0].splits[0].stat) || {};
    return {
      era: st.era != null ? String(st.era) : null,
      whip: st.whip != null ? String(st.whip) : null,
      so: st.strikeOuts != null ? st.strikeOuts : null,
      wl: (st.wins != null && st.losses != null) ? `${st.wins}-${st.losses}` : null,
      mano: (per && per.pitchHand && per.pitchHand.code) || null,
    };
  } catch (_) { return null; }
}

/* Comparacion de equipos, con el enfoque que le sirve a quien analiza para
   apostar: ataque, defensa, bateo y pitcheo, lado a lado. */
function comparativaEquipos(L, V) {
  const rows = [];
  const gl = _num(L.hit.gamesPlayed), gv = _num(V.hit.gamesPlayed);
  const gpl = _num(L.pit.gamesPlayed) || gl, gpv = _num(V.pit.gamesPlayed) || gv;
  if (gl && gv && L.hit.runs != null && V.hit.runs != null)
    rows.push({ local: _f1(_num(L.hit.runs) / gl), visita: _f1(_num(V.hit.runs) / gv), en: 'Runs/game', es: 'Carreras/juego' });
  if (gpl && gpv && L.pit.runs != null && V.pit.runs != null)
    rows.push({ local: _f1(_num(L.pit.runs) / gpl), visita: _f1(_num(V.pit.runs) / gpv), en: 'Runs allowed/G', es: 'Carreras recib.', inv: true });
  if (L.hit.avg && V.hit.avg) rows.push({ local: String(L.hit.avg), visita: String(V.hit.avg), en: 'Team AVG', es: 'AVG equipo' });
  if (L.hit.ops && V.hit.ops) rows.push({ local: String(L.hit.ops), visita: String(V.hit.ops), en: 'Team OPS', es: 'OPS equipo' });
  if (L.hit.homeRuns != null && V.hit.homeRuns != null) rows.push({ local: String(L.hit.homeRuns), visita: String(V.hit.homeRuns), en: 'Home runs', es: 'Jonrones' });
  if (L.pit.era && V.pit.era) rows.push({ local: String(L.pit.era), visita: String(V.pit.era), en: 'Team ERA', es: 'ERA equipo', inv: true });
  if (L.pit.whip && V.pit.whip) rows.push({ local: String(L.pit.whip), visita: String(V.pit.whip), en: 'WHIP', es: 'WHIP', inv: true });
  return rows;
}

/* Detalle de un partido invernal: comparacion de equipos + bateadores + abridores */
export async function detalleInvernal(gamePk) {
  const season = temporadaInv();
  const url = `${API}/schedule?sportId=17&gamePks=${gamePk}&hydrate=team,linescore,probablePitcher,venue`;
  let g = null;
  try {
    const d = await pedirJSON(url);
    g = (d && d.dates || []).flatMap(x => (x && x.games) || []).find(x => String(x.gamePk) === String(gamePk));
  } catch (_) {}
  if (!g) return null;
  const m = aMatchInv(g);
  const idL = g.teams && g.teams.home && g.teams.home.team && g.teams.home.team.id;
  const idV = g.teams && g.teams.away && g.teams.away.team && g.teams.away.team.id;
  const ppL = g.teams && g.teams.home && g.teams.home.probablePitcher;
  const ppV = g.teams && g.teams.away && g.teams.away.probablePitcher;

  const [sL, sV, bL, bV, pL, pV, eL, eV] = await Promise.all([
    statsEquipo(idL, season), statsEquipo(idV, season),
    topBateadores(idL, season), topBateadores(idV, season),
    statsPitcher(ppL && ppL.id, season), statsPitcher(ppV && ppV.id, season),
    escudoEquipo(m.local.nombre).catch(() => null), escudoEquipo(m.visita.nombre).catch(() => null),
  ]);

  if (eL) m.local.logo = eL;
  if (eV) m.visita.logo = eV;
  m.comparativa = comparativaEquipos(sL, sV);
  m.bateadores = { local: bL, visita: bV };
  const aPlan = (arr) => arr.map(b => ({ nombre: b.nombre, id: b.id, foto: b.foto, pos: 'BAT', dato: b.avg, etiqueta: { en: 'AVG', es: 'AVG' } }));
  m.plantilla = { local: aPlan(bL), visita: aPlan(bV) };
  if (ppL && ppL.id) m.local.abridor = { nombre: ppL.fullName, id: ppL.id, pos: 'P', foto: fotoMLB(ppL.id), mano: pL && pL.mano, era: pL && pL.era, wl: pL && pL.wl, so: pL && pL.so, whip: pL && pL.whip };
  if (ppV && ppV.id) m.visita.abridor = { nombre: ppV.fullName, id: ppV.id, pos: 'P', foto: fotoMLB(ppV.id), mano: pV && pV.mano, era: pV && pV.era, wl: pV && pV.wl, so: pV && pV.so, whip: pV && pV.whip };

  // Linescore -> filas R-H-E cuando el juego ya corre (complementa la comparacion)
  const ls = g.linescore;
  if (ls && ls.teams && m.estado !== 'proximo') {
    const h = ls.teams.home || {}, a = ls.teams.away || {};
    m.datos = [
      { etiqueta: { en: 'Runs', es: 'Carreras' }, local: String(h.runs != null ? h.runs : '—'), visita: String(a.runs != null ? a.runs : '—') },
      { etiqueta: { en: 'Hits', es: 'Hits' }, local: String(h.hits != null ? h.hits : '—'), visita: String(a.hits != null ? a.hits : '—') },
      { etiqueta: { en: 'Errors', es: 'Errores' }, local: String(h.errors != null ? h.errors : '—'), visita: String(a.errors != null ? a.errors : '—') },
    ];
  }
  return m;
}
