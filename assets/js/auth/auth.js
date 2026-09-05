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

/* Carga perezosa de los SDK solo si Firebase está configurado */
async function cargar() {
  if (_app) return true;
  if (!firebaseListo) return false;
  const appMod = await import(U('app'));
  _fbAuth = await import(U('auth'));
  _fbStore = await import(U('firestore'));
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

/* Arranca la autenticación y avisa cada vez que cambia el estado */
export async function iniciarAuth(alCambiar) {
  const ok = await cargar();
  if (!ok) { alCambiar?.(null); return; }
  _fbAuth.onAuthStateChanged(_auth, async (u) => {
    const intencional = _intencional; _intencional = false;
    if (u) {
      _usuario = { uid: u.uid, email: u.email, nombre: u.displayName || (u.email || '').split('@')[0], foto: u.photoURL || null };
      const perfil = await asegurarPerfil(_usuario);
      // Si el administrador bloqueó esta cuenta, se cierra la sesión de inmediato.
      if (perfil && perfil.bloqueado) {
        _usuario = null;
        try { await _fbAuth.signOut(_auth); } catch (_) {}
        alCambiar?.(null, { bloqueado: true });
        return;
      }
      if (perfil) {
        _usuario.suscripcion = perfil.suscripcion || null; _usuario.rol = perfil.rol || 'usuario'; _usuario.usuario = perfil.usuario || '';
        if (perfil.foto) _usuario.foto = perfil.foto;   // foto real del perfil (Firestore)
        // Analista "Jesús": si el admin (desarrollador) YA tiene foto, se refleja sin re-guardar.
        if (_usuario.rol === 'admin' && _usuario.foto) {
          try {
            const { doc, setDoc } = _fbStore;
            setDoc(doc(_db, 'config', 'analista'), { foto: _usuario.foto }, { merge: true });
            if (typeof window !== 'undefined') window.__jesusFoto = _usuario.foto;
          } catch (_) {}
        }
      }
    } else {
      _usuario = null;
    }
    alCambiar?.(_usuario, { intencional });
  });
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

/* Carga la foto del analista "Jesús" (pública) para mostrarla en el cerebro a todos. */
export async function cargarFotoAnalista() {
  try {
    if (!await cargar()) return null;
    const { doc, getDoc } = _fbStore;
    const snap = await getDoc(doc(_db, 'config', 'analista'));
    const foto = snap.exists() ? (snap.data().foto || null) : null;
    if (typeof window !== 'undefined') window.__jesusFoto = foto;
    return foto;
  } catch (_) { return null; }
}

/* Elimina la cuenta: borra el documento de Firestore y el usuario de Firebase Auth. */
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
  };
  const en = {
    'auth/invalid-email': 'Invalid email.',
    'auth/user-not-found': 'No account with that email.',
    'auth/wrong-password': 'Wrong password.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in window was closed.',
  };
  const tabla = idioma === 'es' ? es : en;
  return tabla[code] || (idioma === 'es' ? 'No se pudo completar. Intenta de nuevo.' : 'Could not complete. Try again.');
}
