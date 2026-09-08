/* ============================================================
   CHAT DE COMUNIDAD (estilo Telegram, paleta de la plataforma)
   - Solo Pro y Premium (y admin). Básico/Inactivo ven aviso para mejorar.
   - Firestore: colección 'chat'. Escucha SOLO los últimos 50 (carga ligera).
   - Anti-spam: 1 mensaje cada 4s por usuario.
   - Los Premium muestran foto; los Pro, iniciales.
   - No sube archivos (solo texto), para aguantar mucha gente.
   ============================================================ */
import { _obtenerStore, _obtenerDB, usuarioActual } from '../auth/auth.js';
import { planActual } from '../auth/estado-pago.js';
import { PALABRAS_DEFECTO, terminoProhibido, detectarPublicidad } from '../datos/moderacion.js';
import { leerModeracion } from '../mesa/mesa-datos.js';

let _palabras = [...PALABRAS_DEFECTO];   // lista base + las del admin (se cargan al abrir)

const LIMITE = 50;          // mensajes que se muestran
const ANTISPAM_MS = 4000;   // 1 mensaje cada 4 segundos
const MAX_LEN = 400;

let _unsub = null;          // para cortar la escucha al salir
let _ultimoEnvio = 0;

function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

function iniciales(nombre) {
  const p = (nombre || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

/* Nivel efectivo del usuario para el chat: admin/premium/pro/otro */
function nivelChat(esAdmin) {
  if (esAdmin) return 'admin';
  const p = planActual();
  if (p === 'premium') return 'premium';
  if (p === 'pro') return 'pro';
  return 'basic';
}

export function cerrarChat() { if (_unsub) { try { _unsub(); } catch (_) {} _unsub = null; } }

export function pintarChat(cont, { esAdmin = false, abrirPlanes = null } = {}) {
  cerrarChat();
  const ES = (localStorage.getItem('handicapper-idioma') || 'en') === 'es';
  const L = (en, es) => ES ? es : en;
  const nivel = nivelChat(esAdmin);
  const puedeEscribir = nivel === 'admin' || nivel === 'premium' || nivel === 'pro';

  // Básico/Inactivo: aviso para mejorar (no acceden al chat)
  if (!puedeEscribir) {
    cont.innerHTML = `<div class="chat-lock">
      <div class="chat-lock-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V8a5 5 0 0110 0v3"/><rect x="4" y="11" width="16" height="9" rx="2"/></svg></div>
      <h3>${L('Community chat', 'Chat de la comunidad')}</h3>
      <p>${L('The live chat is for Pro and Premium members. Upgrade your plan to join the conversation.', 'El chat en vivo es para miembros Pro y Premium. Mejora tu plan para unirte a la conversación.')}</p>
      <button class="chat-lock-btn" id="chat-upgrade">${L('View plans', 'Ver planes')}</button>
    </div>`;
    const up = cont.querySelector('#chat-upgrade');
    if (up) up.onclick = () => { if (abrirPlanes) abrirPlanes(); };
    return;
  }

  cont.innerHTML = `<div class="chat">
    <div class="chat-head"><span class="chat-live"><i></i>${L('Community chat', 'Chat de la comunidad')}</span><span class="chat-head-s">${L('Be respectful. Not betting advice.', 'Sé respetuoso. No es asesoría de apuestas.')}</span></div>
    <div class="chat-msgs" id="chat-msgs"><div class="chat-cargando">${L('Loading messages…', 'Cargando mensajes…')}</div></div>
    <form class="chat-bar" id="chat-bar" autocomplete="off">
      <input id="chat-in" type="text" maxlength="${MAX_LEN}" placeholder="${L('Write a message…', 'Escribe un mensaje…')}" autocomplete="off" spellcheck="true">
      <button type="submit" class="chat-send" id="chat-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
    </form>
  </div>`;

  const msgsEl = cont.querySelector('#chat-msgs');
  const form = cont.querySelector('#chat-bar');
  const input = cont.querySelector('#chat-in');
  const yo = usuarioActual() || {};

  // Cargar las palabras prohibidas del admin (se suman a la lista base)
  leerModeracion().then(w => { if (Array.isArray(w) && w.length) _palabras = [...PALABRAS_DEFECTO, ...w]; }).catch(() => {});

  // ---- Escuchar los últimos mensajes en tiempo real ----
  let S, db;
  try { S = _obtenerStore(); db = _obtenerDB(); } catch (_) {}
  if (!S || !db) { msgsEl.innerHTML = `<div class="chat-cargando">${L('Chat unavailable right now.', 'Chat no disponible ahora.')}</div>`; return; }

  const q = S.query(S.collection(db, 'chat'), S.orderBy('ts', 'desc'), S.limit(LIMITE));
  _unsub = S.onSnapshot(q, (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    arr.reverse(); // más antiguos arriba
    pintarMensajes(msgsEl, arr, yo, L);
  }, () => { msgsEl.innerHTML = `<div class="chat-cargando">${L('Could not load the chat.', 'No se pudo cargar el chat.')}</div>`; });

  // ---- Enviar ----
  form.onsubmit = async (e) => {
    e.preventDefault();
    const texto = (input.value || '').trim();
    if (!texto) return;
    const ahora = Date.now();
    if (ahora - _ultimoEnvio < ANTISPAM_MS) {
      avisoChat(input, L('Wait a moment before sending again.', 'Espera un momento antes de enviar de nuevo.'));
      return;
    }
    if (terminoProhibido(texto, _palabras)) { avisoChat(input, L('That language is not allowed here.', 'Ese lenguaje no está permitido aquí.')); return; }
    if (detectarPublicidad(texto)) { avisoChat(input, L('Links and ads are not allowed.', 'No se permiten enlaces ni publicidad.')); return; }
    _ultimoEnvio = ahora;
    input.value = '';
    try {
      await S.addDoc(S.collection(db, 'chat'), {
        uid: yo.uid || null,
        nombre: yo.nombre || (ES ? 'Usuario' : 'User'),
        foto: nivel === 'premium' ? (yo.foto || null) : null,   // solo Premium muestra foto
        nivel,
        texto: texto.slice(0, MAX_LEN),
        ts: S.serverTimestamp(),
      });
      limpiarViejos(S, db, nivel);   // poda mensajes viejos (solo si es admin; regla lo exige)
    } catch (_) { avisoChat(input, L('Could not send. Try again.', 'No se pudo enviar. Intenta de nuevo.')); }
  };
}

/* Poda los mensajes que exceden el tope, para que la colección no crezca infinito.
   Solo el admin puede borrar (regla de Firestore). Se ejecuta de vez en cuando. */
const TOPE_CHAT = 150;
async function limpiarViejos(S, db, nivel) {
  if (nivel !== 'admin') return;               // la regla solo permite borrar al admin
  if (Math.random() > 0.25) return;            // no en cada mensaje, para no gastar de más
  try {
    const q = S.query(S.collection(db, 'chat'), S.orderBy('ts', 'desc'), S.limit(TOPE_CHAT + 80));
    const snap = await S.getDocs(q);
    const docs = []; snap.forEach(d => docs.push(d));
    if (docs.length > TOPE_CHAT) {
      const sobra = docs.slice(TOPE_CHAT);       // los más viejos
      for (const d of sobra) { try { await S.deleteDoc(d.ref); } catch (_) {} }
    }
  } catch (_) {}
}

function pintarMensajes(cont, arr, yo, L) {
  if (!arr.length) { cont.innerHTML = `<div class="chat-cargando">${L('No messages yet. Say hi!', 'Aún no hay mensajes. ¡Saluda!')}</div>`; return; }
  const cercaAbajo = cont.scrollHeight - cont.scrollTop - cont.clientHeight < 120;
  cont.innerHTML = arr.map(m => {
    const propio = m.uid && yo.uid && m.uid === yo.uid;
    const av = m.foto
      ? `<span class="chat-av"><img src="${esc(m.foto)}" alt="" onerror="this.parentNode.textContent='${esc(iniciales(m.nombre))}'"></span>`
      : `<span class="chat-av chat-av-ini">${esc(iniciales(m.nombre))}</span>`;
    const badge = m.nivel === 'premium' ? '<span class="chat-badge prem">Premium</span>' : (m.nivel === 'admin' ? '<span class="chat-badge adm">Staff</span>' : '');
    return `<div class="chat-m ${propio ? 'yo' : ''}">
      ${propio ? '' : av}
      <div class="chat-b">
        ${propio ? '' : `<div class="chat-nm">${esc(m.nombre)}${badge}</div>`}
        <div class="chat-tx">${esc(m.texto)}</div>
      </div>
    </div>`;
  }).join('');
  if (cercaAbajo || true) cont.scrollTop = cont.scrollHeight; // baja al fondo con cada mensaje nuevo
}

function avisoChat(input, msg) {
  const cont = input.closest('.chat');
  if (!cont) return;
  let t = cont.querySelector('.chat-toast');
  if (!t) { t = document.createElement('div'); t.className = 'chat-toast'; cont.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}
