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
