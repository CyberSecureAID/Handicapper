/* ============================================================
   MLB-OFICIAL — enriquecimiento con la MLB Stats API (gratis, sin clave).
   https://statsapi.mlb.com/api/v1/…

   Devuelve, para un partido MLB (por fecha + abreviaturas de equipo):
   - abridores anunciados: { nombre, mano, mlbId, era, wl, so, whip, fotoOficial, pos, edad, altura, peso, num }
   - mejores bateadores por AVG (top 3 por equipo) con fotoOficial y avg.

   Si algo falla, devuelve null y el proveedor sigue con los datos de ESPN.
   ============================================================ */

import { fotoMLB } from './fotos-jugadores.js';

const API = 'https://statsapi.mlb.com/api/v1';

async function j(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('MLB ' + r.status);
  return r.json();
}

/* Encuentra el gamePk del partido por fecha + equipos (abreviatura o nombre) */
async function buscarGame(fechaISO, localAbrev, visitaAbrev) {
  const d = fechaISO ? new Date(fechaISO) : new Date();
  const ymd = d.toISOString().slice(0, 10);
  const data = await j(`${API}/schedule?sportId=1&date=${ymd}&hydrate=probablePitcher,team`);
  const juegos = (data.dates?.[0]?.games) || [];
  const norm = (s) => String(s || '').toUpperCase();
  const match = juegos.find(g => {
    const h = g.teams?.home?.team, a = g.teams?.away?.team;
    return (norm(h?.abbreviation) === norm(localAbrev) || norm(h?.name).includes(norm(localAbrev)))
        && (norm(a?.abbreviation) === norm(visitaAbrev) || norm(a?.name).includes(norm(visitaAbrev)));
  }) || juegos[0];
  return match || null;
}

/* Stats de pitcheo de la temporada actual para un jugador */
async function statsPitcher(personId) {
  try {
    const s = await j(`${API}/people/${personId}?hydrate=stats(group=pitching,type=season)`);
    const p = s.people?.[0];
    const st = p?.stats?.[0]?.splits?.[0]?.stat || {};
    return {
      era: st.era ?? null,
      wl: (st.wins != null && st.losses != null) ? `${st.wins}-${st.losses}` : null,
      so: st.strikeOuts ?? null,
      whip: st.whip ?? null,
      mano: (p?.pitchHand?.code === 'L') ? 'L' : (p?.pitchHand?.code === 'R' ? 'R' : null),
      num: p?.primaryNumber || null,
      pos: p?.primaryPosition?.abbreviation || 'SP',
      edad: p?.currentAge || null,
      altura: p?.height || null,
      peso: p?.weight || null,
    };
  } catch (_) { return {}; }
}

/* Top-3 bateadores por AVG de un equipo (temporada actual) */
async function bateadoresEquipo(teamId) {
  try {
    const s = await j(`${API}/teams/${teamId}/leaders?leaderCategories=battingAverage&season=${new Date().getFullYear()}&limit=3`);
    const cat = (s.teamLeaders || []).find(c => /average/i.test(c.leaderCategory || ''));
    const arr = (cat?.leaders || []).slice(0, 3).map(l => ({
      nombre: l.person?.fullName || '',
      mlbId: l.person?.id || null,
      pos: l.person?.primaryPosition?.abbreviation || '',
      avg: l.value || '',
      fotoOficial: fotoMLB(l.person?.id, 120),
    }));
    return arr;
  } catch (_) { return []; }
}

/* Estadísticas de equipo (temporada) para la comparación central.
   Devuelve las 10 categorías de la referencia con datos reales. */
async function statsEquipo(teamId, anio) {
  try {
    const s = await j(`${API}/teams/${teamId}/stats?stats=season&group=hitting,pitching,fielding&season=${anio}`);
    const bloque = (grupo) => (s.stats || []).find(x => (x.group?.displayName || x.group) === grupo || x.type?.displayName === grupo);
    const hit = (s.stats || []).find(x => /hitting/i.test(x.group?.displayName || x.group || ''))?.splits?.[0]?.stat || {};
    const pit = (s.stats || []).find(x => /pitching/i.test(x.group?.displayName || x.group || ''))?.splits?.[0]?.stat || {};
    const fld = (s.stats || []).find(x => /fielding/i.test(x.group?.displayName || x.group || ''))?.splits?.[0]?.stat || {};
    const jg = Number(hit.gamesPlayed) || Number(pit.gamesPlayed) || 0;
    const rpg = (hit.runs != null && jg) ? (hit.runs / jg).toFixed(2) : null;
    return {
      avg: hit.avg ?? null, rpg, obp: hit.obp ?? null, slg: hit.slg ?? null, hr: hit.homeRuns ?? null,
      era: pit.era ?? null, whip: pit.whip ?? null,
      k9: pit.strikeoutsPer9Inn ?? (pit.strikeOuts && pit.inningsPitched ? (pit.strikeOuts / parseFloat(pit.inningsPitched) * 9).toFixed(1) : null),
      fld: fld.fielding ?? null, err: fld.errors ?? null,
    };
  } catch (_) { return null; }
}

/* Une stats de ambos equipos en el arreglo de comparación */
function comparativa(L, V) {
  if (!L || !V) return null;
  const defs = [
    ['avg', 'Promedio de bateo', 'Batting average', false],
    ['rpg', 'Carreras por juego', 'Runs per game', false],
    ['obp', 'OBP (embase)', 'On-base %', false],
    ['slg', 'SLG (poder)', 'Slugging', false],
    ['hr', 'Jonrones', 'Home runs', false],
    ['era', 'ERA (equipo)', 'Team ERA', true],
    ['whip', 'WHIP (equipo)', 'Team WHIP', true],
    ['k9', 'Ponches por 9 IP', 'Strikeouts per 9', false],
    ['fld', 'Fielding %', 'Fielding %', false],
    ['err', 'Errores', 'Errors', true],
  ];
  const out = [];
  defs.forEach(([k, es, en, inv]) => {
    if (L[k] != null && V[k] != null) out.push({ k, es, en, local: String(L[k]), visita: String(V[k]), inv });
  });
  return out.length ? out : null;
}

export async function enriquecerMLB(fechaISO, local, visita) {
  try {
    const g = await buscarGame(fechaISO, local.abrev, visita.abrev);
    if (!g) return null;
    const homeId = g.teams?.home?.team?.id, awayId = g.teams?.away?.team?.id;
    const ppH = g.teams?.home?.probablePitcher, ppA = g.teams?.away?.probablePitcher;
    const anio = new Date().getFullYear();

    const armar = async (pp) => {
      if (!pp?.id) return null;
      const st = await statsPitcher(pp.id);
      return {
        nombre: pp.fullName, mlbId: pp.id, fotoOficial: fotoMLB(pp.id, 360),
        mano: st.mano, era: st.era, wl: st.wl, so: st.so, whip: st.whip,
        num: st.num, pos: st.pos, edad: st.edad, altura: st.altura, peso: st.peso,
      };
    };
    const [abH, abA, batH, batA, seqH, seqA] = await Promise.all([
      armar(ppH), armar(ppA), bateadoresEquipo(homeId), bateadoresEquipo(awayId),
      statsEquipo(homeId, anio), statsEquipo(awayId, anio),
    ]);
    return {
      abridor: { local: abH, visita: abA },
      bateadores: { local: batH, visita: batA },
      comparativa: comparativa(seqH, seqA),
    };
  } catch (_) { return null; }
}
