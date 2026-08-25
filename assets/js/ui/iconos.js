/* ============================================================
   ICONOS — SVG de línea, limpios y profesionales (sin emojis).
   Todos heredan el color con currentColor y miden 1em.
   ============================================================ */
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" ${extra}>${d}</svg>`;

export const IC = {
  salir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
  // Deportes
  beisbol: svg('<circle cx="12" cy="12" r="9"/><path d="M5 5c3 2 3 12 0 14M19 5c-3 2-3 12 0 14"/>'),
  basket:  svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.5 5.5c3 3 3 10 0 13M18.5 5.5c-3 3-3 10 0 13"/>'),
  futbolAmericano: svg('<path d="M5 5c6-2 12 0 14 2s2 8 0 12-8 4-14 2C3 15 3 9 5 5Z"/><path d="M9 9l6 6M12 8v8M8 12h8"/>'),
  futbol:  svg('<circle cx="12" cy="12" r="9"/><path d="M12 7l3.5 2.5-1.3 4h-4.4L8.5 9.5 12 7Z"/>'),
  diana:   svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'),

  // Navegación / UI
  buscar:  svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  vivo:    svg('<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13"/>'),
  estrella: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>'),
  perfil:  svg('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/>'),
  grafico: svg('<path d="M4 4v16h16"/><path d="M7 14l3-3 3 2 4-6"/>'),
  candado: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  atras:   svg('<path d="M15 5l-7 7 7 7"/>'),
  sol:     svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  luna:    svg('<path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5Z"/>'),
  compartir: svg('<path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M12 3v13M8 7l4-4 4 4"/>'),
  idioma:  svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>'),
};
