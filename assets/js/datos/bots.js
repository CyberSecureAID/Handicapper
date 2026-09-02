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
    email: 'alejandro@sportsexpectations.io',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 328, likes: 96, dislikes: 11, desde: '2026-09-02',
    estilo: { color: '#4a90ff' },
  },
  {
    uid: 'bot-miguel',
    nombre: 'Miguel Santos',
    firma: 'Miguel S.',
    deporte: 'beisbol',
    foto: 't',                       // assets/imagenes/analistas/t.webp
    email: 'miguel@sportsexpectations.io',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 183, likes: 61, dislikes: 7, desde: '2026-09-02',
    estilo: { color: '#e23b3f' },
  },
  {
    uid: 'bot-daniel',
    nombre: 'Daniel Vega',
    firma: 'Daniel V.',
    deporte: 'basket',
    foto: 'r',                       // assets/imagenes/analistas/r.webp
    email: 'daniel@sportsexpectations.io',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 254, likes: 78, dislikes: 9, desde: '2026-09-02',
    estilo: { color: '#8a5cf6' },
  },
  {
    uid: 'bot-ivan',
    nombre: 'Iván Torres',
    firma: 'Iván T.',
    deporte: 'hockey',
    foto: 'q',                       // assets/imagenes/analistas/q.webp
    email: 'ivan@sportsexpectations.io',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 209, likes: 64, dislikes: 8, desde: '2026-09-02',
    estilo: { color: '#22b8c0' },
  },
  {
    uid: 'bot-ricardo',
    nombre: 'Ricardo Méndez',
    firma: 'Ricardo M.',
    deporte: 'americano',
    foto: 'p',                       // assets/imagenes/analistas/p.webp
    email: 'ricardo@sportsexpectations.io',
    activo: true,
    configurado: true,
    esBot: true,
    fuente: 'espn',
    followers: 176, likes: 52, dislikes: 6, desde: '2026-09-02',
    estilo: { color: '#e08a2a' },
  },
];

/* ids de las fotos que ocupan los bots (para bloquearlas en el selector). */
export const FOTOS_BOT = BOTS.map(b => b.foto).filter(Boolean);

export function esBot(uid) { return BOTS.some(b => b.uid === uid); }
export function botPorUid(uid) { return BOTS.find(b => b.uid === uid) || null; }

/* Seguidores mostrados de un bot = base figurativa + 1 por semana + seguidores REALES. */
export function seguidoresBot(bot, real = 0) {
  if (!bot) return real || 0;
  const semanas = Math.max(0, Math.floor((Date.now() - new Date(bot.desde || '2026-09-02').getTime()) / (7 * 864e5)));
  return (bot.followers || 0) + semanas + (real || 0);
}
