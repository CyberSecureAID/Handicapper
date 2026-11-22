/* ============================================================
   marcador.js — MARCADOR PUBLICO por analista (track record REAL).

   Guarda, en un sitio que TODOS los usuarios pueden leer, el resultado
   REAL ya resuelto de cada analista: aciertos, fallos, empates, neto y
   sus ultimos picks resueltos. Lo llena la resolucion de predicciones
   (prestigio.js) cuando un partido termina y la API dice quien gano.

   Por que existe: el motor de aciertos/fallos ya era real, pero el
   resultado vivia en 'analistas'/'predicciones', que por reglas SOLO
   lee el admin. El publico veia el numero sin movimiento real. Esta
   coleccion ('marcador') es de LECTURA PUBLICA y ESCRITURA SOLO ADMIN
   (reglas), asi el publico ve el historial real sin poder falsearlo.

   No inventa nada: si un analista no ha resuelto picks, no hay marcador
   y el historial lo dice honestamente.
   ============================================================ */
import { _asegurarListo, _obtenerStore, _obtenerDB } from '../auth/auth.js';
import { _fijarMarcadores } from './bots.js';

const COL = 'marcador';
const TOPE_ULTIMOS = 20;

let _cache = null;        // Map uid -> { aciertos, fallos, empates, neto, ultimos }
let _cargando = null;

function _vacio() { return { aciertos: 0, fallos: 0, empates: 0, neto: 0, ultimos: [] }; }

/* Registra UN resultado ya resuelto. Lo llama la resolucion (sesion admin).
   item = { matchId, deporte, favorito, resultado:'acierto'|'fallo'|'empate', cuando }
   El neto se mantiene consistente: neto = aciertos - fallos - empates
   (empate penaliza, igual que en prestigio.js). */
export async function anotarResolucion(uid, item) {
  if (!uid || !item || !item.resultado) return false;
  if (!await _asegurarListo()) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const ref = S.doc(db, COL, uid);
    const snap = await S.getDoc(ref);
    const d = snap.exists() ? snap.data() : _vacio();
    const aciertos = (Number(d.aciertos) || 0) + (item.resultado === 'acierto' ? 1 : 0);
    const fallos   = (Number(d.fallos)   || 0) + (item.resultado === 'fallo'   ? 1 : 0);
    const empates  = (Number(d.empates)  || 0) + (item.resultado === 'empate'  ? 1 : 0);
    const neto = aciertos - fallos - empates;
    const nuevo = {
      matchId: String(item.matchId || ''),
      deporte: item.deporte || '',
      favorito: item.favorito || '',
      resultado: item.resultado,
      cuando: item.cuando || null,
    };
    // Un analista tiene a lo sumo un pick por partido: deduplica por matchId.
    const previos = Array.isArray(d.ultimos) ? d.ultimos.filter(x => x && x.matchId !== nuevo.matchId) : [];
    const ultimos = [nuevo, ...previos].slice(0, TOPE_ULTIMOS);
    await S.setDoc(ref, { aciertos, fallos, empates, neto, ultimos, actualizado: S.serverTimestamp() }, { merge: true });
    if (_cache) _cache.set(uid, { aciertos, fallos, empates, neto, ultimos });
    return true;
  } catch (_) { return false; }
}

/* Lee TODOS los marcadores (lectura publica). Cachea en memoria y alimenta
   el prestigio mostrado de bots.js. */
export async function cargarMarcadores(forzar = false) {
  if (_cache && !forzar) return _cache;
  if (_cargando && !forzar) return _cargando;
  _cargando = (async () => {
    const m = new Map();
    try {
      if (await _asegurarListo()) {
        const S = _obtenerStore(), db = _obtenerDB();
        const q = await S.getDocs(S.collection(db, COL));
        q.forEach(doc => {
          const x = doc.data() || {};
          m.set(doc.id, {
            aciertos: Number(x.aciertos) || 0,
            fallos: Number(x.fallos) || 0,
            empates: Number(x.empates) || 0,
            neto: Number(x.neto) || 0,
            ultimos: Array.isArray(x.ultimos) ? x.ultimos : [],
          });
        });
      }
    } catch (_) {}
    _cache = m;
    try { _fijarMarcadores(m); } catch (_) {}
    return m;
  })();
  const r = await _cargando; _cargando = null; return r;
}

/* Marcador de un analista (del cache si esta; si no, lo carga). */
export async function leerMarcador(uid) {
  if (!uid) return null;
  const m = _cache || await cargarMarcadores();
  return m.get(uid) || null;
}

/* Calienta el cache sin bloquear (lo llama el arranque del modulo extra). */
export function precargarMarcadores() { cargarMarcadores().catch(() => {}); }
