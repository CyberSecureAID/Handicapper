/* ============================================================
   MESA · CAPA DE DATOS (administración)
   Todo pasa por Firestore. La SEGURIDAD real está en las reglas de
   Firestore (no en el navegador): aunque alguien abra esta página, si
   su UID no está en la colección 'admins', Firestore le niega los datos.
   ============================================================ */
import { _asegurarListo, _obtenerDB, _obtenerStore, usuarioActual } from '../auth/auth.js';
import { BOTS, FOTOS_BOT, esBot } from '../datos/bots.js';

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
  const bots = BOTS.map(b => ({ uid: b.uid, email: b.email, nombre: b.nombre, suscripcion: null, esBot: true }));
  if (!await _asegurarListo()) return [...bots];
  const S = _obtenerStore(), db = _obtenerDB();
  const q = await S.getDocs(S.collection(db, 'usuarios'));
  const out = [...bots];
  q.forEach(d => { if (!bots.some(x => x.uid === d.id)) out.push({ uid: d.id, ...d.data() }); });
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
    autorUid: analisis.autorUid || u?.uid || null,
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
  const base = BOTS.map(b => ({ ...b }));
  if (!await _asegurarListo()) return base;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = await S.getDocs(S.collection(db, 'analistas'));
    const out = base;
    q.forEach(d => {
      const b = out.find(x => x.uid === d.id);
      if (b) Object.assign(b, d.data());          // override sobre el bot (ej. foto asignada por admin)
      else out.push({ uid: d.id, ...d.data() });
    });
    return out;
  } catch (_) { return base; }
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

/* ============================================================
   FASE 1 — FOTOS DE ANALISTA (colección 'fotos')
   Doc id = id de la foto ('a', 'aa', …). Data = { uid, firma, fecha }.
   Una foto ocupada = existe su doc. Se libera borrándolo.
   La regla de Firestore impide crear una foto que ya existe (foto única).
   ============================================================ */

/* Mapa { fotoId: uid } de todas las fotos ocupadas. */
export async function fotosOcupadas() {
  const base = {};
  FOTOS_BOT.forEach(f => { base[String(f).toLowerCase()] = 'bot'; });   // fotos de bots: siempre ocupadas
  if (!await _asegurarListo()) return base;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = await S.getDocs(S.collection(db, 'fotos'));
    q.forEach(d => { base[d.id] = (d.data() && d.data().uid) || true; });
    return base;
  } catch (_) { return base; }
}

/* El analista actual reclama una foto libre. Libera antes la que tuviera.
   Devuelve true si la reclamó; false si ya estaba ocupada por otro. */
export async function reclamarFoto(fotoId, firma) {
  const S = _obtenerStore(), db = _obtenerDB();
  const u = usuarioActual(); if (!u) return false;
  const idNueva = String(fotoId).toLowerCase();
  // Liberar la anterior (si el analista tenía otra)
  try {
    const ficha = await leerFichaAnalista(u.uid);
    if (ficha && ficha.foto && ficha.foto !== idNueva) {
      try { await S.deleteDoc(S.doc(db, 'fotos', ficha.foto)); } catch (_) {}
    }
  } catch (_) {}
  // Reclamar la nueva (create falla si ya existe → foto única, garantizado por reglas)
  try {
    await S.setDoc(S.doc(db, 'fotos', idNueva), { uid: u.uid, firma: firma || null, fecha: S.serverTimestamp() });
    return true;
  } catch (_) { return false; }
}

/* Libera una foto (admin al suspender, o el propio analista). */
export async function liberarFoto(fotoId) {
  const S = _obtenerStore(), db = _obtenerDB();
  try { await S.deleteDoc(S.doc(db, 'fotos', String(fotoId).toLowerCase())); return true; }
  catch (_) { return false; }
}

/* Lee la ficha de un analista (para saber su foto/config). */
export async function leerFichaAnalista(uid) {
  if (!await _asegurarListo()) return null;
  const u = usuarioActual();
  const id = uid || (u && u.uid);
  if (!id) return null;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const snap = await S.getDoc(S.doc(db, 'analistas', id));
    return snap.exists() ? { uid: id, ...snap.data() } : null;
  } catch (_) { return null; }
}

/* El analista guarda su propia config (nombre/firma/foto/configurado).
   Las reglas permiten al analista editar SU ficha sin tocar deporte/activo/email. */
