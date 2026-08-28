/* ============================================================
   NÚCLEO ANALÍTICO COMPARTIDO — "el cerebro"
   ------------------------------------------------------------
   Un solo módulo, sin dependencias ni red, que TODOS los motores
   (motor de comparación, hits, goles, puntos, tiros) consultan para
   razonar mejor. No reemplaza a los motores: les presta métodos
   cuantitativos serios que hoy les faltan.

   Contiene:
     · RNG sembrable  -> Monte Carlo REPRODUCIBLE (mismo partido = mismo número).
     · Bayes empírico (shrinkage) -> encoge tasas de muestra chica hacia un prior.
     · log5           -> combinación canónica atacante × defensa × liga (matchups).
     · Distribuciones -> Binomial, Poisson, Normal (con Φ).
     · Forma ponderada por recencia (decaimiento exponencial, media-vida).
     · Monte Carlo    -> propaga la incertidumbre de las entradas y devuelve
                          media + intervalo de confianza (no un número seco).
     · Ensamble       -> combina submodelos en log-odds y mide su ACUERDO.
     · Calibración    -> templa extremos según la incertidumbre (honestidad).
     · Confianza      -> etiqueta a partir de muestra + acuerdo + ancho del IC.

   Todo es determinista y explicable: nada de cajas negras.
   ============================================================ */

/* ---------- utilidades base ---------- */
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sig = (x) => 1 / (1 + Math.exp(-x));
export const logit = (p) => Math.log(clamp(p, 1e-9, 1 - 1e-9) / (1 - clamp(p, 1e-9, 1 - 1e-9)));
export const media = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

/* ---------- RNG sembrable (mulberry32) ----------
   Monte Carlo reproducible: el mismo partido siempre produce el mismo
   resultado (nada de números que parpadean al recargar). */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function semilla(str) {
  let h = 2166136261; const s = String(str || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Normal(0,1) a partir de un rand() uniforme (Box–Muller). */
export function gauss(r) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v);
}

/* ---------- Bayes empírico: shrinkage hacia un prior ----------
   Encoge una tasa observada (exitos/intentos) hacia priorP. k = "fuerza"
   del prior en intentos equivalentes. Poca muestra -> cerca del prior;
   mucha muestra -> cerca de lo observado. Esto elimina el ruido de las
   tasas calculadas con 3-4 partidos (el "sinsentido" de muestras chicas). */
export function regresar(exitos, intentos, priorP, k = 100) {
  if (!(intentos > 0)) return clamp(priorP, 1e-4, 1 - 1e-4);
  return clamp((exitos + priorP * k) / (intentos + k), 1e-4, 1 - 1e-4);
}
/* Igual, pero cuando ya tienes la TASA (no los conteos). n = tamaño de muestra. */
export function regresarTasa(tasa, n, priorP, k = 100) {
  if (!(n > 0)) return clamp(priorP, 1e-4, 1 - 1e-4);
  return clamp((tasa * n + priorP * k) / (n + k), 1e-4, 1 - 1e-4);
}

/* ---------- log5 (Bill James) ----------
   Probabilidad de "éxito" cuando un atacante con tasa pA se enfrenta a una
   defensa que permite pB, dado el promedio de liga pL. Es el método correcto
   para matchups (p. ej. AVG del bateador vs AVG permitido por el pitcher). */
export function log5(pA, pB, pL) {
  pA = clamp(pA, 1e-4, 1 - 1e-4); pB = clamp(pB, 1e-4, 1 - 1e-4); pL = clamp(pL, 1e-4, 1 - 1e-4);
  const num = (pA * pB) / pL;
  const den = num + ((1 - pA) * (1 - pB)) / (1 - pL);
  return clamp(num / den, 1e-4, 1 - 1e-4);
}

