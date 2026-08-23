/* ============================================================
   MOTOR DE ANÁLISIS — probabilidad honesta con confianza.

   Principios:
   - La cuota real del mercado (si existe) es la mejor señal y manda.
   - Sin cuota, se estima con Log5 (fuerza relativa) + ventaja local,
     pero con REGRESIÓN A LA MEDIA: un récord de pocos partidos vale
     poco (no se cree que "1-0-0" sea el 100%).
   - Se calcula un nivel de CONFIANZA. Si es bajo, la probabilidad se
     acerca al centro (no fingimos certeza) y se explica por qué.
   - Devuelve también una explicación escrita (bilingüe) de los
     factores que movieron la probabilidad.

   Entrada: objeto "match" del proveedor (local/visita con record,
   recordCasa, recordFuera; mercado si vino de cuota; ligaId; futbol).
   Salida: { local, empate, visita, confianza, factores:{en,es} }
   ============================================================ */

/* Ventaja de localía por deporte (prob. base del local entre iguales) */
const HFA = { mlb: 0.54, nba: 0.60, nfl: 0.57, nhl: 0.55, _soc: 0.46 };

/* Partidos "previos" para la regresión a la media (fuerza del prior).
   Cuantos más, más hay que jugar para alejarse del 50%. */
const PRIOR_N = { _soc: 6, mlb: 12, nba: 8, nfl: 3, nhl: 8 };

function baseLocal(ligaId, futbol) { return futbol ? HFA._soc : (HFA[ligaId] ?? 0.55); }
function priorN(ligaId, futbol)   { return futbol ? PRIOR_N._soc : (PRIOR_N[ligaId] ?? 8); }

/* Cuenta victorias-derrotas (fútbol: V-E-D). Devuelve {w,l,n} con el
   empate como medio punto. */
function cuenta(record, futbol) {
  if (!record) return null;
  if (futbol) {
    const m = String(record).match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!m) return null;
    const w = +m[1], d = +m[2], l = +m[3];
    return { w: w + d * 0.5, l: l + d * 0.5, n: w + d + l };
  }
  const m = String(record).match(/(\d+)\D+(\d+)/);
  if (!m) return null;
  const w = +m[1], l = +m[2];
  return { w, l, n: w + l };
}

/* % de victoria con regresión a la media: mezcla el récord con 0.5
   ponderando por el nº de partidos frente al prior. */
function winPctReg(record, futbol, ligaId) {
  const c = cuenta(record, futbol);
  const k = priorN(ligaId, futbol);
  if (!c || c.n === 0) return { p: 0.5, n: 0 };
  const p = (c.w + 0.5 * k) / (c.n + k);   // Bayes: prior 0.5 con peso k
  return { p, n: c.n };
}

function probDeMoneyline(ml) {
  const n = Number(ml);
  if (!isFinite(n) || n === 0) return null;
  return n > 0 ? 100 / (n + 100) : (-n) / (-n + 100);
}

/* ---- Motor principal ---- */
export function analizar(match) {
  const futbol = match.futbol != null ? match.futbol : !!(match.mercado && match.mercado.empate != null);
  const ligaId = match.ligaId;

  // 1) ¿Vino ya una probabilidad de CUOTA real? (la marca el proveedor)
  if (match._fuenteProb === 'cuota' && match.mercado) {
    return {
      ...match.mercado,
      confianza: 'alta',
      factores: {
        en: 'Based on live betting market odds.',
        es: 'Basado en las cuotas reales del mercado.',
      },
    };
  }
  if (match._fuenteProb === 'prediccion' && match.mercado) {
    return {
      ...match.mercado,
      confianza: 'media',
      factores: {
        en: "Based on ESPN's own win projection.",
        es: 'Basado en la proyección de victoria de ESPN.',
      },
    };
  }

  // 2) Sin cuota: modelo con regresión a la media
  const L = winPctReg(match.local.recordCasa || match.local.record, futbol, ligaId);
  const V = winPctReg(match.visita.recordFuera || match.visita.record, futbol, ligaId);
  let pL = Math.min(0.85, Math.max(0.15, L.p));
  let pV = Math.min(0.85, Math.max(0.15, V.p));

  // Log5: fuerza relativa
  const den = pL + pV - 2 * pL * pV;
  let e = den > 0 ? (pL - pL * pV) / den : 0.5;

  // Ventaja de localía en espacio de cuotas
  const base = baseLocal(ligaId, futbol);
  const oddsL = (e / (1 - e)) * (base / (1 - base));
  let pLocal = oddsL / (1 + oddsL);

  // 3) Confianza según muestra: poca muestra -> acercar al centro
  const muestra = Math.min(L.n, V.n);
  let confianza, encoge;
  if (muestra >= 10)      { confianza = 'media'; encoge = 1.0; }
  else if (muestra >= 4)  { confianza = 'baja';  encoge = 0.6; }
  else                    { confianza = 'muy baja'; encoge = 0.3; }
  // encoger hacia 0.5 según confianza
  pLocal = 0.5 + (pLocal - 0.5) * encoge;
  pLocal = Math.min(0.9, Math.max(0.1, pLocal));

  // 4) Salida (con empate para fútbol)
  let out;
  if (futbol) {
    const eDraw = 0.26, r = 1 - eDraw;
    const lo = Math.round(pLocal * r * 100), vi = Math.round((1 - pLocal) * r * 100);
    out = { local: lo, empate: Math.max(0, 100 - lo - vi), visita: vi };
  } else {
    const lo = Math.round(pLocal * 100);
    out = { local: lo, empate: null, visita: 100 - lo };
  }

  out.confianza = confianza;
  out.sinDatos = (muestra === 0);
  out.factores = explicar(match, { pLocal, muestra, confianza, base, futbol });
  return out;
}

/* Explicación escrita de los factores */
function explicar(match, ctx) {
  const en = [], es = [];
  const favLocal = ctx.pLocal >= 0.5;
  const fav = favLocal ? match.local.abrev : match.visita.abrev;

  en.push(`Home advantage favors ${match.local.abrev}.`);
  es.push(`La localía favorece a ${match.local.abrev}.`);

  if (ctx.muestra >= 4) {
    en.push('Recent form and record factored in.');
    es.push('Se considera la forma y el récord recientes.');
  }
  if (ctx.confianza === 'muy baja') {
    en.push('Very small sample: low confidence, kept near even.');
    es.push('Muestra muy corta: poca confianza, se mantiene cerca del centro.');
  } else if (ctx.confianza === 'baja') {
    en.push('Small sample: moderate confidence.');
    es.push('Muestra corta: confianza moderada.');
  }
  en.push(`Lean: ${fav}.`);
  es.push(`Inclinación: ${fav}.`);
  return { en: en.join(' '), es: es.join(' ') };
}
