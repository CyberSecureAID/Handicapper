/* ============================================================
   AUTENTICACIÓN (Firebase Auth) + perfil en Firestore.
   Usa Firebase por CDN (módulos ESM), sin instalar nada ni backend.

   Expone:
     iniciarAuth(alCambiar)  -> arranca; llama alCambiar(usuario|null)
     registrarCorreo(email, pass, nombre)
     entrarCorreo(email, pass)
     entrarGoogle()
     salir()
     usuarioActual()

   Si firebase-config.js no está configurado, todo queda en "modo
   invitado" (no rompe la app): usuarioActual() = null y las funciones
   de login avisan de que falta configurar Firebase.
   ============================================================ */
import { firebaseConfig, firebaseListo } from './firebase-config.js';

const VER = '10.12.2';
const U = (m) => `https://www.gstatic.com/firebasejs/${VER}/firebase-${m}.js`;

let _app = null, _auth = null, _db = null;
let _fbAuth = null, _fbStore = null;
let _usuario = null;

/* Promesa con tope de tiempo: si no resuelve en `ms`, rechaza (no deja colgado). */
function _conTimeout(promesa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promesa).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

async function _importarSDK() {
  const appMod = await import(U('app'));
  _fbAuth = await import(U('auth'));
  _fbStore = await import(U('firestore'));
  return appMod;
}

/* Carga perezosa de los SDK solo si Firebase está configurado.
   Con tope de tiempo y un reintento: si el CDN se cuelga, lanza en vez de
   dejar el login congelado para siempre. */
async function cargar() {
  if (_app) return true;
  if (!firebaseListo) return false;
  let appMod, ultimo;
  for (let intento = 0; intento < 2 && !appMod; intento++) {
    try { appMod = await _conTimeout(_importarSDK(), 12000); }
    catch (e) { ultimo = e; }
  }
  if (!appMod) { const e = new Error('No se pudo cargar Firebase'); e.code = 'red'; throw e; }
  _app = appMod.initializeApp(firebaseConfig);
  _auth = _fbAuth.getAuth(_app);
  _db = _fbStore.getFirestore(_app);
  return true;
}

export function usuarioActual() { return _usuario; }
export function estaConfigurado() { return firebaseListo; }

/* Accesores internos para el panel de administración (mesa) */
export async function _asegurarListo() { return cargar(); }
export function _obtenerDB() { return _db; }
export function _obtenerStore() { return _fbStore; }
export function _obtenerAuth() { return _auth; }

/* Aplica al usuario en memoria los campos del perfil de Firestore. */
function _aplicarPerfil(perfil) {
  if (!perfil || !_usuario) return;
  _usuario.suscripcion = perfil.suscripcion || null;
  _usuario.rol = perfil.rol || 'usuario';
  _usuario.usuario = perfil.usuario || '';
  if (perfil.foto) _usuario.foto = perfil.foto;   // foto real del perfil (Firestore)
}

/* Arranca la autenticación y avisa cada vez que cambia el estado */
export async function iniciarAuth(alCambiar) {
  let ok;
  try { ok = await cargar(); }
  catch (_) { alCambiar?.(null, { error: 'red' }); return; }   // SDK no cargó: entra como invitado, no congela
  if (!ok) { alCambiar?.(null); return; }
  _fbAuth.onAuthStateChanged(_auth, async (u) => {
    const intencional = _intencional; _intencional = false;
    if (!u) { _usuario = null; alCambiar?.(null, { intencional }); return; }
    _usuario = { uid: u.uid, email: u.email, nombre: u.displayName || (u.email || '').split('@')[0], foto: u.photoURL || null };
    // Perfil con TOPE de tiempo: no bloquea la entrada si la red va lenta.
    let perfil = null;
    try { perfil = await _conTimeout(asegurarPerfil(_usuario), 6000); } catch (_) { perfil = null; }
    // Si el administrador bloqueó esta cuenta, se cierra la sesión de inmediato.
    if (perfil && perfil.bloqueado) {
      _usuario = null;
      try { await _fbAuth.signOut(_auth); } catch (_) {}
      alCambiar?.(null, { bloqueado: true });
      return;
    }
    _aplicarPerfil(perfil);
    alCambiar?.(_usuario, { intencional });                 // navega YA, con lo que haya
    if (!perfil) _reintentarPerfil(alCambiar, intencional);  // completa el perfil en segundo plano
  });
}

