/* ============================================================
   MLB PARLAY ENGINE — Top N bateadores con mayor P(≥1 hit) hoy.
   Fuente: MLB Stats API oficial (statsapi.mlb.com), gratis y sin clave.
   El MODELO de probabilidad es propio (criterio nuestro), no copiado.

   Uso:
     import { topParlayHits } from './mlb-parlay.js';
     const r = await topParlayHits({ fecha:'2026-08-27', n:9 });
     // r.jugadores -> array ordenado; r.meta -> fecha/hora/fuente/avisos

   CORS: si el navegador bloquea statsapi.mlb.com, define PROXY:
     topParlayHits({ proxy:'https://tu-worker.workers.dev/?url=' })
   El proxy antepone y reenvía la URL (ver worker de ejemplo en el README).
   ============================================================ */

import * as N from './nucleo.js';

const API = 'https://statsapi.mlb.com/api/v1';

/* ---------- utilidades ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

async function pedir(url, proxy) {
  const full = proxy ? proxy + encodeURIComponent(url) : url;
  const r = await fetch(full, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.json();
}

/* Factor de parque (índice de hits; 1.00 = neutro). Aproximado y editable. */
const PARK = { 'Coors Field': 1.10, 'Fenway Park': 1.05, 'Great American Ball Park': 1.04, 'Chase Field': 1.03,
  'Oracle Park': 0.95, 'Petco Park': 0.96, 'T-Mobile Park': 0.95, 'loanDepot park': 0.97, 'Citi Field': 0.98,
  'Yankee Stadium': 1.01, 'Nationals Park': 1.00, 'Busch Stadium': 0.99, 'Rogers Centre': 1.01, 'Truist Park': 1.00 };

/* PA esperadas por puesto en el orden de bateo (regular de 9 entradas). */
const PA_SLOT = [4.65, 4.55, 4.45, 4.35, 4.22, 4.08, 3.95, 3.82, 3.70];

/* ---------- 1) CARTELERA + PROBABLES + LINEUPS ---------- */
async function cartelera(fecha, proxy) {
  const url = `${API}/schedule?sportId=1&date=${fecha}&hydrate=team,venue,probablePitcher,lineups,linescore`;
  const d = await pedir(url, proxy);
  const juegos = [];
  (d?.dates || []).forEach(day => (day.games || []).forEach(g => juegos.push(g)));
  return juegos;
}

/* ---------- 2) STATS DE PITCHER (temporada + vs mano) ---------- */
async function statsPitcher(id, season, proxy) {
  if (!id) return null;
  try {
    const url = `${API}/people/${id}?hydrate=stats(group=[pitching],type=[season,statSplits],sitCodes=[vl,vr],season=${season})`;
    const d = await pedir(url, proxy);
    const p = d?.people?.[0]; if (!p) return null;
    const out = { id, nombre: p.fullName, mano: p.pitchHand?.code || 'R', era: null, whip: null, avgAll: null, avgVL: null, avgVR: null, k: null };
    (p.stats || []).forEach(s => {
      const t = s.type?.displayName, split = s.splits?.[0];
      if (t === 'season' && split) { const st = split.stat; out.era = +st.era || null; out.whip = +st.whip || null; out.avgAll = +st.avg || null; out.k = +st.strikeOuts || null; }
      if (t === 'statSplits') (s.splits || []).forEach(sp => { const code = sp.split?.code; if (code === 'vl') out.avgVL = +sp.stat.avg; if (code === 'vr') out.avgVR = +sp.stat.avg; });
    });
    return out;
  } catch (_) { return null; }
}
const avgPermitidoVs = (pit, bateaDe) => {   // bateaDe: 'L' o 'R' (mano del BATEADOR)
  if (!pit) return null;
  const v = bateaDe === 'L' ? pit.avgVL : pit.avgVR;
  return v != null ? v : pit.avgAll;
};

