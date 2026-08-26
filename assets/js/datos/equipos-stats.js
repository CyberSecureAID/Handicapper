/* ============================================================
   EQUIPOS-STATS — estadísticas de TEMPORADA por equipo desde la
   core API pública de ESPN (gratis, sin clave). Funciona ANTES del
   partido (no depende del boxscore), así ninguna liga sale vacía.

   Endpoint:
   https://sports.core.api.espn.com/v2/sports/{deporte}/leagues/{liga}
     /seasons/{año}/types/2/teams/{teamId}/statistics

   Devuelve una comparativa [{k, es, en, local, visita, inv}] con las
   categorías más relevantes por deporte. Si algo falla, devuelve null
   y el proveedor sigue con su respaldo (boxscore / % victorias).
   ============================================================ */

const CORE = 'https://sports.core.api.espn.com/v2/sports';

/* 'basketball/nba' -> 'basketball/leagues/nba' */
function rutaCore(ruta) {
  const [dep, liga] = String(ruta).split('/');
  return `${dep}/leagues/${liga}`;
}

async function pedirJSON(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('core ' + r.status);
  return r.json();
}

/* Aplana todas las estadísticas del equipo en un mapa nombre -> {display,value} */
async function statsEquipo(ruta, teamId, anio) {
  const base = `${CORE}/${rutaCore(ruta)}/seasons/${anio}/types/2/teams/${teamId}/statistics`;
  let data;
  try { data = await pedirJSON(base); }
  catch (_) { try { data = await pedirJSON(`${CORE}/${rutaCore(ruta)}/seasons/${anio - 1}/types/2/teams/${teamId}/statistics`); } catch (_) { return null; } }
  const cats = data?.splits?.categories || [];
  const mapa = {};
  cats.forEach(c => (c?.stats || []).forEach(s => {
    if (s?.name && (s.displayValue != null || s.value != null)) {
      mapa[s.name] = { display: s.displayValue ?? String(s.value), value: s.value };
    }
  }));
  return Object.keys(mapa).length ? mapa : null;
}

/* Categorías curadas por deporte (menor es mejor => inv:true) */
const CURADAS = {
  basketball: [
    ['avgPoints', 'Puntos por juego', 'Points per game', false],
    ['avgRebounds', 'Rebotes por juego', 'Rebounds per game', false],
    ['avgAssists', 'Asistencias por juego', 'Assists per game', false],
    ['fieldGoalPct', '% de campo', 'Field goal %', false],
    ['threePointFieldGoalPct', '% de 3 puntos', '3-point %', false],
    ['freeThrowPct', '% tiros libres', 'Free throw %', false],
    ['avgSteals', 'Robos', 'Steals', false],
    ['avgBlocks', 'Bloqueos', 'Blocks', false],
    ['avgTurnovers', 'Pérdidas', 'Turnovers', true],
  ],
  soccer: [
    ['totalGoals', 'Goles', 'Goals', false],
    ['goalAssists', 'Asistencias', 'Assists', false],
    ['shotsOnTarget', 'Tiros a puerta', 'Shots on target', false],
    ['possessionPct', 'Posesión %', 'Possession %', false],
    ['totalShots', 'Tiros totales', 'Total shots', false],
    ['wins', 'Victorias', 'Wins', false],
    ['foulsCommitted', 'Faltas cometidas', 'Fouls', true],
    ['yellowCards', 'Tarjetas amarillas', 'Yellow cards', true],
    ['goalsConceded', 'Goles en contra', 'Goals conceded', true],
  ],
  football: [
    ['totalPointsPerGame', 'Puntos por juego', 'Points per game', false],
    ['yardsPerGame', 'Yardas por juego', 'Yards per game', false],
    ['passingYardsPerGame', 'Yardas aéreas', 'Passing yards/g', false],
    ['rushingYardsPerGame', 'Yardas terrestres', 'Rushing yards/g', false],
    ['thirdDownConvPct', '3er down %', '3rd down %', false],
    ['totalGiveaways', 'Pérdidas de balón', 'Giveaways', true],
    ['sacks', 'Capturas', 'Sacks', false],
  ],
  hockey: [
    ['avgGoals', 'Goles por juego', 'Goals per game', false],
    ['avgGoalsAgainst', 'Goles en contra', 'Goals against', true],
    ['powerPlayPct', 'Power play %', 'Power play %', false],
    ['penaltyKillPct', 'Penalty kill %', 'Penalty kill %', false],
    ['shotsPerGame', 'Tiros por juego', 'Shots per game', false],
    ['savePct', '% de atajadas', 'Save %', false],
    ['faceoffPercent', 'Faceoffs %', 'Faceoffs %', false],
  ],
};

function deporteDeRuta(ruta) { return String(ruta).split('/')[0]; }

/* Construye la comparativa combinando ambos equipos */
export async function comparativaEquiposESPN(ruta, localId, visitaId, anio) {
  try {
    const [L, V] = await Promise.all([statsEquipo(ruta, localId, anio), statsEquipo(ruta, visitaId, anio)]);
    if (!L || !V) return null;
    const dep = deporteDeRuta(ruta);
    const curadas = CURADAS[dep] || [];
    const out = [];
    curadas.forEach(([name, es, en, inv]) => {
      if (L[name] && V[name]) out.push({ k: name, es, en, local: L[name].display, visita: V[name].display, inv });
    });
    // Respaldo: si casi no hubo coincidencias, toma las primeras numéricas comunes.
    if (out.length < 4) {
      const comunes = Object.keys(L).filter(k => V[k] && !out.find(o => o.k === k));
      comunes.slice(0, 8 - out.length).forEach(k => {
        const et = k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, c => c.toUpperCase());
        out.push({ k, es: et, en: et, local: L[k].display, visita: V[k].display, inv: /against|turnover|foul|penal|giveaway|conceded/i.test(k) });
      });
    }
    return out.length ? out.slice(0, 10) : null;
  } catch (_) { return null; }
}
