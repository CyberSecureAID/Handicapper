/* ============================================================
   historial.js — historial REAL de los ultimos 10 partidos por jugador,
   y la probabilidad basada en ese historial medible.

   Regla del proyecto: la probabilidad que se muestra en Premium/Pro debe
   salir del rendimiento REAL y medible del jugador (sus ultimos 10 partidos),
   NO de un promedio de temporada desconectado. Si un jugador supero la linea
   en 7 de sus ultimos 10, su probabilidad ronda el 70%. Si la supero en 2, su
   probabilidad es baja y NO debe aparecer entre lo mejor.

   Un jugador sin historial verificable NO se inventa: se descarta.

   Usa la red compartida (red.js): directo primero y respaldo de proxy.
   ============================================================ */

import { pedirJSON } from './red.js';

const _num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

/* Umbral (linea) y deporte -> ruta/campo del gamelog. */
export const LINEA = {
  nba: { umbral: 20, sport: 'basketball/nba', campo: 'points' },
  nhl: { umbral: 2,  sport: 'hockey/nhl',     campo: 'shots' },
  nfl: { umbral: 1,  sport: 'football/nfl',   campo: 'touchdown' },  // suma TD de carrera + recepcion
  mlb: { umbral: 1,  campoMLB: 'hits' },
};

/* --- ESPN: ultimos 10 de una estadistica (points/shots/touchdowns...) --- */
async function logESPN(sport, id, campo) {
  const d = await pedirJSON(`https://site.web.api.espn.com/apis/common/v3/sports/${sport}/athletes/${id}/gamelog`);
  const filas = [];
  (d?.seasonTypes || []).forEach(stp => (stp.categories || []).forEach(cat => (cat.events || []).forEach(ev => filas.push(ev))));
  const labels = d?.names || d?.labels || [];
  // Para NFL los TD pueden venir en varias columnas (rushing/receiving): se suman las que casen.
  const idxs = [];
  labels.forEach((l, i) => { if (new RegExp(campo, 'i').test(String(l))) idxs.push(i); });
  if (!idxs.length) return [];
  const out = [];
  filas.slice(0, 10).forEach(ev => {
    const st = ev.stats || [];
    let v = 0; idxs.forEach(i => { const n = _num(st[i]); if (n != null) v += n; });
    out.push(v);
  });
  return out;
}

/* --- MLB Stats API: ultimos 10 (hits o HR) --- */
async function logMLB(id, season, campo) {
  const d = await pedirJSON(`https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=gameLog&group=hitting&season=${season}`);
  const splits = d?.stats?.[0]?.splits || [];
  return splits.slice(-10).map(s => _num(s.stat?.[campo]) || 0);
}

/* Ultimos 10 valores reales de la estadistica del jugador para su deporte. */
export async function ultimos10(deporte, jugador) {
  try {
    if (deporte === 'mlb') {
      const id = jugador.mlbId || jugador.id;
      if (!id) return [];
      const season = jugador.season || new Date().getFullYear();
      return await logMLB(id, season, jugador.campoMLB || 'hits');
    }
    const def = LINEA[deporte];
    if (!def || !jugador.id) return [];
    return await logESPN(def.sport, jugador.id, def.campo);
  } catch (_) { return []; }
}

/* Aciertos (veces que supero la linea) en la ventana. */
export function aciertos(valores, umbral) {
  return (valores || []).filter(v => (Number(v) || 0) >= umbral).length;
}

/* Probabilidad a partir del historial real: suavizado ligero del hit-rate
   (Beta(.5,.5) tipo Laplace), para que 7/10 ~= 68%, 2/10 ~= 23%, 10/10 ~= 95%.
   Devuelve 0..100 entero, o null si no hay muestra suficiente. */
export function probHistorial(valores, umbral, minMuestra = 5) {
  const n = (valores || []).length;
  if (n < minMuestra) return null;
  const a = aciertos(valores, umbral);
  return Math.round(((a + 0.5) / (n + 1)) * 100);
}

export function promedio(valores) {
  const n = (valores || []).length; if (!n) return null;
  return (valores.reduce((s, v) => s + (Number(v) || 0), 0) / n);
}

/* Toma los candidatos (ya ordenados por una señal de temporada), evalua el
   historial REAL de los mejores, pone la probabilidad = hit-rate real, descarta
   a quien no tiene historial verificable, filtra a SOLO alta calidad y devuelve
   los mejores. Esta es la unica fuente de la probabilidad que ve el usuario en
   Premium/Pro. */
export async function rankearPorHistorial(deporte, candidatos, opts = {}) {
  const n = opts.n == null ? 9 : opts.n;
  const minProb = opts.minProb == null ? 55 : opts.minProb;   // nada por debajo: solo lo mejor
  const maxEval = opts.maxEval == null ? 16 : opts.maxEval;
  const pool = (candidatos || []).slice(0, maxEval);
  const evals = await Promise.all(pool.map(async (c) => {
    try {
      const h = await evaluar(deporte, c);
      if (!h) return null;
      return { ...c, prob: h.prob, proj: (h.promedio != null ? +h.promedio.toFixed(1) : (c.proj || null)), hist: h,
        confianza: h.muestra >= 8 ? 'alta' : (h.muestra >= 6 ? 'media' : 'baja') };
    } catch (_) { return null; }
  }));
  let out = evals.filter(Boolean);
  out.sort((a, b) => (b.prob - a.prob) || ((b.hist.aciertos || 0) - (a.hist.aciertos || 0)) || ((b.hist.promedio || 0) - (a.hist.promedio || 0)));
  out = out.filter(c => c.prob >= minProb);
  return out.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
}

/* Evalua a un jugador con su historial real. Devuelve null si no hay data
   verificable (no se inventa). */
export async function evaluar(deporte, jugador) {
  const def = LINEA[deporte]; if (!def) return null;
  const umbral = def.umbral;
  const valores = await ultimos10(deporte, jugador);
  const prob = probHistorial(valores, umbral);
  if (prob == null) return null;   // sin historial suficiente -> se descarta
  return {
    valores,
    aciertos: aciertos(valores, umbral),
    muestra: valores.length,
    prob,
    promedio: promedio(valores),
    umbral,
    mejor: Math.max(0, ...valores.map(v => Number(v) || 0)),
  };
}