/* ---------- 3) STATS DE BATEADOR (temporada + vs mano + forma) ---------- */
async function statsBateador(id, season, proxy) {
  if (!id) return null;
  try {
    const url = `${API}/people/${id}?hydrate=stats(group=[hitting],type=[season,statSplits,lastXGames],sitCodes=[vl,vr],limit=15,season=${season})`;
    const d = await pedir(url, proxy);
    const p = d?.people?.[0]; if (!p) return null;
    const out = { id, nombre: p.fullName, mano: p.batSide?.code || 'R', avg: null, obp: null, pa: null, k: null, avgVL: null, avgVR: null, avg15: null };
    (p.stats || []).forEach(s => {
      const t = s.type?.displayName;
      if (t === 'season' && s.splits?.[0]) { const st = s.splits[0].stat; out.avg = +st.avg || null; out.obp = +st.obp || null; out.pa = +st.plateAppearances || null; out.k = +st.strikeOuts || null; }
      if (t === 'statSplits') (s.splits || []).forEach(sp => { const c = sp.split?.code; if (c === 'vl') out.avgVL = +sp.stat.avg; if (c === 'vr') out.avgVR = +sp.stat.avg; });
      if (t === 'lastXGames' && s.splits?.[0]) out.avg15 = +s.splits[0].stat.avg || null;
    });
    return out;
  } catch (_) { return null; }
}

