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

/* Arranca la autenticación y avisa cada vez que cambia el estado */
export async function iniciarAuth(alCambiar) {
  const ok = await cargar();
  if (!ok) { alCambiar?.(null); return; }
  _fbAuth.onAuthStateChanged(_auth, async (u) => {
    if (u) {
      _usuario = { uid: u.uid, email: u.email, nombre: u.displayName || (u.email || '').split('@')[0], foto: u.photoURL || null };
      await asegurarPerfil(_usuario);
    } else {
      _usuario = null;
    }
    alCambiar?.(_usuario);
  });
}

/* Crea el documento de perfil si no existe (con estado de suscripción) */
async function asegurarPerfil(user) {
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = _fbStore;
    const ref = doc(_db, 'usuarios', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: user.email, nombre: user.nombre,
        creado: serverTimestamp(),
        suscripcion: { activo: false, plan: null, vence: null, metodo: null },
        rol: 'usuario',
      });
    }
  } catch (_) { /* si las reglas aún no permiten, no rompe el login */ }
}

export async function registrarCorreo(email, pass, nombre) {
  if (!await cargar()) throw new Error('Firebase no configurado');
  const cred = await _fbAuth.createUserWithEmailAndPassword(_auth, email, pass);
  if (nombre) { try { await _fbAuth.updateProfile(cred.user, { displayName: nombre }); } catch (_) {} }
  return cred.user;
}

export async function entrarCorreo(email, pass) {
  if (!await cargar()) throw new Error('Firebase no configurado');
  const cred = await _fbAuth.signInWithEmailAndPassword(_auth, email, pass);
  return cred.user;
}

export async function entrarGoogle() {
  if (!await cargar()) throw new Error('Firebase no configurado');
  const prov = new _fbAuth.GoogleAuthProvider();
  const cred = await _fbAuth.signInWithPopup(_auth, prov);
  return cred.user;
}

export async function salir() {
  if (!_auth) return;
  await _fbAuth.signOut(_auth);
}

/* Traduce códigos de error de Firebase a mensajes claros */
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