export async function guardarPerfilAnalista({ nombre, firma, foto }) {
  const S = _obtenerStore(), db = _obtenerDB();
  const u = usuarioActual(); if (!u) return false;
  const patch = { configurado: true };
  if (nombre != null) patch.nombre = nombre;
  if (firma != null) patch.firma = firma;
  if (foto != null) patch.foto = String(foto).toLowerCase();
  try { await S.setDoc(S.doc(db, 'analistas', u.uid), patch, { merge: true }); return true; }
  catch (_) { return false; }
}

/* ADMIN: asigna (o cambia) la foto de cualquier analista. Libera la anterior. */
export async function asignarFotoAnalista(uid, fotoId, firma) {
  const S = _obtenerStore(), db = _obtenerDB();
  const idNueva = String(fotoId).toLowerCase();
  try {
    const ficha = await leerFichaAnalista(uid);
    if (ficha && ficha.foto && ficha.foto !== idNueva) {
      try { await S.deleteDoc(S.doc(db, 'fotos', ficha.foto)); } catch (_) {}
    }
  } catch (_) {}
  try {
    await S.setDoc(S.doc(db, 'fotos', idNueva), { uid, firma: firma || null, fecha: S.serverTimestamp() });
  } catch (_) { return false; }
  try { await S.setDoc(S.doc(db, 'analistas', uid), { foto: idNueva }, { merge: true }); return true; }
  catch (_) { return false; }
}

/* ADMIN: quita la foto de un analista y la libera. */
export async function quitarFotoAnalista(uid) {
  const S = _obtenerStore(), db = _obtenerDB();
  try {
    const ficha = await leerFichaAnalista(uid);
    if (ficha && ficha.foto) { try { await S.deleteDoc(S.doc(db, 'fotos', ficha.foto)); } catch (_) {} }
  } catch (_) {}
  try { await S.setDoc(S.doc(db, 'analistas', uid), { foto: null }, { merge: true }); return true; }
  catch (_) { return false; }
}

/* ADMIN: ajusta un contador figurativo (+/-). campo: followersExtra | likesExtra | dislikesExtra. */
export async function ajustarContadorAnalista(uid, campo, delta) {
  const permitidos = ['followersExtra', 'likesExtra', 'dislikesExtra'];
  if (!permitidos.includes(campo)) return null;
  const S = _obtenerStore(), db = _obtenerDB();
  const ref = S.doc(db, 'analistas', uid);
  try {
    const snap = await S.getDoc(ref);
    const actual = (snap.exists() && Number(snap.data()[campo])) || 0;
    const nuevo = Math.max(0, actual + delta);
    await S.setDoc(ref, { [campo]: nuevo }, { merge: true });
    return nuevo;
  } catch (_) { return null; }
}

/* ============================================================
   FASE 3 — SEGUIDORES (colección 'seguimientos')
   Doc id = `${seguidorUid}__${analistaUid}` = { seguidorUid, analistaUid, firma, fecha }
   Premium sigue a analistas. El conteo se hace por agregación (getCountFromServer).
   ============================================================ */
const _idSeg = (a, b) => `${a}__${b}`.replace(/[^\w:-]/g, '_');

export async function seguirAnalista(analistaUid, firma) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !analistaUid) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'seguimientos', _idSeg(u.uid, analistaUid)), {
    seguidorUid: u.uid, analistaUid, firma: firma || null, fecha: S.serverTimestamp(),
  });
  return true;
}
export async function dejarDeSeguir(analistaUid) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !analistaUid) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.deleteDoc(S.doc(db, 'seguimientos', _idSeg(u.uid, analistaUid)));
  return true;
}
export async function sigueA(analistaUid) {
  if (!analistaUid || !await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const snap = await S.getDoc(S.doc(db, 'seguimientos', _idSeg(u.uid, analistaUid)));
    return snap.exists();
  } catch (_) { return false; }
}
/* UIDs de los analistas que sigue el usuario actual. */
export async function misSeguidos() {
  if (!await _asegurarListo()) return [];
  const u = usuarioActual(); if (!u) return [];
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = S.query(S.collection(db, 'seguimientos'), S.where('seguidorUid', '==', u.uid));
    const snap = await S.getDocs(q);
    const out = []; snap.forEach(d => out.push(d.data().analistaUid));
    return out;
  } catch (_) { return []; }
}
/* Nº de seguidores de un analista (agregación en servidor; respaldo por conteo). */
export async function contarSeguidores(analistaUid) {
  if (!analistaUid || !await _asegurarListo()) return 0;
  const S = _obtenerStore(), db = _obtenerDB();
  const q = S.query(S.collection(db, 'seguimientos'), S.where('analistaUid', '==', analistaUid));
  try {
    if (S.getCountFromServer) { const c = await S.getCountFromServer(q); return (c.data().count) || 0; }
  } catch (_) {}
  try { const snap = await S.getDocs(q); return snap.size || 0; } catch (_) { return 0; }
}