/* ---------- 4) MODELO PROPIO: P(≥1 hit) ---------- */
/* Devuelve {prob, pHit, pa, confianza, factores[], riesgos[]} */
export function estimarHit({ bateador, pitcher, slot, venue, lineupConfirmado }) {
  const factores = [], riesgos = [];
  const manoBat = bateador.mano === 'S' ? (pitcher?.mano === 'L' ? 'R' : 'L') : (bateador.mano || 'R'); // switch: batea del lado opuesto

  // Base: average del bateador, mezclando temporada, split vs mano y forma reciente.
  const avgSeason = bateador.avg ?? 0.245;
  const avgVs = (manoBat === 'L' ? bateador.avgVL : bateador.avgVR);
  const avg15 = bateador.avg15;
  let base = avgSeason;
  let usadoSplit = false, usadoForma = false;
  if (avgVs != null) { base = base * 0.6 + avgVs * 0.4; usadoSplit = true; }
  if (avg15 != null) { base = base * 0.68 + avg15 * 0.32; usadoForma = true; }   // forma reciente pesa MÁS (racha real manda)
  base = clamp(base, 0.15, 0.38);

  // Ajuste por pitcher: compara el AVG que permite (vs la mano del bateador) con la media liga ~.245.
  const permit = avgPermitidoVs(pitcher, manoBat);
  let facPit = 1;
  if (permit != null) { facPit = clamp(permit / 0.245, 0.80, 1.25); factores.push(`Rival permite ${(permit).toFixed(3)} AVG vs ${manoBat === 'L' ? 'zurdos' : 'derechos'}`); }
  else if (pitcher?.era != null) { facPit = clamp(0.85 + (pitcher.era - 4.0) * 0.05, 0.80, 1.25); factores.push(`Abridor con ${pitcher.era.toFixed(2)} ERA`); }

  // Ventaja de lateralidad explícita (además del split, refuerzo suave).
  if (pitcher && ((manoBat === 'L' && pitcher.mano === 'R') || (manoBat === 'R' && pitcher.mano === 'L'))) { facPit *= 1.03; factores.push('Ventaja de lateralidad'); }

  // Parque
  const fpark = PARK[venue] ?? 1.0;
  if (fpark >= 1.03) factores.push('Parque favorable a hits');
  if (fpark <= 0.96) riesgos.push('Parque que deprime ofensiva');

  // p_hit por aparición: pasa de AVG (por AB) a por-PA (~×0.88) y aplica factores.
  let pHit = clamp(base * 0.88 * facPit * fpark, 0.10, 0.42);

  // PA esperadas por puesto
  const pa = PA_SLOT[clamp((slot || 5) - 1, 0, 8)];

  // P(≥1 hit) = 1 - (1 - pHit)^PA   (cálculo clásico; sirve de respaldo)
  let prob = clamp(1 - Math.pow(1 - pHit, pa), 0.30, 0.95);

  // ---- NÚCLEO: shrinkage (Bayes empírico) + log5 (matchup) + Monte Carlo ----
  // Encoge los AVG hacia la liga según la muestra (mata el ruido), combina
  // bateador×pitcher×liga con log5, y simula 4.000 partidos variando pHit y las
  // PA reales -> P(≥1 hit) como media + intervalo. Si algo falla, queda el clásico.
  let ic = null;
  try {
    const LIGA_AVG = 0.245;
    const nSeason = clamp(bateador.pa || bateador.ab || 130, 20, 700);
    const baseSh = N.regresarTasa(base, nSeason, LIGA_AVG, 200);                 // AVG del bateador, regresado
    const permitSh = permit != null ? N.regresarTasa(permit, 220, LIGA_AVG, 180) : LIGA_AVG; // AVG permitido, regresado
    const avgMatch = N.log5(baseSh, permitSh, LIGA_AVG);                          // matchup canónico (log5)
    const lat = (pitcher && ((manoBat === 'L' && pitcher.mano === 'R') || (manoBat === 'R' && pitcher.mano === 'L'))) ? 1.03 : 1;
    const pHitN = N.clamp(avgMatch * 0.88 * fpark * lat, 0.08, 0.44);            // AB -> PA, parque, lateralidad
    const sdLogit = N.clamp(0.50 - (nSeason / 700) * 0.28 - (usadoSplit ? 0.05 : 0) - (permit != null ? 0.05 : 0), 0.14, 0.50);
    const seed = (bateador.id || bateador.nombre || '') + '|' + (pitcher.id || pitcher.nombre || '') + '|' + slot;
    const mc = N.montecarlo(seed, 4000, (r) => {
      const ph = N.clamp(N.sig(N.logit(pHitN) + N.gauss(r) * sdLogit), 0.03, 0.60);
      const paR = Math.max(3, Math.round(pa + N.gauss(r) * 0.6));                 // PA reales varían por partido
      return N.pBinomGe1(ph, paR);
    });
    pHit = pHitN;
    prob = N.clamp(mc.media, 0.30, 0.97);
    ic = [Math.round(mc.ic80[0] * 100), Math.round(mc.ic80[1] * 100)];
  } catch (e) { /* respaldo: pHit/prob clásicos */ }

  // Confianza
  let señales = 0;
  if (lineupConfirmado) señales++; else riesgos.push('Lineup no confirmado (posición proyectada)');
  if (usadoSplit) señales++; else riesgos.push('Sin muestra de split por mano');
  if (permit != null) señales++;
  if (usadoForma) factores.push('Forma reciente incorporada');
  if (bateador.avg != null && bateador.avg >= 0.285) factores.push(`Alto contacto (.${String(Math.round(bateador.avg * 1000)).padStart(3, '0')} AVG)`);
  if (bateador.k != null && bateador.pa && bateador.k / bateador.pa <= 0.15) factores.push('Baja tasa de ponche');
  if ((slot || 9) <= 3) factores.push('Tope del orden: más apariciones');
  else if ((slot || 9) >= 7) riesgos.push('Parte baja del orden: menos apariciones');

  let confianza = señales >= 3 ? 'alta' : señales === 2 ? 'media' : 'baja';
  try {
    const nEff = (usadoSplit ? 30 : 0) + (permit != null ? 30 : 0) + (lineupConfirmado ? 20 : 0) + N.clamp((bateador.pa || 0) / 8, 0, 40);
    const cNuc = N.confianza({ n: nEff, anchoIC: ic ? (ic[1] - ic[0]) / 100 : null });
    if (cNuc) confianza = cNuc;
  } catch (e) {}
  const intervalo = ic ? { lo: Math.min(ic[0], ic[1]), hi: Math.max(ic[0], ic[1]) } : null;
  return { prob: Math.round(prob * 100), pHit: +pHit.toFixed(3), pa, confianza, intervalo, factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3) };
}