/* ---------- distribuciones ---------- */
export const pBinomGe1 = (p, n) => clamp(1 - Math.pow(1 - clamp(p, 0, 1), Math.max(0, n)), 0, 1); // P(≥1 en n intentos)
export function poissonCdf(k, l) {           // P(X ≤ k) con X~Poisson(l)
  if (l <= 0) return 1;
  let e = Math.exp(-l), s = e, t = e;
  for (let i = 1; i <= k; i++) { t *= l / i; s += t; }
  return clamp(s, 0, 1);
}
export const pPoissonGe = (k, l) => (k <= 0 ? 1 : clamp(1 - poissonCdf(k - 1, l), 0, 1)); // P(X ≥ k)
export function Phi(z) {                      // Normal estándar acumulada (Abramowitz–Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}
export const pNormalGe = (mu, sd, x) => (sd > 0 ? clamp(1 - Phi((x - mu) / sd), 0, 1) : (mu >= x ? 1 : 0)); // P(X ≥ x)

/* ---------- forma ponderada por recencia ----------
   Media con decaimiento exponencial: el partido más reciente pesa más.
   vals: array ordenado del MÁS reciente al más antiguo. halfLife = nº de
   partidos tras los cuales el peso cae a la mitad. */
export function formaPonderada(vals, halfLife = 5) {
  if (!vals || !vals.length) return null;
  const lam = Math.log(2) / Math.max(0.5, halfLife);
  let sw = 0, s = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = Number(vals[i]); if (!isFinite(v)) continue;
    const w = Math.exp(-lam * i); s += w * v; sw += w;
  }
  return sw ? s / sw : null;
}

/* ---------- Monte Carlo (reproducible) ----------
   Corre `trial(rand)` n veces y agrega la muestra. Devuelve media, sd e
   intervalos de confianza empíricos (percentiles). trial recibe un rand()
   uniforme y devuelve un número (p. ej. una probabilidad o un conteo). */
export function montecarlo(seedStr, n, trial) {
  const r = rng(semilla(seedStr));
  const xs = new Array(n);
  for (let i = 0; i < n; i++) xs[i] = trial(r);
  xs.sort((a, b) => a - b);
  const q = (p) => xs[clamp(Math.floor(p * (n - 1)), 0, n - 1)];
  const m = media(xs);
  let v = 0; for (const x of xs) v += (x - m) * (x - m);
  return { media: m, p: m, sd: Math.sqrt(v / n), ic80: [q(0.10), q(0.90)], ic50: [q(0.25), q(0.75)], mediana: q(0.5), muestras: n };
}

/* ---------- ensamble de submodelos ----------
   Combina varias probabilidades (cada una con su peso) promediando en
   LOG-ODDS, y reporta el ACUERDO entre ellas (1 = todas coinciden). */
export function ensamble(items) {
  let sw = 0, s = 0; const ps = [];
  (items || []).forEach(it => {
    if (it && it.p != null && isFinite(it.p)) {
      const w = it.w == null ? 1 : it.w;
      s += w * logit(it.p); sw += w; ps.push(clamp(it.p, 1e-4, 1 - 1e-4));
    }
  });
  if (!sw) return null;
  const p = sig(s / sw);
  const mu = media(ps);
  let vv = 0; ps.forEach(x => vv += (x - mu) * (x - mu));
  const disp = Math.sqrt(vv / ps.length);
  const acuerdo = clamp(1 - disp / 0.25, 0, 1);   // 0.25 de dispersión ≈ desacuerdo total
  return { p, acuerdo, n: ps.length, dispersion: disp };
}

/* ---------- calibración ----------
   Acerca p hacia un prior según `factor` ∈ [0,1] (1 = intacto, 0 = colapsa
   al prior). Se usa para templar extremos cuando la incertidumbre es alta. */
export function calibrar(p, prior = 0.5, factor = 1) {
  return sig(logit(prior) + clamp(factor, 0, 1) * (logit(p) - logit(prior)));
}

/* ---------- confianza ----------
   Etiqueta a partir del tamaño de muestra, el acuerdo del ensamble y el
   ancho del intervalo de confianza. */
export function confianza({ n = 0, acuerdo = null, anchoIC = null } = {}) {
  let s = 0;
  if (n >= 200) s += 2; else if (n >= 50) s += 1.4; else if (n >= 15) s += 0.8; else if (n >= 5) s += 0.35;
  if (acuerdo != null) { if (acuerdo >= 0.8) s += 1.2; else if (acuerdo >= 0.6) s += 0.7; else if (acuerdo >= 0.4) s += 0.3; }
  if (anchoIC != null) { if (anchoIC <= 0.10) s += 1; else if (anchoIC <= 0.20) s += 0.5; else if (anchoIC >= 0.35) s -= 0.5; }
  if (s >= 3) return 'alta';
  if (s >= 1.8) return 'media';
  if (s >= 0.8) return 'baja';
  return 'muy baja';
}

/* Versión del núcleo (para depurar/mostrar). */
export const NUCLEO_VER = '1.0';
