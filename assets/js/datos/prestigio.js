/* ============================================================
   PRESTIGIO — registro de predicciones + resolución automática.
   Cada señal de un analista (bot o persona) deja una predicción
   PERMANENTE. Cuando el partido termina, la API dice quién ganó y
   se suma/resta prestigio. Aunque el analista borre la señal, la
   predicción ya quedó registrada (anti-trampa).
   ============================================================ */
import { _asegurarListo, _obtenerStore, _obtenerDB } from '../auth/auth.js';

/* Registra (o actualiza) la predicción de un analista sobre un partido.
   id = analistaUid__matchId  ->  una sola por analista y partido (idempotente). */
export async function registrarPrediccion(pred) {
  if (!pred || !pred.analistaUid || !pred.matchId) return false;
  if (!await _asegurarListo()) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const id = `${pred.analistaUid}__${pred.matchId}`;
    await S.setDoc(S.doc(db, 'predicciones', id), {
      analistaUid: pred.analistaUid,
      matchId: String(pred.matchId),
      ligaId: pred.ligaId || '',
      deporte: pred.deporte || '',
      favoritoId: String(pred.favoritoId || ''),
      favoritoNombre: pred.favoritoNombre || '',
      cuando: pred.cuando || null,
      estado: 'pendiente',
      resultado: null,
      creado: S.serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (_) { return false; }
}

/* Suma (o resta) puntos de prestigio a un analista. */
export async function ajustarPrestigio(uid, delta) {
  if (!uid || !delta) return false;
  if (!await _asegurarListo()) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    await S.setDoc(S.doc(db, 'analistas', uid), { prestigio: S.increment(delta) }, { merge: true });
    return true;
  } catch (_) { return false; }
}

/* Resuelve las predicciones pendientes cuyos partidos ya terminaron.
   resultadoFn(ligaId, matchId) -> { final, empate, ganadorId } | null
   Reglas: acierto = +1 ; fallo = -1 ; empate = -1 (la predicción falló). */
export async function resolverPredicciones(resultadoFn) {
  if (typeof resultadoFn !== 'function') return { resueltas: 0 };
  if (!await _asegurarListo()) return { resueltas: 0 };
  let resueltas = 0, revisadas = 0;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = S.query(S.collection(db, 'predicciones'), S.where('estado', '==', 'pendiente'));
    const snap = await S.getDocs(q);
    const ahora = Date.now();
    for (const d of snap.docs) {
      const p = d.data();
      const t = p.cuando ? new Date(p.cuando).getTime() : 0;
      // Esperar al menos ~30 min tras la hora de inicio (el partido tiene que haber terminado).
      if (!t || t > ahora - 30 * 60 * 1000) continue;
      revisadas++;
      let res = null;
      try { res = await resultadoFn(p.ligaId, p.matchId); } catch (_) {}
      if (!res || !res.final) continue;   // aún no es definitivo -> se reintenta después
      // Blindaje: si no podemos verificar el favorito (falta el id) o el ganador,
      // NO penalizamos. Marcamos resuelta con delta 0 para no reintentar en bucle.
      if (!p.favoritoId || !res.ganadorId) {
        try { await S.updateDoc(d.ref, { estado: 'resuelta', resultado: 'sin-verificar', delta: 0, resuelto: S.serverTimestamp() }); } catch (_) {}
        continue;
      }
      const acierto = !res.empate && String(res.ganadorId) === String(p.favoritoId);
      const delta = res.empate ? -1 : (acierto ? 1 : -1);
      try {
        await ajustarPrestigio(p.analistaUid, delta);
        await S.updateDoc(d.ref, {
          estado: 'resuelta',
          resultado: res.empate ? 'empate' : (acierto ? 'acierto' : 'fallo'),
          delta,
          resuelto: S.serverTimestamp(),
        });
        resueltas++;
      } catch (_) {}
    }
  } catch (_) {}
  return { resueltas, revisadas };
}
