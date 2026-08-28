/* ============================================================
   MODERACIÓN (Fase 6) — filtro de lenguaje ofensivo ES + EN.
   Lista por defecto (ampliable desde el panel admin, guardada en
   Firestore). El detector compara por PALABRA COMPLETA conservando
   acentos y ñ, así "económico" o "conocer" NO se marcan por "coño".
   Cubre plurales simples (+s / +es) y frases de varias palabras.
   ============================================================ */

export const PALABRAS_DEFECTO = [
  // Español (coloquial / ofensivo)
  'pinga', 'repinga', 'cojones', 'maricón', 'maricon', 'singao', 'singado',
  'cabrón', 'cabron', 'coño', 'mierda', 'puta', 'puto', 'verga', 'mamahuevo',
  'mamaguevo', 'pendejo', 'gilipollas', 'joder', 'polla', 'culero', 'chingada',
  'chinga', 'comemierda', 'hijueputa', 'hdp',
  // Inglés
  'bitch', 'son of a bitch', 'fuck', 'fucking', 'shit', 'asshole', 'bastard',
  'cunt', 'dick', 'faggot', 'motherfucker', 'whore', 'slut', 'nigger',
];

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

/* Devuelve el término prohibido encontrado (para avisar) o null si el texto
   está limpio. `lista` es opcional; si no se pasa, usa la de por defecto. */
export function terminoProhibido(texto, lista) {
  const t = norm(texto);
  if (!t) return null;
  const usar = (lista && lista.length) ? lista : PALABRAS_DEFECTO;
  // tokens = palabras completas (respetando letras acentuadas y ñ)
  let tokens = [];
  try { tokens = t.split(/[^\p{L}\p{N}]+/u).filter(Boolean); }
  catch (_) { tokens = t.split(/[^a-z0-9áéíóúüñ]+/i).filter(Boolean); }
  const set = new Set(tokens);
  for (const raw of usar) {
    const term = norm(raw);
    if (!term) continue;
    if (term.includes(' ')) {                       // frase (p.ej. "son of a bitch")
      if (t.includes(term)) return raw;
    } else if (set.has(term) || tokens.some(tk => tk === term + 's' || tk === term + 'es')) {
      return raw;                                   // palabra exacta o plural simple
    }
  }
  return null;
}

/* Normaliza/depura una lista que edita el admin (minúsculas, sin vacíos, sin duplicados). */
export function limpiarLista(arr) {
  const out = [];
  (arr || []).forEach(w => {
    const t = norm(w).slice(0, 40);
    if (t && !out.includes(t)) out.push(t);
  });
  return out;
}
