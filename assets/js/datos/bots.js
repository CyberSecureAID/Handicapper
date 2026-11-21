/* ============================================================
   ANALISTAS BOT — analistas ficticios que trabajan para la casa.
   No tienen cuenta en Firebase: viven aquí. Aparecen como analistas
   registrados; sus señales se generan solas (Fase 2). Al seguirlos,
   los $2/mes van completos para la plataforma (no hay reparto).
   La foto es fija (un id del catálogo de analistas), no se cambia.
   ============================================================ */

export const BOTS = [
  {
    uid: 'bot-alejandro',
    nombre: 'Alejandro Ruiz',
    firma: 'Alejandro R.',
    deporte: 'futbol',
    foto: 's',                       // assets/imagenes/analistas/s.webp
    email: 'alejandro@bot.local',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 328, likes: 96, dislikes: 11, prestigio: 20, desde: '2026-09-02',
    estilo: { color: '#4a90ff' },
  },
  {
    uid: 'bot-miguel',
    nombre: 'Miguel Santos',
    firma: 'Miguel S.',
    deporte: 'beisbol',
    foto: 't',                       // assets/imagenes/analistas/t.webp
    email: 'miguel@bot.local',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 183, likes: 61, dislikes: 7, prestigio: 19, desde: '2026-09-02',
    estilo: { color: '#e23b3f' },
  },
  {
    uid: 'bot-daniel',
    nombre: 'Daniel Vega',
    firma: 'Daniel V.',
    deporte: 'basket',
    foto: 'r',                       // assets/imagenes/analistas/r.webp
    email: 'daniel@bot.local',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 254, likes: 78, dislikes: 9, prestigio: 16, desde: '2026-09-02',
    estilo: { color: '#8a5cf6' },
  },
  {
    uid: 'bot-ivan',
    nombre: 'Iván Torres',
    firma: 'Iván T.',
    deporte: 'hockey',
    foto: 'q',                       // assets/imagenes/analistas/q.webp
    email: 'ivan@bot.local',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 209, likes: 64, dislikes: 8, prestigio: 14, desde: '2026-09-02',
    estilo: { color: '#22b8c0' },
  },
  {
    uid: 'bot-ricardo',
    nombre: 'Ricardo Méndez',
    firma: 'Ricardo M.',
    deporte: 'americano',
    foto: 'p',                       // assets/imagenes/analistas/p.webp
    email: 'ricardo@bot.local',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 176, likes: 52, dislikes: 6, prestigio: 12, desde: '2026-09-02',
    estilo: { color: '#e08a2a' },
  },
];

/* ids de las fotos que ocupan los bots (para bloquearlas en el selector). */
export const FOTOS_BOT = BOTS.map(b => b.foto).filter(Boolean);

export function esBot(uid) { return BOTS.some(b => b.uid === uid); }
export function botPorUid(uid) { return BOTS.find(b => b.uid === uid) || null; }

/* Prestigio REAL a mostrar = base del bot (bots.js) + ajuste del admin (Firestore 'prestigioAjuste').
   Ignora por completo el campo viejo 'prestigio' de Firestore (que puede tener basura de bugs previos).
   Para usuarios que NO son bots, la base es 0 -> muestran solo su ajuste. Rango libre -inf..+inf. */
export function baseDe(uid) { const b = botPorUid(uid); return b ? (Number(b.prestigio) || 0) : 0; }
export function prestigioReal(a) {
  if (!a) return 0;
  return baseDe(a.uid) + (Number(a.prestigioAjuste) || 0) + (Number(a.prestigioAuto) || 0);
}

/* Prestigio MOSTRADO = real + un movimiento determinista por semana (sube/baja,
   con sesgo positivo porque son analistas de la casa), para que no se vea
   congelado. Es una simulacion ESTABLE: no cambia entre recargas dentro de la
   misma semana. El prestigio por resolucion real de predicciones vive en
   prestigio.js; mostrarlo en vivo a TODOS los usuarios necesitaria un backend
   (hoy las reglas de Firestore solo dejan leerlo al admin). */
function _hashP(s) { let h = 2166136261; for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function driftPrestigio(a) {
  const bot = a && botPorUid(a.uid); if (!bot) return 0;
  const desde = (a && a.desde) || bot.desde; if (!desde) return 0;
  const semanas = Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / (7 * 864e5)));
  let d = 0;
  for (let w = 1; w <= semanas; w++) {
    const r = _hashP(a.uid + ':' + w) % 5;   // 0,1,2 -> +1 ; 3 -> 0 ; 4 -> -1  (sesgo positivo)
    d += r <= 2 ? 1 : (r === 3 ? 0 : -1);
  }
  return d;
}
export function prestigioMostrado(a) { return prestigioReal(a) + driftPrestigio(a); }

/* Seguidores mostrados = base figurativa + 1/semana + ajuste admin + seguidores REALES.
   Funciona con un bot (tiene 'followers'/'desde') o con un analista real (solo ajuste + reales). */
export function seguidoresBot(a, real = 0) {
  const base = (a && a.followers) || 0;
  const extra = (a && a.followersExtra) || 0;
  let semanas = 0;
  if (a && a.desde) semanas = Math.max(0, Math.floor((Date.now() - new Date(a.desde).getTime()) / (7 * 864e5)));
  return base + semanas + extra + (real || 0);
}
export function likesDe(a) { return ((a && a.likes) || 0) + ((a && a.likesExtra) || 0); }
export function dislikesDe(a) { return ((a && a.dislikes) || 0) + ((a && a.dislikesExtra) || 0); }
