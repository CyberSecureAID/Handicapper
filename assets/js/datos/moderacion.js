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

/* ============================================================
   Detector de PUBLICIDAD / ENLACES (no se permite promocionar
   páginas externas ni dejar contactos en el análisis).
   Detecta enlaces, dominios y nombres de sitios de apuestas o
   estadísticas, INCLUSO si se escriben troceados o por partes
   ("b e t 3 6 5", "casa punto com", "w w w . pagina . com").
   Devuelve { tipo, detalle } o null si el texto está limpio.
   ============================================================ */
const SITIOS = [
  'bet365', 'betway', '1xbet', 'draftkings', 'fanduel', 'betfair', 'bwin',
  'pinnacle', 'betmgm', 'williamhill', 'unibet', 'ladbrokes', 'codere',
  'rushbet', 'wplay', 'betsson', 'betano', 'melbet', '22bet', 'caliente',
  'sofascore', 'flashscore', 'whoscored', 'oddspedia', 'forebet', 'betsapi',
];
const TLDS_FUERTES = ['com', 'net', 'org', 'io', 'xyz', 'vip', 'bet', 'gg', 'app', 'online', 'site', 'club', 'live', 'info', 'biz', 'link', 'store', 'win', 'casino'];
const TLDS_TODOS = TLDS_FUERTES.concat(['co', 'me', 'tv', 'us', 'es', 'ar', 'mx', 'ru', 'to', 'in']);

export function detectarPublicidad(texto) {
  const raw = String(texto == null ? '' : texto);
  if (!raw.trim()) return null;
  const t = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1) Esquema de URL explícito
  if (/https?:\/\//.test(t)) return { tipo: 'enlace', detalle: 'http' };
  // 2) "www" aunque venga troceado ("w w w", "w-w-w", "w.w.w")
  if (/w\s*[.\-_]?\s*w\s*[.\-_]?\s*w/.test(t)) return { tipo: 'enlace', detalle: 'www' };
  // 3) atajos de mensajería t.me / wa.me
  if (/\b(?:t|wa)\s*\.\s*me\b/.test(t)) return { tipo: 'contacto', detalle: 'mensajería' };
  // 4) dominio pegado nombre.tld
  if (new RegExp('[a-z0-9][a-z0-9-]{1,40}\\.(?:' + TLDS_TODOS.join('|') + ')(?![a-z0-9])').test(t)) return { tipo: 'enlace', detalle: 'dominio' };
  // 5) dominio con espacios o "punto" escrito (solo TLD claros, evita falsos positivos)
  if (new RegExp('[a-z0-9][a-z0-9-]{1,40}\\s*(?:\\.\\s+|\\s+\\.\\s*|\\s+punto\\s+|\\s+dot\\s+)(?:' + TLDS_FUERTES.join('|') + ')(?![a-z0-9])').test(t)) return { tipo: 'enlace', detalle: 'dominio' };
  // 6) "punto com/net/..." al inicio de una dirección
  if (new RegExp('\\b(?:punto|dot)\\s+(?:' + TLDS_FUERTES.join('|') + ')\\b').test(t)) return { tipo: 'enlace', detalle: 'dominio' };
  // 7) nombres de sitios conocidos, incluso troceados: compactar quitando separadores
  const compact = t.replace(/[^a-z0-9]/g, '');
  for (const s of SITIOS) { if (compact.includes(s)) return { tipo: 'sitio', detalle: s }; }
  // 8) redes/mensajería usadas para promocionar o dejar contacto
  if (/\b(?:telegram|whats\s*app|wasap|guasap|instagram|discord|tiktok)\b/.test(t)) return { tipo: 'contacto', detalle: 'redes' };

  return null;
}
