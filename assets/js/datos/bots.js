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
    fuente: 'apifootball',           // Fase 2: de dónde saca sus señales
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
    fuente: 'apifootball',
    estilo: { color: '#e23b3f' },
  },
];

/* ids de las fotos que ocupan los bots (para bloquearlas en el selector). */
export const FOTOS_BOT = BOTS.map(b => b.foto).filter(Boolean);

export function esBot(uid) { return BOTS.some(b => b.uid === uid); }
export function botPorUid(uid) { return BOTS.find(b => b.uid === uid) || null; }
