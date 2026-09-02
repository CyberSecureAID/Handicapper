/* ============================================================
   PLANES — definición central de los 3 niveles y precios.
   Un solo lugar para cambiar precios/funciones sin tocar la UI.
   ============================================================ */
export const PLANES = [
  {
    id: 'basic',
    nombre: 'Basic',
    destacado: false,
    mensual: 1.99,
    anual: 19.90,
    resumen: { en: 'Everything to explore the platform.', es: 'Todo para explorar la plataforma.' },
    incluye: [
      { en: 'All leagues & categories', es: 'Todas las ligas y categorías' },
      { en: 'Team & player stat comparison', es: 'Comparativa de equipos y jugadores' },
      { en: 'Honest win probability with confidence', es: 'Probabilidad de victoria honesta con confianza' },
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    destacado: true,
    etiqueta: { en: 'Most popular', es: 'Más popular' },
    mensual: 3.99,
    anual: 39.90,
    resumen: { en: 'For those who follow the games closely.', es: 'Para quien sigue los partidos de cerca.' },
    incluye: [
      { en: 'Everything in Basic', es: 'Todo lo de Basic' },
      { en: 'Pro picks: hits, goals, points & shots', es: 'Picks Pro: hits, goals, points y shots' },
      { en: 'Starter comparison & detailed match view', es: 'Comparativa de abridores y detalle del partido' },
      { en: 'Featured matches & season leaders', es: 'Partidos destacados y líderes de temporada' },
      { en: 'Preview a couple of analyst signals', es: 'Ver una o dos señales de analistas' },
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    destacado: false,
    mensual: 8.99,
    anual: 89.90,
    resumen: { en: 'The complete toolkit, maximum depth.', es: 'La herramienta completa, máxima profundidad.' },
    incluye: [
      { en: 'Everything in Pro', es: 'Todo lo de Pro' },
      { en: 'Full daily picks, no limits', es: 'Picks completos del día, sin límites' },
      { en: 'View every analyst signal', es: 'Ver todas las señales de analistas' },
      { en: 'Follow analysts to get their picks', es: 'Sigue analistas y recibe sus picks' },
      { en: 'Signals feed in your profile', es: 'Feed de señales en tu perfil' },
      { en: 'Push notifications & alerts', es: 'Notificaciones push y avisos' },
      { en: 'Advanced indicators & full depth', es: 'Indicadores avanzados y profundidad total' },
    ],
  },
];

export function planPorId(id) { return PLANES.find(p => p.id === id) || null; }
