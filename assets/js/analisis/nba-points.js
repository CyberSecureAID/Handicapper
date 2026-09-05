/* ============================================================
   POINTS PROJECTION ENGINE — Top N jugadores por probabilidad de
   anotar 20+ puntos hoy (mercado de puntos over/under).
   Fuente: ESPN (site.api.espn.com), CORS abierto.
   Modelo PROPIO: los puntos son ~Normales -> se proyecta μ (puntos
   esperados) y P(20+) = Φ((μ − 20) / σ), con σ ligada a μ.
   μ se ajusta por defensa rival, ritmo, local/visita, minutos y forma.
   ============================================================ */

import * as N from './nucleo.js';

const API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const UMBRAL = 20;               // línea de referencia (puntos)
const PTS_LIGA = 114;            // puntos permitidos por equipo, media aproximada
const PACE_LIGA = 100;           // posesiones por partido, media aproximada

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

async function pedir(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* Φ(z): función de distribución normal estándar (aprox. de Abramowitz-Stegun). */
function Phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/* --------- MODELO PROPIO: puntos proyectados + P(20+) --------- */
/* jugador: { nombre, ppg, mpg, ptsUlt5, titular }
   oponente: { ptsPermitidos, pace }   local: boolean */
export function estimarPuntos({ jugador, oponente, local, lineupConfirmado }) {
  const factores = [], riesgos = [];
  const ppg = num(jugador.ppg) || 0;
  const mpg = num(jugador.mpg) || 0;

  // Minutos previstos
  const minPrev = lineupConfirmado ? (jugador.titular ? Math.max(mpg, 28) : Math.min(mpg, 20)) : (mpg || 26);
  let mu = mpg > 0 ? ppg * (minPrev / mpg) : ppg;

  // Ajuste por defensa rival (puntos permitidos vs media de liga)
  const pa = num(oponente && oponente.ptsPermitidos);
  if (pa != null) {
    const f = clamp(pa / PTS_LIGA, 0.88, 1.14);
    mu *= f;
    if (f >= 1.03) factores.push(`Rival permite ${pa.toFixed(1)} pts/partido`);
    if (f <= 0.96) riesgos.push('Defensa rival dura');
  }

  // Ajuste por ritmo (pace): más posesiones = más puntos
  const pace = num(oponente && oponente.pace);
  if (pace != null) {
    const f = clamp(pace / PACE_LIGA, 0.92, 1.10);
    mu *= f;
    if (f >= 1.03) factores.push('Partido de ritmo alto');
  }

  // Local / visita
  mu *= local ? 1.03 : 0.98;

  // Forma reciente (últimos 5): mezcla suave
  const u5 = num(jugador.ptsUlt5);
  if (u5 != null) {
    mu = mu * 0.78 + u5 * 0.22;
    if (u5 >= ppg + 4) factores.push(`En racha: ${u5.toFixed(1)} pts en sus últimos 5`);
    if (u5 <= ppg - 5) riesgos.push('Frío en sus últimos 5');
  }

  mu = clamp(mu, 2, 45);
  // Desviación típica de puntos por partido (empírica): crece con μ
  const sigma = Math.max(4, 0.38 * mu);
  let prob = Math.round(Phi((mu - UMBRAL) / sigma) * 100);

  // ---- NÚCLEO: shrinkage de μ (Bayes) + Monte Carlo -> prob + intervalo ----
  let ic = null;
  try {
    const gp = num(jugador.gp) || 30;
    const priorMu = 0.5 * minPrev;                        // ritmo de anotación ~liga por minuto
    const muSh = (mu * gp + priorMu * 12) / (gp + 12);    // pocos partidos -> μ hacia el prior
    const sdMu = N.clamp(6 - gp * 0.06, 1.8, 6);
    const seed = (jugador.nombre || '') + '|pts|' + Math.round(mu * 10);
    const mc = N.montecarlo(seed, 4000, (r) => N.pNormalGe(muSh + N.gauss(r) * sdMu, sigma, UMBRAL));
    prob = Math.round(N.clamp(mc.media, 0, 1) * 100);
    ic = [Math.round(mc.ic80[0] * 100), Math.round(mc.ic80[1] * 100)];
  } catch (e) {}

  // Señales / confianza
  if (ppg >= 22) factores.push(`Anotador de ${ppg.toFixed(1)} pts de promedio`);
  if (minPrev >= 32) factores.push('Muchos minutos previstos');
  if (lineupConfirmado && jugador.titular) factores.push('Titular confirmado');
  if (!lineupConfirmado) riesgos.push('Alineación no confirmada');
  if (mpg && mpg < 24) riesgos.push('Rol de minutos limitado');

  let señales = 0;
  if (pa != null) señales++;
  if (pace != null) señales++;
  if (u5 != null) señales++;
  if (lineupConfirmado) señales++;
  let confianza = señales >= 3 ? 'alta' : señales === 2 ? 'media' : 'baja';
  try { const c = N.confianza({ n: (num(jugador.gp) || 0) * 1.2 + señales * 8, anchoIC: ic ? (ic[1] - ic[0]) / 100 : null }); if (c) confianza = c; } catch (e) {}
  const intervalo = ic ? { lo: Math.min(ic[0], ic[1]), hi: Math.max(ic[0], ic[1]) } : null;

  return {
    prob, proj: +mu.toFixed(1), umbral: UMBRAL, confianza, intervalo,
    factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3),
  };
}