/* ---------- 5) ORQUESTADOR: arma el Top N del día ---------- */
/* Mejores bateadores del roster por AVG (respaldo cuando NO hay lineup confirmado).
   Una sola llamada por equipo: hidrata las stats de temporada en el propio roster.
   Devuelve [{id, nombre, avg, pa}] ordenados por AVG (con muestra mínima). */
async function rosterTopBateadores(teamId, season, proxy, max = 6) {
  if (!teamId) return [];
  try {
    const url = `${API}/teams/${teamId}/roster?rosterType=active&hydrate=person(stats(type=[season],group=[hitting],season=${season}))`;
    const d = await pedir(url, proxy);
    const roster = d?.roster || [];
    const bats = [];
    for (const r of roster) {
      const posT = r?.position?.type || '';
      const posA = r?.position?.abbreviation || '';
      if (/pitcher/i.test(posT) || posA === 'P') continue;   // solo bateadores
      const person = r?.person || {};
      const st = person?.stats?.[0]?.splits?.[0]?.stat || {};
      const avg = parseFloat(st.avg);
      const pa = parseInt(st.plateAppearances || st.atBats || 0, 10) || 0;
      if (!person.id) continue;
      bats.push({ id: person.id, nombre: person.fullName, avg: isFinite(avg) ? avg : 0, pa });
    }
    // ordena por AVG, exigiendo algo de muestra para evitar cameos con .500 en 4 turnos
    bats.sort((a, b) => (b.pa >= 30 ? b.avg : b.avg - 1) - (a.pa >= 30 ? a.avg : a.avg - 1));
    return bats.slice(0, max);
  } catch (_) { return []; }
}

/* Tasa REAL de "juegos con ≥1 hit" en los últimos 10 (lo que juzga el usuario y muestra la tarjeta). */
async function tasaJuegosConHit(id, season, proxy) {
  try {
    const d = await pedir(`${API}/people/${id}/stats?stats=gameLog&group=hitting&season=${season}`, proxy);
    const splits = d?.stats?.[0]?.splits || [];
    const hits = splits.slice(-10).map(s => +(s.stat?.hits) || 0);
    if (!hits.length) return null;
    const conHit = hits.filter(h => h >= 1).length;
    return { juegos: hits.length, conHit, tasa: conHit / hits.length };
  } catch (_) { return null; }
}

