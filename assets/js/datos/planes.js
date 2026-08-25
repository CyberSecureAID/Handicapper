/* ============================================================
   PLANES — definición central de los 3 niveles y precios.
   Un solo lugar para cambiar precios/funciones sin tocar la UI.
   Precio anual = 10 meses (2 meses gratis, ~17% de ahorro).
   ============================================================ */
export const PLANES = [
  {
    id: 'basic',
    nombre: 'Basic',
    destacado: false,
    mensual: 1.99,
    anual: 19.90,            // 10 x 1.99
    resumen: { en: 'Everything to explore the platform.', es: 'Todo para explorar la plataforma.' },
    incluye: [
      { en: 'Stats & data for all matches', es: 'Estadísticas y datos de todos los partidos' },
      { en: 'Honest probability + confidence', es: 'Probabilidad honesta + confianza' },
      { en: 'Team comparison & key players', es: 'Comparativa y jugadores clave' },
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
      { en: 'Push alerts (on by default)', es: 'Alertas push (activas por defecto)' },
      { en: 'Analyst verdicts & reports', es: 'Veredictos y reportes del analista' },
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
      { en: 'Advanced analysis & indicators', es: 'Análisis e indicadores avanzados' },
      { en: 'Configurable alerts', es: 'Alertas configurables' },
      { en: 'Full data depth & exclusive tools', es: 'Profundidad total y herramientas exclusivas' },
    ],
  },
];

export function planPorId(id) { return PLANES.find(p => p.id === id) || null; }
