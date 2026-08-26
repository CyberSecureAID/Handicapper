/* ============================================================
   FOTOS-JUGADORES — resolución dinámica de la foto de un jugador
   en PNG transparente (recorte), 100% gratis y sin backend.

   ESTRATEGIA DE FUENTES (todas gratuitas, reutilizables):
   1) headshot que ya viene en los datos de ESPN (summary/roster):
      `athlete.headshot.href` -> PNG recortado sobre fondo transparente.
   2) Si no viene, se CONSTRUYE la URL del CDN público de ESPN por
      ID de atleta y deporte:
        https://a.espncdn.com/i/headshots/{bucket}/players/full/{id}.png
      Son recortes oficiales con transparencia, servidos por CDN.
   3) Fallback final: la figura dorada del deporte (figuras.js) — así
      la tarjeta NUNCA queda vacía aunque un jugador no tenga foto.

   No usa APIs de pago ni claves. Funciona por ID (preferido) o por
   headshot ya presente en el dato del jugador.
   ============================================================ */

/* liga interna -> bucket de headshots de ESPN */
const BUCKET = {
  mlb: 'mlb', nba: 'nba', nfl: 'nfl', nhl: 'nhl',
  epl: 'soccer', laliga: 'soccer', ucl: 'soccer', seriea: 'soccer', bundes: 'soccer',
};

/* Normaliza distintas formas del headshot que devuelve ESPN */
function hrefDeHeadshot(h) {
  if (!h) return null;
  if (typeof h === 'string') return h;
  return h.href || h.url || null;
}

/**
 * Devuelve la mejor URL de foto transparente disponible para un jugador.
 * @param {Object} jug   objeto jugador { id, foto|headshot, ... }
 * @param {String} ligaId  'mlb' | 'nba' | ... (para construir la URL del CDN)
 * @returns {String|null}
 */
export function fotoJugador(jug, ligaId) {
  if (!jug) return null;
  const directa = hrefDeHeadshot(jug.foto || jug.headshot);
  if (directa) return directa;
  const id = jug.id || jug.playerId || jug.athleteId;
  if (!id) return null;
  const bucket = BUCKET[ligaId] || 'soccer';
  return `https://a.espncdn.com/i/headshots/${bucket}/players/full/${id}.png`;
}

/* Onerror inline para <img>: si la foto falla, muestra la figura dorada
   de respaldo (data-fallback) y se oculta la foto. */
export function imgFotoJugador(jug, ligaId, clase = '') {
  const url = fotoJugador(jug, ligaId);
  if (!url) return '';
  const safe = String(url).replace(/"/g, '&quot;');
  return `<img class="fj-foto ${clase}" src="${safe}" alt="" loading="lazy"
    onerror="this.closest('.fj-wrap')?.classList.add('sin-foto');this.remove();">`;
}