/* --------- Defensa + ritmo por equipo (best-effort desde standings/stats) --------- */
async function defensasNBA() {
  const mapa = new Map();
  try {
    const d = await pedir('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings');
    const entries = [];
    const juntar = (n) => { if (!n) return; if (Array.isArray(n.entries)) entries.push(...n.entries); if (n.standings) juntar(n.standings); if (Array.isArray(n.children)) n.children.forEach(juntar); };
    juntar(d);
    entries.forEach(e => {
      const id = e?.team?.id; if (!id) return;
      const st = {}; (e.stats || []).forEach(s => { const k = (s.name || s.type || '').toLowerCase(); st[k] = num(s.value != null ? s.value : s.displayValue); });
      const pa = st.avgpointsagainst ?? st.pointsagainst ?? null;
      const pj = st.gamesplayed ?? st.games ?? null;
      let ptsPermitidos = null;
      if (pa != null && pj && pa > 200) ptsPermitidos = pa / pj;   // total -> por partido
      else if (pa != null && pa < 200) ptsPermitidos = pa;         // ya es promedio
      mapa.set(String(id), { ptsPermitidos, pace: null });
    });
  } catch (_) {}
  return mapa;
}

/* --------- Roster con PPG/MPG por equipo (best-effort) --------- */
async function rosterConPuntos(teamId) {
  try {
    const d = await pedir(`${API}/teams/${teamId}/roster`);
    const out = [];
    const arr = d?.athletes || [];
    arr.forEach(a => {
      const at = a.athlete || a; if (!at || !at.id) return;
      let ppg = null, mpg = null;
      (at.statistics || at.stats || []).forEach(s => {
        const n = (s.name || s.displayName || s.abbreviation || '').toLowerCase();
        const v = num(s.value ?? s.displayValue);
        if (v == null) return;
        if (n === 'ppg' || n.includes('points per game') || n === 'avgpoints') ppg = v;
        if (n === 'mpg' || n.includes('minutes per game') || n === 'avgminutes') mpg = v;
      });
      out.push({ id: at.id, nombre: at.displayName || at.fullName, pos: at.position?.abbreviation, ppg, mpg });
    });
    return out;
  } catch (_) { return []; }
}

/* --------- Orquestador --------- */
export async function topPointsProjection({ fecha, n = 9, maxPorEquipo = 6 } = {}) {
  const avisos = [];
  const candidatos = [];
  let data;
  try { data = await pedir(`${API}/scoreboard?dates=${fecha.replace(/-/g, '')}`); }
  catch (_) { return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['No se pudo leer el calendario NBA'] } }; }
  const eventos = data?.events || [];
  if (!eventos.length) return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['Sin juegos NBA hoy'] } };

  const defensas = await defensasNBA();

  for (const ev of eventos) {
    const comp = ev?.competitions?.[0]; if (!comp) continue;
    const cs = comp.competitors || [];
    const home = cs.find(c => c.homeAway === 'home'), away = cs.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    const lados = [
      { equipo: home.team, rival: away.team, local: true },
      { equipo: away.team, rival: home.team, local: false },
    ];
    for (const lado of lados) {
      const roster = await rosterConPuntos(lado.equipo.id);
      if (!roster.length) { avisos.push(`Sin roster para ${lado.equipo?.displayName || '—'}`); continue; }
      roster.sort((a, b) => (b.ppg || 0) - (a.ppg || 0));
      const oponente = defensas.get(String(lado.rival.id)) || {};
      let count = 0;
      for (const jug of roster) {
        if (count >= maxPorEquipo) break;
        if ((jug.ppg || 0) < 8) continue;   // solo anotadores relevantes
        const est = estimarPuntos({ jugador: { ...jug, titular: true }, oponente, local: lado.local, lineupConfirmado: false });
        candidatos.push({
          id: jug.id, nombre: jug.nombre, equipoAbrev: lado.equipo.abbreviation, rivalAbrev: lado.rival.abbreviation,
          ppg: jug.ppg, mpg: jug.mpg, local: lado.local, cuando: ev.date, ptsPermRival: oponente.ptsPermitidos, ...est,
        });
        count++;
      }
    }
  }

  candidatos.sort((a, b) => b.prob - a.prob || b.proj - a.proj);
  // Calidad: prioriza a los anotadores de verdad (evita relleno de bajo promedio).
  let elegidos = candidatos.filter(c => (c.ppg || 0) >= 15);
  if (elegidos.length < 4) elegidos = candidatos.filter(c => (c.ppg || 0) >= 12);
  if (elegidos.length < 3) elegidos = candidatos;
  const top = elegidos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: { fecha, fuente: 'ESPN', modelo: `P(${UMBRAL}+ pts) = Φ((μ − ${UMBRAL})/σ) · estimación propia`, candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)] },
  };
}