export async function topParlayHits({ fecha, n = 9, proxy = '', maxPorEquipo = 6 } = {}) {
  const avisos = [];
  const season = new Date(fecha + 'T12:00:00').getFullYear();
  const juegos = await cartelera(fecha, proxy);
  if (!juegos.length) return { jugadores: [], meta: { fecha, fuente: 'MLB Stats API', avisos: ['No hay juegos para la fecha'] } };

  // Cache de stats de pitcher por id
  const pitCache = new Map();
  const getPit = async (id) => { if (!id) return null; if (!pitCache.has(id)) pitCache.set(id, await statsPitcher(id, season, proxy)); return pitCache.get(id); };

  // ---- Todos los juegos EN PARALELO (antes era secuencial -> lento -> timeout) ----
  const porJuego = await Promise.all(juegos.map(async (g) => {
    const venue = g.venue?.name || '';
    const home = g.teams?.home, away = g.teams?.away;
    const lineups = g.lineups || {};
    const [pitHome, pitAway] = await Promise.all([ getPit(home?.probablePitcher?.id), getPit(away?.probablePitcher?.id) ]);

    const lados = [
      { lado: 'home', bateadores: lineups.homePlayers, equipo: home?.team, rival: away?.team, pit: pitAway, conf: !!lineups.homePlayers },
      { lado: 'away', bateadores: lineups.awayPlayers, equipo: away?.team, rival: home?.team, pit: pitHome, conf: !!lineups.awayPlayers },
    ];

    const cands = [];
    for (const L of lados) {
      if (!L.pit) L.pit = { nombre: 'TBD', mano: null, era: null, avgVL: 0.245, avgVR: 0.245, _neutral: true };
      let ids = [];
      let confLineup = L.conf;
      if (Array.isArray(L.bateadores) && L.bateadores.length) {
        // Lineup confirmado: los bateadores que realmente juegan (evaluamos más, no solo 3)
        ids = L.bateadores.slice(0, maxPorEquipo).map(x => x?.id || x).filter(Boolean);
      } else {
        // Sin lineup: MEJORES bateadores del roster por AVG (así entran las estrellas)
        const top = await rosterTopBateadores(L.equipo?.id, season, proxy, maxPorEquipo);
        ids = top.map(b => b.id);
        confLineup = false;
      }
      if (!ids.length) { avisos.push(`Sin datos de bateadores para ${L.equipo?.name || '—'}`); continue; }

      // Stats de todos los bateadores del lado EN PARALELO
      const bats = await Promise.all(ids.map(pid => statsBateador(pid, season, proxy)));
      bats.forEach((bat, i) => {
        if (!bat) return;
        const est = estimarHit({ bateador: bat, pitcher: L.pit, slot: i + 1, venue, lineupConfirmado: confLineup });
        cands.push({
          id: bat.id, nombre: bat.nombre, equipo: L.equipo?.name, equipoAbrev: L.equipo?.abbreviation,
          rival: L.rival?.name, rivalAbrev: L.rival?.abbreviation, venue,
          pitcher: L.pit.nombre, pitcherMano: L.pit.mano, pitcherEra: L.pit.era,
          slot: i + 1, mano: bat.mano, ...est,
        });
      });
    }
    return cands;
  }));

  const candidatos = porJuego.flat();
  candidatos.sort((a, b) => b.prob - a.prob || b.pHit - a.pHit);

  // ---- ETAPA 2: re-rankear los mejores por TASA REAL de "juegos con hit" (últimos 10) ----
  // Así mandan los que de verdad conectan seguido (7/10, 8/10), no los de buen AVG con mala racha.
  const pool = candidatos.slice(0, Math.max(n * 2, 18));
  const logs = await Promise.all(pool.map(c => tasaJuegosConHit(c.id, season, proxy)));
  pool.forEach((c, i) => {
    const g = logs[i];
    if (g) { c.tasaJuegos = g.tasa; c.rachaHits = `${g.conHit}/${g.juegos}`; }
    const tasa = g ? g.tasa : (c.prob / 100) * 0.9;   // sin historial -> usa prob atenuada
    c.score = tasa * 0.65 + (c.prob / 100) * 0.35;     // la racha real manda; el modelo apoya
  });
  pool.sort((a, b) => (b.score - a.score) || (b.prob - a.prob));

  const top = pool.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: {
      fecha, generado: new Date().toISOString(), fuente: 'MLB Stats API (statsapi.mlb.com)',
      modelo: 'log5 (bateador×pitcher×liga) + shrinkage + racha real de juegos-con-hit (últimos 10)',
      candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)],
    },
  };
}

/* ============================================================
   MOTOR DE HOME RUNS — Top N bateadores con mayor P(≥1 HR) hoy.
   Mismo patrón que hits: modelo (HR/PA + pitcher + parque) +
   racha real de "juegos con HR (últimos 10)". Datos: MLB Stats API.
   ============================================================ */

/* Factor de parque para HOME RUNS (1.00 = neutro). Aproximado y editable. */
const PARK_HR = {
  'Coors Field': 1.28, 'Great American Ball Park': 1.20, 'Yankee Stadium': 1.18, 'Citizens Bank Park': 1.16,
  'Globe Life Field': 1.10, 'Fenway Park': 1.06, 'Dodger Stadium': 1.05, 'Wrigley Field': 1.04,
  'Oracle Park': 0.82, 'T-Mobile Park': 0.86, 'loanDepot park': 0.85, 'Comerica Park': 0.88, 'Kauffman Stadium': 0.90,
};

