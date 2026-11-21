/* ============================================================
   PROVEEDOR THESPORTSDB (enriquecedor, GRATIS, sin backend)
   Clave pública gratuita "123" (compartida y con límite, así que
   solo se usa al abrir un partido y se cachea por equipo).
   Aporta lo que ESPN no trae: estadio + capacidad, año de fundación
   y una breve descripción del equipo.

   Interfaz de enriquecedor que espera el agregador:
     - APORTA (lista blanca de campos que añade)
     - detalleEnriquecer(base) -> { infoEquipos: {...} }
   ============================================================ */
const BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const _cacheEquipo = new Map();   // nombre -> datos (o null)

export const APORTA = ['infoEquipos'];

async function buscarEquipo(nombre) {
  if (!nombre) return null;
  if (_cacheEquipo.has(nombre)) return _cacheEquipo.get(nombre);
  let dato = null;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(nombre)}`, { signal: ctrl.signal });
    clearTimeout(to);
    if (r.ok) {
      const j = await r.json();
      const t = j?.teams?.[0];
      if (t) dato = {
        estadio: t.strStadium || null,
        capacidad: t.intStadiumCapacity ? Number(t.intStadiumCapacity) : null,
        ciudad: t.strStadiumLocation || null,
        fundado: t.intFormedYear ? Number(t.intFormedYear) : null,
        descripcion: t.strDescriptionEN ? String(t.strDescriptionEN).slice(0, 320) : null,
        escudo: t.strBadge || null,
        idTeam: t.idTeam || null,
      };
    }
  } catch (_) { dato = null; }
  _cacheEquipo.set(nombre, dato);
  return dato;
}

/* ============================================================
   Escudo REAL del equipo — robusto y PERSISTENTE.
   Dos fuentes reales en cadena: TheSportsDB (badge) y, si falta, Wikipedia
   (imagen de la pagina del equipo). Cache PERSISTENTE en el dispositivo: una
   vez que un equipo resuelve su logo, queda guardado (tambien los equipos que
   aparezcan en el futuro resuelven la primera vez y se quedan). NUNCA inventa
   un logo: si ninguna fuente lo tiene, devuelve null y la tarjeta usa el nombre.
   ============================================================ */
const _ESC_LS = 'se-escudos-v1';
const _TTL_OK = 30 * 864e5;   // 30 dias si hay logo
const _TTL_NO = 2 * 864e5;    // reintenta a los 2 dias si no hubo
const _escMem = new Map();

/* Overrides curados: equipo (normalizado) -> URL de logo fija. Extensible: si una
   fuente nunca trae a un equipo, se le pone aqui su logo real y queda resuelto. */
const _ESC_OVERRIDE = {
  // 'tigres del licey': 'https://.../licey.png',
};

const _escNorm = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function _escStore() { try { return JSON.parse(localStorage.getItem(_ESC_LS) || '{}'); } catch (_) { return {}; } }
function _escPut(k, url) { try { const o = _escStore(); o[k] = { u: url || null, t: Date.now() }; localStorage.setItem(_ESC_LS, JSON.stringify(o)); } catch (_) {} }

/* Segunda fuente: imagen de la pagina de Wikipedia (es y luego en). Cualquier
   equipo con pagina resuelve, incluidos los que aun no hemos visto. */
async function _wikiEscudo(nombre) {
  for (const lang of ['es', 'en']) {
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 5000);
      const u = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=240&redirects=1&format=json&origin=*&titles=${encodeURIComponent(nombre)}`;
      const r = await fetch(u, { signal: ctrl.signal }); clearTimeout(to);
      if (!r.ok) continue;
      const j = await r.json();
      const pages = (j && j.query && j.query.pages) || {};
      for (const k in pages) { const s = pages[k] && pages[k].thumbnail && pages[k].thumbnail.source; if (s) return s; }
    } catch (_) {}
  }
  return null;
}

export async function escudoEquipo(nombre) {
  if (!nombre) return null;
  const k = _escNorm(nombre);
  if (_escMem.has(k)) return _escMem.get(k);
  if (_ESC_OVERRIDE[k]) { _escMem.set(k, _ESC_OVERRIDE[k]); return _ESC_OVERRIDE[k]; }
  const store = _escStore(); const hit = store[k]; const now = Date.now();
  if (hit && (hit.u ? (now - hit.t < _TTL_OK) : (now - hit.t < _TTL_NO))) {
    _escMem.set(k, hit.u || null); return hit.u || null;
  }
  let url = null;
  try { const info = await buscarEquipo(nombre); url = (info && info.escudo) || null; } catch (_) {}
  if (!url) { try { url = await _wikiEscudo(nombre); } catch (_) {} }
  _escMem.set(k, url);
  _escPut(k, url);
  return url;
}