/* ============================================================
   FASE 6 — MODERACIÓN (doc 'config/moderacion' = { palabras: [...] })
   Admin lee/escribe; el analista solo lee (para validar al publicar).
   ============================================================ */
export async function leerModeracion() {
  if (!await _asegurarListo()) return [];
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const snap = await S.getDoc(S.doc(db, 'config', 'moderacion'));
    return snap.exists() ? (snap.data().palabras || []) : [];
  } catch (_) { return []; }
}
export async function guardarModeracion(palabras) {
  if (!await _asegurarListo()) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'config', 'moderacion'), { palabras: palabras || [], actualizado: S.serverTimestamp() }, { merge: true });
  return true;
}

/* ============================================================
   FASE 7 — LIKES / DISLIKES (colección 'votos')
   Doc id = `${uid}__${signalId}` = { uid, signalId, valor: 1|-1, fecha }
   El conteo se hace por agregación; nunca se toca el doc de la señal.
   ============================================================ */
const _idVoto = (uid, sid) => `${uid}__${sid}`.replace(/[^\w:-]/g, '_');

export async function votarSenal(signalId, valor) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !signalId || ![1, -1].includes(valor)) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'votos', _idVoto(u.uid, signalId)), {
    uid: u.uid, signalId, valor, fecha: S.serverTimestamp(),
  });
  return true;
}

/* Reporta una señal (soporte). UN SOLO reporte por usuario: el documento usa
   el uid como id, así cada usuario tiene como máximo un reporte. */
export async function reportarSenal(signalId, datos = {}) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !signalId) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'reportes', u.uid), {
    signalId,
    firma: datos.firma || null,
    autorUid: datos.autorUid || null,
    motivo: datos.motivo || 'otro',
    comentario: (datos.comentario || '').slice(0, 500),
    reportadoPor: u.uid,
    correo: u.email || null,
    estado: 'abierto',
    creado: S.serverTimestamp(),
  });
  return true;
}

/* ¿El usuario actual ya envió su reporte? Devuelve el reporte o null (1 sola lectura). */
export async function miReporte() {
  if (!await _asegurarListo()) return null;
  const u = usuarioActual(); if (!u) return null;
  const S = _obtenerStore(), db = _obtenerDB();
  try { const d = await S.getDoc(S.doc(db, 'reportes', u.uid)); return d.exists() ? { id: u.uid, ...d.data() } : null; }
  catch (_) { return null; }
}

/* Admin: lista todos los reportes. */
export async function listarReportes() {
  if (!await _asegurarListo()) return [];
  const S = _obtenerStore(), db = _obtenerDB();
  try { const q = await S.getDocs(S.collection(db, 'reportes')); return q.docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (_) { return []; }
}

/* Admin: marca un reporte con un estado ('resuelto' | 'abierto'). */
export async function resolverReporte(id, estado) {
  if (!await _asegurarListo()) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  try { await S.updateDoc(S.doc(db, 'reportes', id), { estado: estado || 'resuelto' }); return true; }
  catch (_) { return false; }
}

/* Admin: elimina un reporte (deja que ese usuario pueda enviar uno nuevo). */
export async function borrarReporte(id) {
  if (!await _asegurarListo()) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  try { await S.deleteDoc(S.doc(db, 'reportes', id)); return true; }
  catch (_) { return false; }
}
export async function quitarVoto(signalId) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !signalId) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.deleteDoc(S.doc(db, 'votos', _idVoto(u.uid, signalId)));
  return true;
}
/* Mapa signalId -> valor (1|-1) de los votos del usuario actual. */
export async function misVotos() {
  if (!await _asegurarListo()) return {};
  const u = usuarioActual(); if (!u) return {};
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = S.query(S.collection(db, 'votos'), S.where('uid', '==', u.uid));
    const snap = await S.getDocs(q);
    const out = {}; snap.forEach(d => { const v = d.data(); if (v.signalId) out[v.signalId] = v.valor; });
    return out;
  } catch (_) { return {}; }
}
/* { likes, dislikes } de una señal (agregación en servidor con respaldo). */
export async function contarVotos(signalId) {
  const base = { likes: 0, dislikes: 0 };
  if (!signalId || !await _asegurarListo()) return base;
  const S = _obtenerStore(), db = _obtenerDB();
  const cuenta = async (valor) => {
    const q = S.query(S.collection(db, 'votos'), S.where('signalId', '==', signalId), S.where('valor', '==', valor));
    try { if (S.getCountFromServer) { const c = await S.getCountFromServer(q); return c.data().count || 0; } } catch (_) {}
    try { const snap = await S.getDocs(q); return snap.size || 0; } catch (_) { return 0; }
  };
  const [likes, dislikes] = await Promise.all([cuenta(1), cuenta(-1)]);
  return { likes, dislikes };
}