/* Roster ordenado por HOME RUNS de temporada (pool de candidatos con poder). */
async function rosterTopHR(teamId, season, proxy, max = 6) {
  if (!teamId) return [];
  try {
    const url = `${API}/teams/${teamId}/roster?rosterType=active&hydrate=person(stats(type=[season],group=[hitting],season=${season}))`;
    const d = await pedir(url, proxy);
    const roster = d?.roster || [];
    const bats = [];
    for (const r of roster) {
      const posT = r?.position?.type || '', posA = r?.position?.abbreviation || '';
      if (/pitcher/i.test(posT) || posA === 'P') continue;
      const person = r?.person || {};
      const st = person?.stats?.[0]?.splits?.[0]?.stat || {};
      const hr = parseInt(st.homeRuns || 0, 10) || 0;
      const pa = parseInt(st.plateAppearances || st.atBats || 0, 10) || 0;
      if (!person.id) continue;
      bats.push({ id: person.id, nombre: person.fullName, hr, pa });
    }
    bats.sort((a, b) => b.hr - a.hr);   // más HR primero
    return bats.slice(0, max);
  } catch (_) { return []; }
}

/* Stats del bateador enfocadas a HR (tasa de HR por aparición). */
async function statsBateadorHR(id, season, proxy) {
  if (!id) return null;
  try {
    const url = `${API}/people/${id}?hydrate=stats(group=[hitting],type=[season],season=${season})`;
    const d = await pedir(url, proxy);
    const p = d?.people?.[0]; if (!p) return null;
    const st = (p.stats || []).find(s => s.type?.displayName === 'season')?.splits?.[0]?.stat || {};
    const hr = +st.homeRuns || 0;
    const pa = +st.plateAppearances || +st.atBats || 0;
    return { id, nombre: p.fullName, mano: p.batSide?.code || 'R', hr, pa, hrRatePA: pa > 0 ? hr / pa : 0 };
  } catch (_) { return null; }
}

/* Racha real: juegos con ≥1 HR en los últimos 10. */
async function tasaJuegosConHR(id, season, proxy) {
  try {
    const d = await pedir(`${API}/people/${id}/stats?stats=gameLog&group=hitting&season=${season}`, proxy);
    const splits = d?.stats?.[0]?.splits || [];
    const hrs = splits.slice(-10).map(s => +(s.stat?.homeRuns) || 0);
    if (!hrs.length) return null;
    const conHR = hrs.filter(h => h >= 1).length;
    return { juegos: hrs.length, conHR, tasa: conHR / hrs.length };
  } catch (_) { return null; }
}

/* MODELO: P(≥1 HR en el juego). */
export function estimarHR({ bateador, pitcher, venue }) {
  const factores = [], riesgos = [];
  const LIGA_HR_PA = 0.032;   // ~3.2% de las apariciones terminan en HR (media liga)
  let base = bateador.hrRatePA || 0;
  if (base <= 0) base = LIGA_HR_PA * 0.4;
  const nPA = clamp(bateador.pa || 100, 20, 700);
  base = N.regresarTasa(base, nPA, LIGA_HR_PA, 170);   // regresa a la media según muestra

  let facPit = 1;
  if (pitcher && pitcher.era != null) { facPit = clamp(0.90 + (pitcher.era - 4.2) * 0.05, 0.82, 1.25); if (pitcher.era >= 4.6) factores.push(`Abridor con ${pitcher.era.toFixed(2)} ERA`); }

  const fpark = PARK_HR[venue] ?? 1.0;
  if (fpark >= 1.10) factores.push('Parque muy propenso a HR');
  if (fpark <= 0.90) riesgos.push('Parque que suprime HR');

  const pHR = clamp(base * facPit * fpark, 0.005, 0.10);   // HR por aparición ajustado (realista)
  const pa = 4.1;
  const prob = clamp(1 - Math.pow(1 - pHR, pa), 0.02, 0.32);   // hasta ~32% (élite en buen spot)
  if (bateador.hr >= 25) factores.push(`Poder real (${bateador.hr} HR esta temporada)`);
  else if (bateador.hr >= 15) factores.push(`${bateador.hr} HR esta temporada`);
  const confianza = prob >= 0.22 ? 'alta' : prob >= 0.14 ? 'media' : prob >= 0.08 ? 'baja' : 'muy baja';
  return { prob: Math.round(prob * 100), pHR: +pHR.toFixed(4), pa, confianza, factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3) };
}

