/* ============================================================
   relevancia.js — puntua que tan "seguido / estelar" es un partido,
   para elegir y ordenar los que se muestran. UNA responsabilidad:
   dar un numero de relevancia y ordenar una lista de matches.

   Senal PRINCIPAL = datos reales del partido (calidad de los equipos
   segun la tabla: % de victorias y posicion). Senal SECUNDARIA = un
   empujon pequeno para franquicias de mercado grande. Un equipo que no
   este en la lista de abajo puntua 0 por ese concepto (neutro), asi el
   orden se sostiene por los datos reales aunque la lista no lo incluya.

   No cambia QUE partidos existen, solo EN QUE ORDEN se muestran.
   ============================================================ */

/* Franquicias de mercado grande / mas seguidas, por abreviatura de ESPN.
   Empujon fijo y pequeno (ver PESO_MARCA). Lista editable; si una
   abreviatura no coincide, simplemente no suma (no rompe nada). */
const MARCA = {
  nba:    ['LAL', 'GSW', 'BOS', 'NYK', 'MIA', 'CHI', 'PHI', 'DAL', 'LAC', 'PHX', 'MIL', 'DEN'],
  nfl:    ['DAL', 'KC',  'SF',  'GB',  'PHI', 'BUF', 'PIT', 'NE',  'NYG', 'LAR', 'CIN', 'BAL'],
  nhl:    ['TOR', 'MTL', 'BOS', 'NYR', 'CHI', 'EDM', 'DET', 'PIT', 'COL', 'VGK'],
  mlb:    ['NYY', 'LAD', 'BOS', 'CHC', 'SF',  'NYM', 'STL', 'PHI', 'HOU', 'ATL'],
  // Futbol: clubes grandes. Las abreviaturas de ESPN varian por competicion;
  // se incluyen las mas comunes. Una que no coincida solo no suma.
  epl:    ['MNC', 'MUN', 'LIV', 'ARS', 'CHE', 'TOT'],
  laliga: ['RMA', 'BAR', 'ATM'],
  seriea: ['JUV', 'INT', 'MIL', 'NAP', 'ROM'],
  bundes: ['BAY', 'BVB', 'RBL'],
  ucl:    ['RMA', 'BAR', 'MNC', 'LIV', 'BAY', 'JUV', 'PSG', 'INT', 'MUN', 'ARS'],
};

const PESO_WINPCT = 10;   // winPct (0..1) aporta hasta 10
const PESO_PUESTO = 0.6;  // cada puesto por encima del 16 aporta 0.6 (lider ~ +9)
const PESO_AMBOS  = 0.5;  // premia que AMBOS equipos sean buenos, no solo uno
const PESO_MARCA  = 3;    // empujon por franquicia de mercado grande

function calidadEquipo(eq) {
  if (!eq) return 0;
  let q = 0;
  const wp = Number(eq.winPct);
  if (isFinite(wp)) q += wp * PESO_WINPCT;
  const pos = Number(eq.posicion);
  if (isFinite(pos) && pos > 0) q += Math.max(0, 16 - pos) * PESO_PUESTO;
  return q;
}

function marcaEquipo(ligaId, eq) {
  const tabla = MARCA[ligaId];
  if (!tabla || !eq) return 0;
  const ab = String(eq.abrev || '').toUpperCase();
  return ab && tabla.includes(ab) ? PESO_MARCA : 0;
}

/* Puntuacion de relevancia de un partido ya normalizado (objeto match). */
export function puntuar(m) {
  if (!m) return 0;
  const qL = calidadEquipo(m.local);
  const qV = calidadEquipo(m.visita);
  let s = qL + qV;                       // dos equipos buenos = partidazo
  s += Math.min(qL, qV) * PESO_AMBOS;    // que ambos sean buenos pesa mas que uno solo
  s += marcaEquipo(m.ligaId, m.local) + marcaEquipo(m.ligaId, m.visita);
  return s;
}

/* Orden final: primero por estado (vivo > proximo > final, como antes),
   y DENTRO de cada grupo por relevancia descendente. */
const ORDEN_ESTADO = { vivo: 0, proximo: 1, final: 2 };
export function ordenar(lista) {
  return (lista || []).slice().sort((a, b) => {
    const e = (ORDEN_ESTADO[a?.estado] ?? 9) - (ORDEN_ESTADO[b?.estado] ?? 9);
    if (e !== 0) return e;
    return puntuar(b) - puntuar(a);
  });
}