/* Si el perfil no cargó a tiempo (red lenta), reintenta en segundo plano y
   re-notifica para aplicar suscripción/rol/foto, sin bloquear la entrada. */
async function _reintentarPerfil(alCambiar, intencional) {
  const uid0 = _usuario && _usuario.uid;
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    if (!_usuario || _usuario.uid !== uid0) return;   // la sesión cambió o se cerró
    let perfil = null;
    try { perfil = await _conTimeout(asegurarPerfil(_usuario), 6000); } catch (_) {}
    if (!perfil) continue;
    if (perfil.bloqueado) {
      _usuario = null;
      try { await _fbAuth.signOut(_auth); } catch (_) {}
      alCambiar?.(null, { bloqueado: true });
      return;
    }
    _aplicarPerfil(perfil);
    alCambiar?.(_usuario, { intencional, perfilTardio: true });
    return;
  }
}

/* Crea el documento de perfil si no existe; devuelve el perfil actual */
async function asegurarPerfil(user) {
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = _fbStore;
    const ref = doc(_db, 'usuarios', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const nuevo = {
        email: user.email, nombre: user.nombre,
        creado: serverTimestamp(),
        suscripcion: { activo: false, plan: null, vence: null, metodo: null },
        rol: 'usuario', bloqueado: false,
      };
      await setDoc(ref, nuevo);
      return nuevo;
    }
    return snap.data();
  } catch (_) { return null; }
}

let _intencional = false;

export async function registrarCorreo(email, pass, nombre) {
  if (!await cargar()) throw new Error('Firebase no configurado');
  _intencional = true;
  const cred = await _fbAuth.createUserWithEmailAndPassword(_auth, email, pass);
  if (nombre) { try { await _fbAuth.updateProfile(cred.user, { displayName: nombre }); } catch (_) {} }
  return cred.user;
}

export async function entrarCorreo(email, pass) {
  if (!await cargar()) throw new Error('Firebase no configurado');
  _intencional = true;
  const cred = await _fbAuth.signInWithEmailAndPassword(_auth, email, pass);
  return cred.user;
}

export async function entrarGoogle() {
  if (!await cargar()) throw new Error('Firebase no configurado');
  _intencional = true;
  const prov = new _fbAuth.GoogleAuthProvider();
  const cred = await _fbAuth.signInWithPopup(_auth, prov);
  return cred.user;
}

export async function salir() {
  if (!_auth) return;
  await _fbAuth.signOut(_auth);
}

/* ¿La sesión actual entró con Google? (entonces no gestiona correo/contraseña aquí) */
export function esCuentaGoogle() {
  const u = _auth && _auth.currentUser;
  return !!(u && (u.providerData || []).some(p => p.providerId === 'google.com'));
}

/* Actualiza el perfil del usuario: nombre, nombre de usuario, correo y/o contraseña.
   Reautentica con la contraseña actual cuando Firebase lo exige (cambio de correo o
   contraseña). Lanza errores con .code para que la interfaz muestre el mensaje adecuado. */
export async function actualizarPerfil({ nombre, usuario, email, password, passwordActual }) {
  if (!await cargar()) throw new Error('Firebase no configurado');
  const u = _auth.currentUser;
  if (!u) { const e = new Error('no-session'); e.code = 'no-session'; throw e; }
  const esGoogle = (u.providerData || []).some(p => p.providerId === 'google.com');
  const cambiaEmail = !!(email && email !== u.email);
  const cambiaPass = !!password;

  if ((cambiaEmail || cambiaPass) && esGoogle) { const e = new Error('google'); e.code = 'google-no-pass'; throw e; }

  // Reautenticar si se cambia correo o contraseña
  if (cambiaEmail || cambiaPass) {
    if (!passwordActual) { const e = new Error('reauth'); e.code = 'reauth-needed'; throw e; }
    const cred = _fbAuth.EmailAuthProvider.credential(u.email, passwordActual);
    await _fbAuth.reauthenticateWithCredential(u, cred);
  }

  if (nombre && nombre !== u.displayName) { await _fbAuth.updateProfile(u, { displayName: nombre }); }
  if (cambiaEmail) { await _fbAuth.updateEmail(u, email); }
  if (cambiaPass) { await _fbAuth.updatePassword(u, password); }

  // Documento de perfil en Firestore
  try {
    const { doc, updateDoc } = _fbStore;
    const patch = {};
    if (nombre) patch.nombre = nombre;
    if (usuario != null) patch.usuario = usuario;
    if (cambiaEmail) patch.email = email;
    if (Object.keys(patch).length) await updateDoc(doc(_db, 'usuarios', u.uid), patch);
  } catch (_) {}

  if (_usuario) {
    if (nombre) _usuario.nombre = nombre;
    if (usuario != null) _usuario.usuario = usuario;
    if (cambiaEmail) _usuario.email = email;
  }
  return { esGoogle };
}

