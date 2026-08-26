/* ============================================================
   MOTOR DE ANÁLISIS — probabilidad honesta, variada y explicable.

   Jerarquía de señales (de más a menos fiable):
   1) CUOTA real del mercado (si el proveedor la trajo)  -> manda.
   2) PROYECCIÓN de ESPN (predictor)                     -> manda.
   3) MODELO propio multi-factor (aditivo en log-odds):
        - Fuerza por récord (regresión LIGERA a la media).
        - Forma situacional: récord en casa (local) / fuera (visita).
        - Ventaja de localía por deporte.
        - Duelo de abridores por ERA (MLB) cuando está disponible.
        - Lesionados clave (resta al equipo con más bajas).
      Cada factor suma/resta en log-odds, así que la probabilidad
      final VARÍA de verdad según los datos visibles del partido.
   4) CONFIANZA según cuántas señales reales respaldaron el número.
      Poca info -> confianza baja (se dice), pero el número sigue
      reflejando los factores que SÍ existen (no un 52% de relleno).

   Entrada: "match" del proveedor. Salida:
     { local, empate, visita, confianza, sinDatos, factores:{en,es} }
   ============================================================ */

/* Ventaja de localía por deporte, ya en LOG-ODDS (ln(p/(1-p))).
   mlb .54, nba .60, nfl .57, nhl .55, fútbol ~.50 (el empate se separa aparte). */
const HFA_LOGIT = {
  mlb: 0.16, nba: 0.41, nfl: 0.28, nhl: 0.20, nba_default: 0.30, _soc: 0.22,
};
/* Prior (partidos "fantasma" a 50%) para la regresión. Ligero: deja hablar al récord. */
const PRIOR_N = { _soc: 5, mlb: 8, nba: 5, nfl: 2, nhl: 6, _def: 5 };

/* Pesos del modelo */
const W = {
  fuerza: 0.85,   // peso de la diferencia de fuerza (record) en log-odds
  overall: 0.6,   // mezcla récord total vs situacional
  situ: 0.4,      // récord casa/fuera
  era: 0.34,      // por cada 1.00 de diferencia de ERA (MLB)
  eraCap: 0.75,   // tope del efecto ERA
  lesion: 0.13,   // por cada lesionado clave neto
  lesionCap: 0.55,
  clampLo: 0.06, clampHi: 0.94, // límites de la prob del local (no-fútbol)
};

const sig = (x) => 1 / (1 + Math.exp(-x));
const logit = (p) => Math.log(p / (1 - p));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function priorN(ligaId, futbol) { return futbol ? PRIOR_N._soc : (PRIOR_N[ligaId] ?? PRIOR_N._def); }
function hfaLogit(ligaId, futbol) { return futbol ? HFA_LOGIT._soc : (HFA_LOGIT[ligaId] ?? HFA_LOGIT.nba_default); }

/* Cuenta victorias-derrotas (fútbol: V-E-D, empate = medio punto). */
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

/* Fuerza de un récord en LOG-ODDS, con regresión ligera a 0.5. */
function fuerzaLogit(record, futbol, ligaId) {
  const c = cuenta(record, futbol);
  const k = priorN(ligaId, futbol);
  if (!c || c.n === 0) return { logit: 0, n: 0 };
  const p = clamp((c.w + 0.5 * k) / (c.n + k), 0.05, 0.95);
  return { logit: logit(p), n: c.n };
}

function probDeMoneyline(ml) {
  const n = Number(ml);
  if (!isFinite(n) || n === 0) return null;
  return n > 0 ? 100 / (n + 100) : (-n) / (-n + 100);
}