export async function topHomeRuns({ fecha, n = 6, proxy = '', maxPorEquipo = 4 } = {}) {
  const avisos = [];
  const season = new Date(fecha + 'T12:00:00').getFullYear();
  const juegos = await cartelera(fecha, proxy);
  if (!juegos.length) return { jugadores: [], meta: { fecha, fuente: 'MLB Stats API', avisos: ['No hay juegos para la fecha'] } };

  const pitCache = new Map();
  const getPit = async (id) => { if (!id) return null; if (!pitCache.has(id)) pitCache.set(id, await statsPitcher(id, season, proxy)); return pitCache.get(id); };

  const porJuego = await Promise.all(juegos.map(async (g) => {
    const venue = g.venue?.name || '';
    const home = g.teams?.home, away = g.teams?.away;
    const [pitHome, pitAway] = await Promise.all([ getPit(home?.probablePitcher?.id), getPit(away?.probablePitcher?.id) ]);
    const lados = [
      { equipo: home?.team, rival: away?.team, pit: pitAway },
      { equipo: away?.team, rival: home?.team, pit: pitHome },
    ];
    const cands = [];
    for (const L of lados) {
      if (!L.pit) L.pit = { nombre: 'TBD', era: null };
      // El roster ya trae HR y PA de cada bateador -> NO se re-consulta (ligero, evita saturar la API)
      const top = await rosterTopHR(L.equipo?.id, season, proxy, maxPorEquipo);
      if (!top.length) { avisos.push(`Sin datos para ${L.equipo?.name || '—'}`); continue; }
      top.forEach((b) => {
        const bat = { id: b.id, nombre: b.nombre, hr: b.hr, pa: b.pa, hrRatePA: b.pa > 0 ? b.hr / b.pa : 0 };
        const est = estimarHR({ bateador: bat, pitcher: L.pit, venue });
        cands.push({
          id: b.id, nombre: b.nombre, equipo: L.equipo?.name, equipoAbrev: L.equipo?.abbreviation,
          rival: L.rival?.name, rivalAbrev: L.rival?.abbreviation, venue,
          pitcher: L.pit.nombre, pitcherEra: L.pit.era, mano: bat.mano, hr: bat.hr, slot: 4, ...est,
        });
      });
    }
    return cands;
  }));

  const candidatos = porJuego.flat();
  candidatos.sort((a, b) => b.prob - a.prob);

  // Etapa 2 (ligera): racha real de "juegos con HR (últimos 10)" solo a los mejores
  const pool = candidatos.slice(0, 12);
  const logs = await Promise.all(pool.map(c => tasaJuegosConHR(c.id, season, proxy)));
  pool.forEach((c, i) => {
    const gl = logs[i];
    if (gl) { c.tasaJuegos = gl.tasa; c.rachaHR = `${gl.conHR}/${gl.juegos}`; }
    const tasa = gl ? gl.tasa : (c.prob / 100);
    c.score = tasa * 0.50 + (c.prob / 100) * 0.50;
  });
  pool.sort((a, b) => (b.score - a.score) || (b.prob - a.prob));

  // HR es raro: mostramos SOLO los pocos con probabilidad realmente alta, no un número fijo.
  let elegidos = pool.filter(c => c.prob >= 12);
  if (elegidos.length < 3) elegidos = pool.slice(0, 3);
  const top = elegidos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: {
      fecha, generado: new Date().toISOString(), fuente: 'MLB Stats API (statsapi.mlb.com)',
      modelo: 'HR/PA (regresado) × pitcher × parque + racha real de juegos-con-HR (últimos 10)',
      candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)],
    },
  };
}
