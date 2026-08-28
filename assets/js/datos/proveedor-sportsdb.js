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
    const r = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(nombre)}`);
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
