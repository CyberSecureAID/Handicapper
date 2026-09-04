/* ============================================================
   PLANES — definición central de los 3 niveles y precios.
   Un solo lugar para cambiar precios/funciones sin tocar la UI.
   Redacción auditada: fiel a lo que ofrece la plataforma, sin
   prometer resultados y sin lenguaje de apuestas.
   ============================================================ */
export const PLANES = [
  {
    id: 'basic',
    nombre: 'Basic',
    destacado: false,
    mensual: 1.99,
    anual: 19.90,
    resumen: { en: 'General access to the platform.', es: 'Acceso general a la plataforma.' },
    incluye: [
      { en: 'All leagues & categories', es: 'Todas las ligas y categorías' },
      { en: 'Team & player comparison with advanced stat windows', es: 'Comparación de equipos y jugadores con ventanas de estadísticas avanzadas' },
      { en: 'Option to hire specialized analyst signal services', es: 'Posibilidad de contratar servicios de señales de analistas especializados' },
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    destacado: true,
    etiqueta: { en: 'Most popular', es: 'Más popular' },
    mensual: 3.99,
    anual: 39.90,
    resumen: { en: 'Intermediate access, a step deeper.', es: 'Acceso intermedio, un paso más a fondo.' },
    incluye: [
      { en: 'Everything in Basic', es: 'Todo lo de Basic' },
      { en: 'Limited access to Hits, Goals, Points & Shots', es: 'Acceso limitado a Hits, Goals, Points y Shots' },
      { en: 'Limited access to Fútbol Rubio', es: 'Acceso limitado a Fútbol Rubio' },
      { en: 'A reduced selection of advanced content', es: 'Una selección reducida del contenido avanzado' },
      { en: 'Limited access to specialized analyst signals', es: 'Acceso limitado a señales de analistas especializados' },
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    destacado: false,
    mensual: 8.99,
    anual: 89.90,
    resumen: { en: 'The most complete access on the platform.', es: 'El acceso más completo de la plataforma.' },
    incluye: [
      { en: 'Everything in Pro', es: 'Todo lo de Pro' },
      { en: 'Full access to Hits, Goals, Points & Shots', es: 'Acceso completo a Hits, Goals, Points y Shots' },
      { en: 'Full Fútbol Rubio', es: 'Fútbol Rubio completo' },
      { en: 'Advanced comparisons & all stat categories', es: 'Comparaciones avanzadas y todas las categorías estadísticas' },
      { en: 'Full daily shared picks', es: 'Picks compartidos del día completos' },
      { en: 'Broad access to analyst signals (about 50% of what is available)', es: 'Acceso amplio a señales de analistas (aprox. el 50% de lo disponible)' },
      { en: 'Push notifications & alerts', es: 'Notificaciones push y avisos' },
      { en: 'Profile photo to share your stats showing they come from you', es: 'Foto de perfil para compartir tus estadísticas mostrando que provienen de ti' },
      { en: 'Option to hire additional analyst services for higher access', es: 'Posibilidad de contratar servicios adicionales de analistas para mayor acceso' },
    ],
  },
];

export function planPorId(id) { return PLANES.find(p => p.id === id) || null; }
