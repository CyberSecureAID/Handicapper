/* ============================================================
   FOTOS-JUGADORES — foto oficial del jugador ACTUAL, gratis, por ID.

   RUTAS OFICIALES GRATUITAS (todas por ID, sin clave ni backend):
   - MLB : https://img.mlbstatic.com/mlb-photos/image/upload/
           d_people:generic:headshot:67:current.png/w_360,q_auto:best/
           v1/people/{mlbId}/headshot/67/current
           (ID vía MLB Stats API: https://statsapi.mlb.com/api/v1/…)
   - NBA : https://cdn.nba.com/headshots/nba/latest/1040x760/{nbaId}.png
   - NHL : https://assets.nhle.com/mugs/nhl/{temporada}/{EQ}/{nhlId}.png
   - NFL / fútbol / genérico:
           https://a.espncdn.com/i/headshots/{deporte}/players/full/{espnId}.png

   Como la app ya trae de ESPN el `headshot` y el `id` de cada atleta
   ACTUAL del partido, ese es el respaldo universal para todas las ligas.
   Para MLB usamos además la ruta oficial (mejor calidad) cuando hay mlbId.
   ============================================================ */

const ESPN_BUCKET = {
  mlb: 'mlb', nba: 'nba', nfl: 'nfl', nhl: 'nhl',
  epl: 'soccer', laliga: 'soccer', ucl: 'soccer', seriea: 'soccer', bundes: 'soccer',
};

function href(h) {
  if (!h) return null;
  if (typeof h === 'string') return h;
  return h.href || h.url || null;
}

/* URL oficial de MLB por ID de MLB Stats API */
export function fotoMLB(mlbId, w = 360) {
  if (!mlbId) return null;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${w},q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}
/* URL oficial de NBA por ID de stats.nba.com */
export function fotoNBA(nbaId) {
  return nbaId ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${nbaId}.png` : null;
}
/* URL de ESPN por deporte + ID de ESPN (respaldo universal) */
export function fotoESPN(ligaId, espnId) {
  if (!espnId) return null;
  const b = ESPN_BUCKET[ligaId] || 'soccer';
  return `https://a.espncdn.com/i/headshots/${b}/players/full/${espnId}.png`;
}

/* Mejor foto disponible para un jugador (prioriza lo oficial). */
export function fotoJugador(jug, ligaId) {
  if (!jug) return null;
  if (jug.fotoOficial) return jug.fotoOficial;           // ya resuelta (p.ej. MLB oficial)
  if (ligaId === 'mlb' && jug.mlbId) return fotoMLB(jug.mlbId);
  if (ligaId === 'nba' && jug.nbaId) return fotoNBA(jug.nbaId);
  const directa = href(jug.foto || jug.headshot);        // headshot que trae ESPN
  if (directa) return directa;
  return fotoESPN(ligaId, jug.id || jug.playerId || jug.athleteId);
}

/* Lista de URLs de respaldo (para onerror en cadena) */
export function cadenaFotos(jug, ligaId) {
  const urls = [];
  const push = (u) => { if (u && !urls.includes(u)) urls.push(u); };
  push(jug.fotoOficial);
  if (ligaId === 'mlb') push(fotoMLB(jug.mlbId));
  if (ligaId === 'nba') push(fotoNBA(jug.nbaId));
  push(href(jug.foto || jug.headshot));
  push(fotoESPN(ligaId, jug.id));
  return urls;
}
