/* ============================================================
   LA ÉLITE DEL DÍA — la mejor selección MULTIDEPORTE del día.
   Toma el pick de MÁS alta confianza de cada deporte (Hits, 2+ goles,
   Points, Shots, Touchdown) y SOLO lo incluye si supera un umbral alto
   (la crème de la crème). Nada dudoso: si un deporte no tiene nada
   evidente hoy, sencillamente no entra.
   100% dentro del repo, sin datos nuevos: reusa los motores que ya existen.
   ============================================================ */
import { topParlayHits } from './mlb-parlay.js';
import { topGoalsMatchProjection } from './soccer-goal.js';
import { topPointsProjection } from './nba-points.js';
import { topShotsProjection } from './nhl-shots.js';
import { topTouchdownProjection } from './nfl-touchdowns.js';

const hoyISO = () => new Date().toISOString().slice(0, 10);

/* Cada deporte con su umbral alto (mismos que usa cada sección) y su etiqueta. */
const SECCIONES = [
  { sport: 'mlb',    hi: 68, etiqueta: { en: 'Hit', es: 'Hit' },        pico: { en: 'to get a hit', es: 'de conectar un hit' },   run: () => topParlayHits({ fecha: hoyISO(), n: 9 }) },
  { sport: 'soccer', hi: 68, etiqueta: { en: '2+ goals', es: '2+ goles' }, pico: { en: 'for 2+ goals', es: 'de 2+ goles' },        run: () => topGoalsMatchProjection({ fecha: hoyISO(), n: 9 }) },
  { sport: 'nba',    hi: 65, etiqueta: { en: '20+ pts', es: '20+ pts' },   pico: { en: 'for 20+ points', es: 'de 20+ puntos' },     run: () => topPointsProjection({ fecha: hoyISO(), n: 9 }) },
  { sport: 'nhl',    hi: 72, etiqueta: { en: '2+ shots', es: '2+ tiros' }, pico: { en: 'for 2+ shots', es: 'de 2+ tiros' },         run: () => topShotsProjection({ fecha: hoyISO(), n: 9 }) },
  { sport: 'nfl',    hi: 46, etiqueta: { en: 'Touchdown', es: 'Touchdown' }, pico: { en: 'to score a TD', es: 'de anotar un TD' },  run: () => topTouchdownProjection({ fecha: hoyISO(), n: 9 }) },
];

let _cacheElite = null;
export async function eliteDelDia() {
  if (_cacheElite && (Date.now() - _cacheElite.ts) < 5 * 60 * 1000) return _cacheElite.data;
  const conTimeout = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
  const res = await Promise.allSettled(SECCIONES.map(s => conTimeout(s.run(), 13000)));
  const picks = [];
  res.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    const sec = SECCIONES[i];
    const cand = (r.value.jugadores || [])
      .filter(j => j && typeof j.prob === 'number' && j.prob >= sec.hi)
      .sort((a, b) => b.prob - a.prob)[0];
    if (cand) picks.push({ ...cand, _sport: sec.sport, _etiqueta: sec.etiqueta, _pico: sec.pico, _hi: sec.hi });
  });
  picks.sort((a, b) => b.prob - a.prob);
  // Probabilidad combinada = producto de las individuales (así funciona una combinada real).
  const probComb = picks.length ? Math.round(picks.reduce((a, p) => a * (p.prob / 100), 1) * 100) : null;
  const data = { picks, probComb, fecha: hoyISO(), total: picks.length };
  _cacheElite = { data, ts: Date.now() };
  return data;
}
