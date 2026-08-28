/* ============================================================
   ESTILO DE SEÑAL (Fase 5) — personalización LIMITADA y segura.
   El analista solo puede elegir de opciones curadas: color (paleta fija),
   intensidad (3 niveles acotados) y un emblema (lista cerrada).
   No hay tamaños libres ni colores arbitrarios -> imposible romper el
   diseño, agrandar botones, ocultar información o dañar la estética.
   estiloSeguro() actúa de "portero": cualquier valor fuera de la lista
   se reemplaza por el seguro por defecto.
   ============================================================ */

export const PALETA = [
  { id: 'gold',   hex: '#e8b84b', nombre: { en: 'Gold', es: 'Oro' } },
  { id: 'blue',   hex: '#38a9f0', nombre: { en: 'Blue', es: 'Azul' } },
  { id: 'red',    hex: '#f0535a', nombre: { en: 'Red', es: 'Rojo' } },
  { id: 'green',  hex: '#2fd07f', nombre: { en: 'Green', es: 'Verde' } },
  { id: 'purple', hex: '#a678f0', nombre: { en: 'Purple', es: 'Morado' } },
  { id: 'teal',   hex: '#2fd0c0', nombre: { en: 'Teal', es: 'Turquesa' } },
  { id: 'orange', hex: '#f5993d', nombre: { en: 'Orange', es: 'Naranja' } },
  { id: 'pink',   hex: '#f070b0', nombre: { en: 'Pink', es: 'Rosa' } },
];

export const INTENSIDADES = ['subtle', 'normal', 'strong'];

export const EMBLEMAS = {
  none:   '',
  flame:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 4-2 6-1.5 3 .5 5 2 5 1.7 0 3-1.3 3-3 0-.7-.2-1.3-.5-1.8C18 11 19 13.5 19 15a7 7 0 11-14 0c0-3 2-5 3.5-7C10 6 11 4 12 2z"/></svg>',
  gem:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12l3 5-9 13L3 8l3-5zm.6 5L12 18l5.4-10H6.6z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z"/></svg>',
  star:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8L12 2z"/></svg>',
  bolt:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
};
export const EMBLEMA_NOMBRE = {
  none:   { en: 'None', es: 'Ninguno' },
  flame:  { en: 'Hot', es: 'En racha' },
  gem:    { en: 'Value', es: 'Valor' },
  shield: { en: 'Safe', es: 'Seguro' },
  star:   { en: 'Top', es: 'Top' },
  bolt:   { en: 'Bold', es: 'Atrevido' },
};

/* Portero: devuelve SIEMPRE un estilo válido y seguro. */
export function estiloSeguro(e) {
  e = e || {};
  const color = PALETA.find(p => p.id === e.color) || PALETA[0];
  const intensidad = INTENSIDADES.includes(e.intensidad) ? e.intensidad : 'normal';
  const emblema = (EMBLEMAS[e.emblema] != null) ? e.emblema : 'none';
  return { color: color.id, hex: color.hex, intensidad, emblema };
}

/* Atributos listos para pintar una tarjeta con el estilo (ya saneado). */
export function estiloAttrs(e) {
  const s = estiloSeguro(e);
  return {
    ...s,
    varCss: `--acc:${s.hex}`,
    cls: `sn-i-${s.intensidad}`,
    emblemaSVG: EMBLEMAS[s.emblema] || '',
  };
}
