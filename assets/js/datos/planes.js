/* ============================================================
   PLANES — definición central de los 3 niveles y precios.
   Un solo lugar para cambiar precios/funciones sin tocar la UI.
   ============================================================ */
export const PLANES = [
  {
    id: 'basic',
    nombre: 'Basic',
    destacado: false,
    acceso: { en: 'Lobby access', es: 'Acceso al lobby', nivel: 'basic' },
    mensual: 1.99,
    anual: 19.90,
    resumen: { en: 'Everything to explore the platform.', es: 'Todo para explorar la plataforma.' },
    incluye: [
      { en: 'All leagues & categories', es: 'Todas las ligas y categorías' },
      { en: 'Team & player stat comparison', es: 'Comparativa de equipos y jugadores' },
      { en: 'Honest win probabilities', es: 'Probabilidades honestas de victoria' },
      { en: 'Signals preview — receive from $2', es: 'Vista previa de señales — recibe desde $2' },
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    destacado: true,
    etiqueta: { en: 'Most popular', es: 'Más popular' },
    acceso: { en: 'Pro access', es: 'Acceso Pro', nivel: 'pro' },
    mensual: 3.99,
    anual: 39.90,
    resumen: { en: 'For those who follow the games closely.', es: 'Para quien sigue los partidos de cerca.' },
    incluye: [
      { en: 'Everything in Basic', es: 'Todo lo de Basic' },
      { en: 'Pro picks: hits, goals, points & shots', es: 'Picks Pro: hits, goals, points y shots' },
      { en: 'Limited daily selection', es: 'Selección diaria limitada' },
      { en: 'Signals from featured analysts', es: 'Señales de analistas destacados' },
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    destacado: false,
    acceso: { en: 'Premium access', es: 'Acceso Premium', nivel: 'premium' },
    mensual: 8.99,
    anual: 89.90,
    resumen: { en: 'The complete toolkit, maximum depth.', es: 'La herramienta completa, máxima profundidad.' },
    incluye: [
      { en: 'Everything in Pro', es: 'Todo lo de Pro' },
      { en: 'Full daily picks — no limits', es: 'Picks completos del día — sin límites' },
      { en: 'All analyst signals', es: 'Todas las señales de analistas' },
      { en: 'Follow analysts + notifications', es: 'Sigue analistas + notificaciones' },
    ],
  },
];

export function planPorId(id) { return PLANES.find(p => p.id === id) || null; }