/* Traduce códigos de error de Firebase a mensajes claros */
/* Guarda (o quita) la foto de perfil del usuario en Firestore. foto = dataURL o null. */
export async function guardarFotoUsuario(foto) {
  await cargar();
  const u = _auth && _auth.currentUser;
  if (!u) throw new Error('no-session');
  const { doc, updateDoc } = _fbStore;
  await updateDoc(doc(_db, 'usuarios', u.uid), { foto: foto || null });
  if (_usuario) _usuario.foto = foto || null;
  // Identidad del analista "Jesús": si quien actualiza es admin (el desarrollador),
  // se refleja su foto en el análisis del cerebro para TODOS los usuarios.
  try {
    if (_usuario && _usuario.rol === 'admin') {
      const { setDoc, serverTimestamp } = _fbStore;
      await setDoc(doc(_db, 'config', 'analista'), { foto: foto || null, ts: serverTimestamp() }, { merge: true });
      if (typeof window !== 'undefined') window.__jesusFoto = foto || null;
    }
  } catch (_) {}
  return true;
}

/* Publica la foto del analista Jesús (la llama app.js SOLO cuando confirma que es admin). */
export async function sincronizarFotoAnalista(foto) {
  try {
    if (!await cargar()) return;
    const { doc, setDoc, serverTimestamp } = _fbStore;
    await setDoc(doc(_db, 'config', 'analista'), { foto: foto || null, ts: serverTimestamp() }, { merge: true });
    if (typeof window !== 'undefined') { window.__jesusFoto = foto || null; window.__pintarJesus && window.__pintarJesus(); }
  } catch (_) {}
}

/* Carga la foto del analista "Jesús" (pública) para mostrarla en el cerebro a todos. */
export async function cargarFotoAnalista() {
  try {
    if (!await cargar()) return null;
    const { doc, getDoc } = _fbStore;
    const snap = await getDoc(doc(_db, 'config', 'analista'));
    const foto = snap.exists() ? (snap.data().foto || null) : null;
    if (typeof window !== 'undefined') { window.__jesusFoto = foto; window.__pintarJesus && window.__pintarJesus(); }
    return foto;
  } catch (_) { return null; }
}

/* Elimina la cuenta: borra el documento de Firestore y el usuario de Firebase Auth. */
/* Reautentica al usuario con su contraseña (para acciones sensibles como borrar la cuenta).
   Devuelve true si OK; lanza si la contraseña es incorrecta. Para cuentas de Google, omite (true). */
export async function reautenticar(pass) {
  await cargar();
  const u = _auth && _auth.currentUser;
  if (!u) return false;
  const esGoogle = (u.providerData || []).some(p => p && p.providerId === 'google.com');
  if (esGoogle) return true;   // Google no usa contraseña; se omite
  const cred = _fbAuth.EmailAuthProvider.credential(u.email, pass);
  await _fbAuth.reauthenticateWithCredential(u, cred);
  return true;
}

export async function eliminarCuenta() {
  await cargar();
  const u = _auth && _auth.currentUser;
  if (!u) throw new Error('no-session');
  try { await _fbStore.deleteDoc(_fbStore.doc(_db, 'usuarios', u.uid)); } catch (_) {}
  await u.delete();   // puede lanzar 'auth/requires-recent-login' si la sesión es antigua
  _usuario = null;
  return true;
}

export function mensajeError(e, idioma = 'en') {
  const code = (e && e.code) || '';
  const es = {
    'auth/invalid-email': 'Correo inválido.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ese correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
    'red': 'Problema de conexión. Revisa tu internet e intenta de nuevo.',
  };
  const en = {
    'auth/invalid-email': 'Invalid email.',
    'auth/user-not-found': 'No account with that email.',
    'auth/wrong-password': 'Wrong password.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in window was closed.',
    'red': 'Connection problem. Check your internet and try again.',
  };
  const tabla = idioma === 'es' ? es : en;
  return tabla[code] || (idioma === 'es' ? 'No se pudo completar. Intenta de nuevo.' : 'Could not complete. Try again.');
}