/* ============================================================
   FASE 8 — APOYO DE PAGO AL ANALISTA (colección 'apoyos')
   Doc id = `${uid}__${analistaUid}` =
     { uid, analistaUid, firma, activo, precio:2, corteAnalista:1, cortePlataforma:1,
       inicio, vence, metodo:'preview'|'stripe' }
   El cobro real se conecta con la pasarela (Stripe) más adelante; por ahora
   'preview' permite ver el flujo y el dashboard de ingresos del admin.
   ============================================================ */
const _idApoyo = (uid, aid) => `${uid}__${aid}`.replace(/[^\w:-]/g, '_');

export async function apoyarAnalista(analistaUid, firma, metodo = 'preview') {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !analistaUid) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  const bot = esBot(analistaUid);                 // los bots son de la casa: $2 completos para la plataforma
  const vence = new Date(); vence.setMonth(vence.getMonth() + 1);
  await S.setDoc(S.doc(db, 'apoyos', _idApoyo(u.uid, analistaUid)), {
    uid: u.uid, analistaUid, firma: firma || null, activo: true,
    precio: 2, corteAnalista: bot ? 0 : 1, cortePlataforma: bot ? 2 : 1, esBot: bot,
    inicio: S.serverTimestamp(), vence: vence.toISOString(), metodo,
  }, { merge: true });
  return true;
}
export async function cancelarApoyo(analistaUid) {
  if (!await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u || !analistaUid) return false;
  const S = _obtenerStore(), db = _obtenerDB();
  await S.setDoc(S.doc(db, 'apoyos', _idApoyo(u.uid, analistaUid)), { activo: false, cancelado: S.serverTimestamp() }, { merge: true });
  return true;
}
export async function apoyoActivo(analistaUid) {
  if (!analistaUid || !await _asegurarListo()) return false;
  const u = usuarioActual(); if (!u) return false;
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const snap = await S.getDoc(S.doc(db, 'apoyos', _idApoyo(u.uid, analistaUid)));
    return snap.exists() && snap.data().activo === true;
  } catch (_) { return false; }
}
/* Analistas que el usuario apoya (activos). */
export async function misApoyos() {
  if (!await _asegurarListo()) return [];
  const u = usuarioActual(); if (!u) return [];
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = S.query(S.collection(db, 'apoyos'), S.where('uid', '==', u.uid), S.where('activo', '==', true));
    const snap = await S.getDocs(q);
    const out = []; snap.forEach(d => out.push(d.data().analistaUid));
    return out;
  } catch (_) { return []; }
}
/* Nº de suscriptores de pago activos de un analista. */
export async function contarApoyos(analistaUid) {
  if (!analistaUid || !await _asegurarListo()) return 0;
  const S = _obtenerStore(), db = _obtenerDB();
  const q = S.query(S.collection(db, 'apoyos'), S.where('analistaUid', '==', analistaUid), S.where('activo', '==', true));
  try { if (S.getCountFromServer) { const c = await S.getCountFromServer(q); return c.data().count || 0; } } catch (_) {}
  try { const snap = await S.getDocs(q); return snap.size || 0; } catch (_) { return 0; }
}
/* Resumen de ingresos (admin): mapa analistaUid -> nº de apoyos activos. */
export async function resumenIngresos() {
  if (!await _asegurarListo()) return {};
  try {
    const S = _obtenerStore(), db = _obtenerDB();
    const q = S.query(S.collection(db, 'apoyos'), S.where('activo', '==', true));
    const snap = await S.getDocs(q);
    const out = {}; snap.forEach(d => { const a = d.data().analistaUid; if (a) out[a] = (out[a] || 0) + 1; });
    return out;
  } catch (_) { return {}; }
}
