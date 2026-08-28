/* ============================================================
   MESA · CAPA DE DATOS (administración)
   Todo pasa por Firestore. La SEGURIDAD real está en las reglas de
   Firestore (no en el navegador): aunque alguien abra esta página, si
   su UID no está en la colección 'admins', Firestore le niega los datos.
   ============================================================ */
import { _asegurarListo, _obtenerDB, _obtenerStore, usuarioActual } from '../auth/auth.js';

/* ¿El usuario actual es administrador? Se comprueba contra Firestore. */
export async function esAdmin() {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual();
  if (!u) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const ref = S.doc(db, 'admins', u.uid);
    const snap = await S.getDoc(ref);
    return snap.exists();
  } catch (_) { return false; }
}

/* Lista los UID que son administradores (colección admins) */
export async function listarAdmins() {
  if (!await _asegurarListo()) return [];
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = await S.getDocs(S.collection(db, 'admins'));
    const out = [];
    q.forEach(d => out.push({ uid: d.id, ...d.data() }));
    return out;
  } catch (_) { return []; }
}

/* Lista todos los usuarios registrados (solo admins por reglas) */
export async function listarUsuarios() {
  if (!await _asegurarListo()) return [];
  const S = _obtenerStore(), db = _obtenerDB();
  const q = await S.getDocs(S.collection(db, 'usuarios'));
  const out = [];
  q.forEach(d => out.push({ uid: d.id, ...d.data() }));
  return out;
}

/* Bloquea o desbloquea a un usuario (marca en su perfil) */
export async function fijarBloqueo(uid, bloqueado) {
  const S = _obtenerStore(), db = _obtenerDB();
  await S.updateDoc(S.doc(db, 'usuarios', uid), { bloqueado: !!bloqueado });
}

/* Cambia manualmente la suscripción de un usuario (útil sin Stripe aún) */
export async function fijarSuscripcionUsuario(uid, sub) {
  const S = _obtenerStore(), db = _obtenerDB();
  await S.updateDoc(S.doc(db, 'usuarios', uid), { suscripcion: sub });
}

/* Guarda el análisis del analista para un partido.
   analisis = { texto, veredicto, prob (0-100|null), ajustar (bool) } */
export async function guardarAnalisis(matchId, analisis) {
  const S = _obtenerStore(), db = _obtenerDB();
  const u = usuarioActual();
  const id = String(matchId).replace(/[^\w:-]/g, '_');
  await S.setDoc(S.doc(db, 'analisis', id), {
    ...analisis,
    matchId,
    autor: analisis.autor || u?.nombre || u?.email || 'Analyst',
    firma: analisis.firma || null,
    autorUid: u?.uid || null,
    actualizado: S.serverTimestamp(),
  });
}

export async function borrarAnalisis(matchId) {
  const S = _obtenerStore(), db = _obtenerDB();
  const id = String(matchId).replace(/[^\w:-]/g, '_');
  await S.deleteDoc(S.doc(db, 'analisis', id));
}

/* Lee el análisis de un partido (para mostrarlo en la plataforma) */
export async function leerAnalisis(matchId) {
  if (!await _asegurarListo()) return null;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const id = String(matchId).replace(/[^\w:-]/g, '_');
    const snap = await S.getDoc(S.doc(db, 'analisis', id));
    return snap.exists() ? snap.data() : null;
  } catch (_) { return null; }
}

/* Lista todos los análisis publicados (para el panel) */
export async function listarAnalisis() {
  if (!await _asegurarListo()) return [];
  const S = _obtenerStore(), db = _obtenerDB();
  const q = await S.getDocs(S.collection(db, 'analisis'));
  const out = [];
  q.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

/* ============================================================
   ANALISTAS CONTRATADOS (colección 'analistas')
   Doc = { email, deporte:'beisbol'|'basket'|'hockey'|'futbol', activo:bool }
   Reglas: solo el admin crea/edita/borra; el propio analista lee su ficha.
   ============================================================ */

/* Ficha del analista actual si está ACTIVO; null si no es analista o está bloqueado. */
export async function esAnalista() {
  if (!await _asegurarListo()) return null;
  const u = usuarioActual(); if (!u) return null;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const snap = await S.getDoc(S.doc(db, 'analistas', u.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return d.activo === false ? null : { uid: u.uid, ...d };
  } catch (_) { return null; }
}

/* Lista todos los analistas (solo admin por reglas). */
export async function listarAnalistas() {
  if (!await _asegurarListo()) return [];
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = await S.getDocs(S.collection(db, 'analistas'));
    const out = []; q.forEach(d => out.push({ uid: d.id, ...d.data() }));
    return out;
  } catch (_) { return []; }
}

/* Crea o actualiza un analista (admin). */
export async function guardarAnalista(uid, datos) {
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'analistas', uid), { ...datos }, { merge: true });
}

/* Activa/bloquea o cambia deporte (admin). */
export async function fijarAnalista(uid, patch) {
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'analistas', uid), { ...patch }, { merge: true });
}

/* Elimina un analista (admin). */
export async function eliminarAnalista(uid) {
  const S = _obtenerStore(), db = _obtenerDB();
  await S.deleteDoc(S.doc(db, 'analistas', uid));
}
