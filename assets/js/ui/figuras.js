/* ============================================================
   FIGURAS — figuras doradas por deporte (sin fondo) para flanquear
   la tarjeta de comparación, y el fondo (rojo/azul) de cada lado.

   Reglas del dueño:
   - Dos figuras por deporte: una a la IZQUIERDA (local) y otra a la
     DERECHA (visita).
   - Todas normalizadas a la MISMA ALTURA (el ancho es libre); la del
     bateador es más ancha por su postura y así debe verse.
   - Son PNG sin fondo: NO se recrean con fondo.
   - Fondo del lado local = rojo; lado visita = azul (imágenes dadas).
   ============================================================ */

const BASE = 'assets/imagenes/jugadores';
const FONDO = 'assets/imagenes/fondos';

/* Deporte por liga */
function deporteDe(ligaId) {
  if (ligaId === 'mlb') return 'beisbol';
  if (ligaId === 'nba') return 'basket';
  if (['epl', 'laliga', 'ucl', 'seriea', 'bundes'].includes(ligaId)) return 'futbol';
  return 'futbol'; // NFL/NHL u otros: figura neutra de respaldo
}

/* Par de figuras (izquierda/derecha) por deporte.
   left  -> local  |  right -> visita */
const PAR = {
  beisbol: { left: `${BASE}/beisbol-bat.png`, right: `${BASE}/beisbol.png` },
  basket:  { left: `${BASE}/basket.png`,      right: `${BASE}/basket-std.png` },
  futbol:  { left: `${BASE}/futbol.png`,      right: `${BASE}/futbol-std.png` },
};

/* Devuelve la figura del lado pedido para un partido */
export function figuraLado(ligaId, lado /* 'local' | 'visita' */) {
  const dep = deporteDe(ligaId);
  const par = PAR[dep] || PAR.futbol;
  return lado === 'local' ? par.left : par.right;
}

/* Fondo del lado (rojo local / azul visita) */
export function fondoLado(lado) {
  return lado === 'local' ? `${FONDO}/rojo.jpg` : `${FONDO}/azul.jpg`;
}

/* Figura de respaldo para la tarjeta de ABRIDOR: pose de pie (no de bateo).
   Para béisbol usa la figura parada; nunca la de swing. */
export function figuraAbridor(ligaId) {
  const dep = deporteDe(ligaId);
  if (dep === 'beisbol') return `${BASE}/beisbol.png`;   // de pie, no swing
  if (dep === 'basket') return `${BASE}/basket-std.png`;
  return `${BASE}/futbol-std.png`;
}
