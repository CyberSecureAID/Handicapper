/* ============================================================
   FOTOS DE ANALISTA — catálogo central de las 30 fotos.
   Los archivos van en: assets/imagenes/analistas/<id>.webp
   - Hombres (20): a … t
   - Mujeres (10): aa … jj (letras dobles)
   Todo en minúscula y formato .webp.
   ============================================================ */

export const FOTOS_HOMBRE = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t'];
export const FOTOS_MUJER  = ['aa','bb','cc','dd','ee','ff','gg','hh','ii','jj'];

/* Todas, con su sexo (para el selector con dos secciones) */
export const FOTOS_ANALISTA = [
  ...FOTOS_HOMBRE.map(id => ({ id, sexo: 'hombre' })),
  ...FOTOS_MUJER.map(id => ({ id, sexo: 'mujer' })),
];

/* Ruta pública de una foto por su id */
export function rutaFotoAnalista(id) {
  return `assets/imagenes/analistas/${String(id).toLowerCase()}.webp`;
}

/* Sexo a partir del id (una letra = hombre, dos = mujer) */
export function sexoDeFoto(id) {
  return String(id).length >= 2 ? 'mujer' : 'hombre';
}

/* ¿Es un id de foto válido del catálogo? */
export function esFotoValida(id) {
  const s = String(id).toLowerCase();
  return FOTOS_HOMBRE.includes(s) || FOTOS_MUJER.includes(s);
}