/* Lectura SOLO de cache (sincrona, sin red): pinta el tablero al instante con lo
   ya resuelto. Devuelve la URL, null si se sabe que no hay, o undefined si aun no
   se ha resuelto (hay que llamar a escudoEquipo). */
export function escudoCache(nombre) {
  if (!nombre) return null;
  const k = _escNorm(nombre);
  if (_escMem.has(k)) return _escMem.get(k);
  if (_ESC_OVERRIDE[k]) return _ESC_OVERRIDE[k];
  try {
    const hit = _escStore()[k]; const now = Date.now();
    if (hit && (hit.u ? (now - hit.t < _TTL_OK) : (now - hit.t < _TTL_NO))) { _escMem.set(k, hit.u || null); return hit.u || null; }
  } catch (_) {}
  return undefined;
}

export async function detalleEnriquecer(base) {
  try {
    const [L, V] = await Promise.all([
      buscarEquipo(base?.local?.nombre),
      buscarEquipo(base?.visita?.nombre),
    ]);
    if (!L && !V) return null;
    return { infoEquipos: { local: L || null, visita: V || null } };
  } catch (_) { return null; }
}

/* ============================================================
   FOTOS DE JUGADORES (reemplazo de Wikipedia).
   Filtra por DEPORTE y EQUIPO -> nunca devuelve a la persona equivocada.
   Prefiere el recorte TRANSPARENTE (strCutout). Dos estrategias:
     1) Roster del equipo por idTeam (cero colisiones).
     2) Búsqueda por nombre filtrada por deporte + equipo (respaldo).
   Si no encuentra a alguien, NO inventa: se queda sin foto y la app
   muestra la figura genérica (nunca un rostro real que no corresponde).
   ============================================================ */
const _SPORT = {
  mlb: 'Baseball', nba: 'Basketball', nfl: 'American Football', nhl: 'Ice Hockey',
  epl: 'Soccer', laliga: 'Soccer', ucl: 'Soccer', seriea: 'Soccer', bundes: 'Soccer', ligue1: 'Soccer',
  mexliga: 'Soccer', mls: 'Soccer', invierno: 'Baseball',
};
const _normNom = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const _cacheFoto = new Map();   // nombreNorm -> url|null
const _fotoDe = (p) => p && (p.strCutout || p.strThumb || p.strRender) || null;

export async function fotosSportsDB(nombres, { equipo = '', ligaId = '' } = {}) {
  const limpios = [...new Set((nombres || []).filter(Boolean))];
  if (!limpios.length) return {};
  const sport = _SPORT[ligaId] || null;
  const out = {};

  // 1) Roster del equipo por idTeam (la persona SIEMPRE es correcta)
  try {
    const info = equipo ? await buscarEquipo(equipo) : null;
    const idTeam = info && info.idTeam;
    if (idTeam) {
      const r = await fetch(`${BASE}/lookup_all_players.php?id=${idTeam}`);
      if (r.ok) {
        const j = await r.json();
        (j?.player || j?.players || []).forEach(p => {
          const u = _fotoDe(p);
          if (u && p.strPlayer) out[_normNom(p.strPlayer)] = u;
        });
      }
    }
  } catch (_) {}

  // 2) Respaldo: búsqueda por nombre, filtrada por deporte y equipo
  const faltan = limpios.filter(n => !out[_normNom(n)]).slice(0, 14);
  await Promise.all(faltan.map(async (nombre) => {
    const k = _normNom(nombre);
    if (_cacheFoto.has(k)) { const v = _cacheFoto.get(k); if (v) out[k] = v; return; }
    let url = null;
    try {
      const r = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(nombre)}`);
      if (r.ok) {
        const j = await r.json();
        const cands = (j?.player || []).filter(p => !sport || p.strSport === sport);
        let best = null;
        if (equipo) best = cands.find(p => {
          const t = _normNom(p.strTeam || ''); const e = _normNom(equipo);
          return t && e && (t.includes(e) || e.includes(t));
        });
        best = best || (cands.length === 1 ? cands[0] : null);   // sin equipo, solo si es inequívoco
        url = _fotoDe(best);
      }
    } catch (_) {}
    _cacheFoto.set(k, url);
    if (url) out[k] = url;
  }));
  return out;
}