/* Extrae ERA numérica de un abridor si existe */
function eraDe(equipo) {
  const a = equipo && equipo.abridor;
  if (!a || a.era == null) return null;
  const m = String(a.era).match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
function cuentaLesionados(match, lado) {
  const arr = (match.lesionados && match.lesionados[lado]) || [];
  return arr.length;
}

/* ---- Motor principal ---- */
export function analizar(match) {
  const futbol = match.futbol != null ? match.futbol : !!(match.mercado && match.mercado.empate != null);
  const ligaId = match.ligaId;

  // 1) CUOTA real -> manda
  if (match._fuenteProb === 'cuota' && match.mercado) {
    return { ...match.mercado, confianza: 'alta', sinDatos: false,
      factores: { en: 'Based on live betting market odds.', es: 'Basado en las cuotas reales del mercado.' } };
  }
  // 2) PROYECCIÓN de ESPN -> manda
  if (match._fuenteProb === 'prediccion' && match.mercado) {
    return { ...match.mercado, confianza: 'media', sinDatos: false,
      factores: { en: "Based on ESPN's win projection.", es: 'Basado en la proyección de victoria de ESPN.' } };
  }

  // 3) MODELO propio (aditivo en log-odds)
  const factoresUsados = [];   // para explicar y medir confianza

  // 3a) Fuerza por récord total
  const Lall = fuerzaLogit(match.local.record, futbol, ligaId);
  const Vall = fuerzaLogit(match.visita.record, futbol, ligaId);
  // 3b) Forma situacional: local en casa, visita fuera
  const Lhome = fuerzaLogit(match.local.recordCasa, futbol, ligaId);
  const Vaway = fuerzaLogit(match.visita.recordFuera, futbol, ligaId);

  const sL = (Lhome.n ? W.overall * Lall.logit + W.situ * Lhome.logit : Lall.logit);
  const sV = (Vaway.n ? W.overall * Vall.logit + W.situ * Vaway.logit : Vall.logit);

  let L = 0;
  const muestra = Math.min(Lall.n, Vall.n);
  if (Lall.n || Vall.n) { L += (sL - sV) * W.fuerza; factoresUsados.push('record'); }

  // 3b-bis) Posición/ranking en la tabla: da variación aunque falte el récord.
  const posL = Number(match.local.posicion), posV = Number(match.visita.posicion);
  if (isFinite(posL) && isFinite(posV) && posL > 0 && posV > 0 && posL !== posV) {
    // Menor número = mejor. Diferencia de puestos -> ventaja (con tope).
    const posEdge = clamp((posV - posL) * 0.05, -0.6, 0.6);
    L += posEdge; factoresUsados.push('posicion');
  }

  // 3c) Ventaja de localía
  L += hfaLogit(ligaId, futbol);
  factoresUsados.push('local');

  // 3d) Duelo de abridores por ERA (MLB): menor ERA = mejor
  const eL = eraDe(match.local), eV = eraDe(match.visita);
  let eraEdge = 0;
  if (eL != null && eV != null) {
    eraEdge = clamp((eV - eL) * W.era, -W.eraCap, W.eraCap); // local mejora si su ERA es menor
    L += eraEdge; factoresUsados.push('abridor');
  }

  // 3e) Lesionados clave
  const iL = cuentaLesionados(match, 'local'), iV = cuentaLesionados(match, 'visita');
  let lesEdge = 0;
  if (iL || iV) {
    lesEdge = clamp((iV - iL) * W.lesion, -W.lesionCap, W.lesionCap);
    L += lesEdge; factoresUsados.push('lesion');
  }

  let pLocal = clamp(sig(L), W.clampLo, W.clampHi);

  // 4) Confianza según señales reales y tamaño de muestra
  const nSenales = factoresUsados.length;
  let confianza;
  if (muestra >= 20 || nSenales >= 4) confianza = 'alta';
  else if (muestra >= 8 || nSenales >= 3) confianza = 'media';
  else if (muestra >= 3 || factoresUsados.includes('posicion')) confianza = 'baja';
  else confianza = 'muy baja';

  // Con muy poca info, acerca (poco) al centro para no fingir certeza.
  if (confianza === 'muy baja') pLocal = 0.5 + (pLocal - 0.5) * 0.5;
  else if (confianza === 'baja') pLocal = 0.5 + (pLocal - 0.5) * 0.8;
  pLocal = clamp(pLocal, W.clampLo, W.clampHi);

  // 5) Salida
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
  out.sinDatos = (muestra === 0 && nSenales <= 1);
  out.factores = explicar(match, { pLocal, muestra, confianza, futbol, eraEdge, lesEdge, eL, eV, iL, iV, factoresUsados });
  return out;
}

/* Explicación escrita (bilingüe) de los factores que movieron el número */
function explicar(match, ctx) {
  const en = [], es = [];
  const favLocal = ctx.pLocal >= 0.5;
  const favAb = favLocal ? match.local.abrev : match.visita.abrev;

  if (ctx.factoresUsados.includes('record')) {
    en.push('Records and recent form weighed in.');
    es.push('Pesan el récord y la forma reciente.');
  }
  en.push(`Home edge to ${match.local.abrev}.`);
  es.push(`Ventaja de local para ${match.local.abrev}.`);

  if (ctx.eL != null && ctx.eV != null) {
    const mejor = ctx.eL < ctx.eV ? match.local.abrev : match.visita.abrev;
    en.push(`Starter matchup favors ${mejor} (${ctx.eL} vs ${ctx.eV} ERA).`);
    es.push(`El duelo de abridores favorece a ${mejor} (${ctx.eL} vs ${ctx.eV} ERA).`);
  }
  if (ctx.iL || ctx.iV) {
    if (ctx.iL !== ctx.iV) {
      const mas = ctx.iL > ctx.iV ? match.local.abrev : match.visita.abrev;
      en.push(`${mas} carries more key injuries.`);
      es.push(`${mas} arrastra más bajas clave.`);
    } else {
      en.push('Injuries roughly even.');
      es.push('Lesiones parejas.');
    }
  }
  if (ctx.confianza === 'muy baja') {
    en.push('Thin data: low confidence, kept nearer even.');
    es.push('Pocos datos: baja confianza, se acerca al centro.');
  } else if (ctx.confianza === 'baja') {
    en.push('Limited sample: moderate confidence.');
    es.push('Muestra limitada: confianza moderada.');
  }
  en.push(`Lean: ${favAb}.`);
  es.push(`Inclinación: ${favAb}.`);
  return { en: en.join(' '), es: es.join(' ') };
}
