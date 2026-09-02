/* ============================================================
   SHOTS PROJECTION ENGINE (NHL) — Top N jugadores por
   probabilidad de registrar 2+ tiros a puerta (shots on goal) hoy.
   Fuente: NHL API pública (api-web.nhle.com + api.nhle.com/stats/rest),
   sin API key, CORS abierto.
   Modelo PROPIO tipo Poisson: los tiros son conteos ->
   P(2+) = 1 − e^(−λ)(1+λ), con λ = tiros esperados del jugador,
   ajustado por defensa rival (tiros permitidos), local/visita y forma.
   ============================================================ */

import * as N from './nucleo.js';

const WEB = 'https://api-web.nhle.com/v1';
const STATS = 'https://api.nhle.com/stats/rest/en';
const UMBRAL = 2;              // línea de referencia (tiros a puerta)
const SA_LIGA = 29.5;         // tiros en contra por partido, media aproximada de liga

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

async function pedir(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* Temporada NHL en formato 20252026 según el mes actual. */
function seasonId(fecha) {
  const d = fecha ? new Date(fecha + 'T12:00:00') : new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}${y + 1}` : `${y - 1}${y}`;   // sep+ = nueva temporada
}

/* --------- MODELO PROPIO: P(2+ tiros) --------- */
/* jugador: { nombre, spg (tiros/partido), gp, tirosUlt5, titular }
   oponente: { saPorPartido }   local: boolean */
export function estimarTiros({ jugador, oponente, local, lineupConfirmado }) {
  const factores = [], riesgos = [];
  const spg = num(jugador.spg) || 0;
  let lambda = spg;

  // Defensa rival: tiros en contra por partido vs media de liga
  const sa = num(oponente && oponente.saPorPartido);
  if (sa != null) {
    const f = clamp(sa / SA_LIGA, 0.85, 1.18);
    lambda *= f;
    if (f >= 1.05) factores.push(`Rival permite ${sa.toFixed(1)} tiros/partido`);
    if (f <= 0.92) riesgos.push('Rival concede pocos tiros');
  }

  // Local / visita (el local suele generar algo más de tiros)
  lambda *= local ? 1.04 : 0.97;
  if (local) factores.push('Juega en casa');

  // Forma reciente (últimos 5): mezcla suave
  const u5 = num(jugador.tirosUlt5);
  if (u5 != null) {
    const formaSpg = u5 / 5;
    lambda = lambda * 0.78 + formaSpg * 0.22;
    if (formaSpg >= spg + 0.6) factores.push(`En forma: ${(u5).toFixed(0)} tiros en 5 partidos`);
    if (formaSpg <= spg - 0.8) riesgos.push('Bajó su volumen de tiro');
  }

  lambda = clamp(lambda, 0.2, 6);
  const eL = Math.exp(-lambda);
  let prob = Math.round((1 - eL - lambda * eL) * 100);   // P(≥2) Poisson (respaldo)

  // ---- NÚCLEO: shrinkage de λ (Bayes) + Monte Carlo -> prob + intervalo ----
  let ic = null;
  try {
    const gp = num(jugador.gp) || 20;
    const lamSh = (lambda * gp + 1.8 * 8) / (gp + 8);      // pocos partidos -> λ hacia ~1.8 (prior tirador)
    const sdLam = N.clamp(0.9 - gp * 0.02, 0.25, 0.9);
    const seed = (jugador.nombre || '') + '|sog|' + Math.round(lambda * 100);
    const mc = N.montecarlo(seed, 4000, (r) => N.pPoissonGe(UMBRAL, Math.max(0.05, lamSh + N.gauss(r) * sdLam)));
    prob = Math.round(N.clamp(mc.media, 0, 1) * 100);
    ic = [Math.round(mc.ic80[0] * 100), Math.round(mc.ic80[1] * 100)];
  } catch (e) {}

  // Señales / confianza
  if (spg >= 3) factores.push(`Volumen alto: ${spg.toFixed(1)} tiros/partido`);
  if (lineupConfirmado && jugador.titular) factores.push('Alineación confirmada');
  if (!lineupConfirmado) riesgos.push('Alineación no confirmada');
  if ((jugador.gp || 0) < 5) riesgos.push('Poca muestra de temporada');

  let señales = 0;
  if (sa != null) señales++;
  if (u5 != null) señales++;
  if ((jugador.gp || 0) >= 15) señales++;
  if (lineupConfirmado) señales++;
  let confianza = señales >= 3 ? 'alta' : señales === 2 ? 'media' : 'baja';
  try { const c = N.confianza({ n: (num(jugador.gp) || 0) * 1.5 + señales * 8, anchoIC: ic ? (ic[1] - ic[0]) / 100 : null }); if (c) confianza = c; } catch (e) {}
  const intervalo = ic ? { lo: Math.min(ic[0], ic[1]), hi: Math.max(ic[0], ic[1]) } : null;

  return {
    prob, proj: +lambda.toFixed(1), umbral: UMBRAL, confianza, intervalo,
    factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3),
  };
}

/* --------- Tiros en contra por equipo (teamId -> SA/partido) --------- */
async function defensasNHL(sid) {
  const mapa = new Map();
  try {
    const d = await pedir(`${STATS}/team/summary?limit=-1&cayenneExp=seasonId=${sid}%20and%20gameTypeId=2`);
    (d?.data || []).forEach(t => {
      const id = t.teamId; if (id == null) return;
      const gp = num(t.gamesPlayed);
      const saTot = num(t.shotsAgainst);
      const saPg = num(t.shotsAgainstPerGame) ?? (saTot != null && gp ? saTot / gp : null);
      if (saPg != null) mapa.set(String(id), saPg);
    });
  } catch (_) {}
  return mapa;
}

/* --------- Tiros por jugador (abbrev de equipo -> lista de tiradores) --------- */
async function tiradoresPorEquipo(sid) {
  const porAbbrev = new Map();
  try {
    const d = await pedir(`${STATS}/skater/summary?limit=-1&cayenneExp=seasonId=${sid}%20and%20gameTypeId=2`);
    (d?.data || []).forEach(s => {
      const gp = num(s.gamesPlayed); const shots = num(s.shots);
      if (!gp || shots == null) return;
      const ab = (s.teamAbbrevs || '').split(/[,\s]+/).filter(Boolean).pop();   // último equipo si fue cambiado
      if (!ab) return;
      const row = { id: s.playerId, nombre: s.skaterFullName, pos: s.positionCode, spg: shots / gp, gp, goles: num(s.goals) };
      if (!porAbbrev.has(ab)) porAbbrev.set(ab, []);
      porAbbrev.get(ab).push(row);
    });
    for (const arr of porAbbrev.values()) arr.sort((a, b) => b.spg - a.spg);
  } catch (_) {}
  return porAbbrev;
}

/* --------- Orquestador --------- */
export async function topShotsProjection({ fecha, n = 9, maxPorEquipo = 6 } = {}) {
  const avisos = [];
  const sid = seasonId(fecha);
  let sched;
  try { sched = await pedir(`${WEB}/schedule/${fecha}`); }
  catch (_) { return { jugadores: [], meta: { fecha, fuente: 'NHL', avisos: ['No se pudo leer el calendario NHL'] } }; }

  const semana = sched?.gameWeek || [];
  const dia = semana.find(d => d.date === fecha) || semana[0];
  const juegos = (dia && dia.games) || [];
  if (!juegos.length) return { jugadores: [], meta: { fecha, fuente: 'NHL', avisos: ['Sin juegos NHL hoy'] } };

  const [defensas, tiradores] = await Promise.all([defensasNHL(sid), tiradoresPorEquipo(sid)]);
  const candidatos = [];

  for (const g of juegos) {
    const home = g.homeTeam, away = g.awayTeam;
    if (!home || !away) continue;
    const lados = [
      { equipo: home, rival: away, local: true },
      { equipo: away, rival: home, local: false },
    ];
    for (const lado of lados) {
      const ab = lado.equipo.abbrev;
      const lista = tiradores.get(ab) || [];
      if (!lista.length) { avisos.push(`Sin tiradores para ${ab || '—'}`); continue; }
      const oponente = { saPorPartido: defensas.get(String(lado.rival.id)) };
      let count = 0;
      for (const jug of lista) {
        if (count >= maxPorEquipo) break;
        if (jug.spg < 1) continue;   // descarta poco volumen de tiro
        const est = estimarTiros({ jugador: { ...jug, titular: true }, oponente, local: lado.local, lineupConfirmado: false });
        candidatos.push({
          id: jug.id, nombre: jug.nombre, equipoAbrev: ab, rivalAbrev: lado.rival.abbrev,
          pos: jug.pos, spg: jug.spg, local: lado.local, saRival: oponente.saPorPartido, ...est,
        });
        count++;
      }
    }
  }

  candidatos.sort((a, b) => b.prob - a.prob || b.proj - a.proj);
  // Calidad: prioriza a los tiradores de volumen (evita relleno de bajo tiro).
  let elegidos = candidatos.filter(c => (c.spg || 0) >= 2.5);
  if (elegidos.length < 4) elegidos = candidatos.filter(c => (c.spg || 0) >= 2);
  if (elegidos.length < 3) elegidos = candidatos;
  const top = elegidos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: { fecha, fuente: 'NHL', modelo: `P(${UMBRAL}+ tiros) = 1 − e^(−λ)(1+λ) · estimación propia`, candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)] },
  };
}
