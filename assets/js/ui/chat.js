/* ============================================================
   CHAT DE COMUNIDAD (estilo Telegram, paleta de la plataforma)
   - Solo Pro/Premium/Visitante y admin. Básico ve aviso para mejorar.
   - Firestore 'chat'. Escucha SOLO los últimos 50 (carga ligera).
   - Anti-spam 4s. Filtro de groserías y publicidad (moderación del admin).
   - Tocar/clic un mensaje: Copiar, Responder, y Eliminar (propio; admin borra cualquiera).
   - Muestra NOMBRE (no usuario/correo) + foto (Premium) o iniciales.
   ============================================================ */
import { _obtenerStore, _obtenerDB, usuarioActual } from '../auth/auth.js';
import { planActual } from '../auth/estado-pago.js';
import { PALABRAS_DEFECTO, terminoProhibido, detectarPublicidad } from '../datos/moderacion.js';
// mesa-datos.js se carga de forma diferida al abrir el chat (no al arrancar la app)

const LIMITE = 50;
const ANTISPAM_MS = 4000;
const MAX_LEN = 400;
const TOPE_CHAT = 150;

/* Stickers de fútbol/deportes: emojis Noto (Google) servidos por CDN, sin subir nada.
   [código hex para el CDN, carácter emoji de respaldo]. */
const STK_CDN = (code) => `https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/${code}.svg`;
const STICKERS = [
  ['26BD','⚽'], ['1F945','🥅'], ['1F3C6','🏆'], ['1F3C5','🏅'], ['1F451','👑'], ['1F410','🐐'],
  ['1F525','🔥'], ['1F4AA','💪'], ['1F44F','👏'], ['1F64C','🙌'], ['1F4AF','💯'], ['2B50','⭐'],
  ['1F3AF','🎯'], ['26A1','⚡'], ['1F389','🎉'], ['1F91D','🤝'], ['1F60E','😎'], ['1F631','😱'],
  ['1F602','😂'], ['1F62D','😭'], ['1F3C0','🏀'], ['1F3C8','🏈'], ['26BE','⚾'], ['1F3D2','🏒'],
];

let _unsub = null, _ultimoEnvio = 0, _palabras = [...PALABRAS_DEFECTO];
let _S = null, _db = null, _yo = {}, _nivel = 'basic', _msgs = [], _respondiendo = null, _L = (a) => a, _trad = {};

function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
function iniciales(n) { const p = (n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function nivelChat(esAdmin) { if (esAdmin) return 'admin'; const p = planActual(); if (p === 'premium') return 'premium'; if (p === 'pro') return 'pro'; return 'basic'; }

export function cerrarChat() { if (_unsub) { try { _unsub(); } catch (_) {} _unsub = null; } cerrarMenu(); }

export function pintarChat(cont, { esAdmin = false, abrirPlanes = null } = {}) {
  cerrarChat();
  const ES = (localStorage.getItem('handicapper-idioma') || 'en') === 'es';
  const L = (en, es) => ES ? es : en; _L = L;
  _nivel = nivelChat(esAdmin);
  const puedeEscribir = _nivel !== 'basic';

  if (!puedeEscribir) {
    cont.innerHTML = `<div class="chat-lock">
      <div class="chat-lock-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V8a5 5 0 0110 0v3"/><rect x="4" y="11" width="16" height="9" rx="2"/></svg></div>
      <h3>${L('Community chat', 'Chat de la comunidad')}</h3>
      <p>${L('The live chat is for Pro and Premium members. Upgrade your plan to join the conversation.', 'El chat en vivo es para miembros Pro y Premium. Mejora tu plan para unirte a la conversación.')}</p>
      <button class="chat-lock-btn" id="chat-upgrade">${L('View plans', 'Ver planes')}</button>
    </div>`;
    const up = cont.querySelector('#chat-upgrade'); if (up) up.onclick = () => { if (abrirPlanes) abrirPlanes(); };
    return;
  }

  cont.innerHTML = `<div class="chat">
    <div class="chat-head"><div class="chat-head-l"><span class="chat-live"><i></i>${L('Community chat', 'Chat de la comunidad')}</span><span class="chat-head-s">${L('Be respectful. Not betting advice.', 'Sé respetuoso. No es asesoría de apuestas.')}</span></div>
      <button class="chat-bell" id="chat-bell" title="${L('Analyst alerts', 'Avisos de analistas')}" aria-label="alerts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg></button>
    </div>
    <div class="chat-msgs" id="chat-msgs"><div class="chat-cargando">${L('Loading messages…', 'Cargando mensajes…')}</div></div>
    <div class="chat-reply" id="chat-reply" hidden><div class="chat-reply-tx"><b id="chat-reply-nm"></b><span id="chat-reply-msg"></span></div><button class="chat-reply-x" id="chat-reply-x" aria-label="Cancel">&times;</button></div>
    <div class="chat-stk-panel" id="chat-stk-panel" hidden>${STICKERS.map(([c, e]) => `<button class="chat-stk-b" data-stk="${c}" data-emoji="${e}" title="${e}"><img src="${STK_CDN(c)}" alt="${e}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${e}'))"></button>`).join('')}</div>
    <form class="chat-bar" id="chat-bar" autocomplete="off">
      <button type="button" class="chat-stk-btn" id="chat-stk-btn" aria-label="Stickers"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1"/></svg></button>
      <input id="chat-in" type="text" maxlength="${MAX_LEN}" placeholder="${L('Write a message…', 'Escribe un mensaje…')}" autocomplete="off" spellcheck="true">
      <button type="submit" class="chat-send" id="chat-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
    </form>
  </div>`;

  const msgsEl = cont.querySelector('#chat-msgs');
  const form = cont.querySelector('#chat-bar');
  const input = cont.querySelector('#chat-in');
  _yo = usuarioActual() || {};

  import('../mesa/mesa-datos.js').then(mod => mod.leerModeracion()).then(w => { if (Array.isArray(w) && w.length) _palabras = [...PALABRAS_DEFECTO, ...w]; }).catch(() => {});

  try { _S = _obtenerStore(); _db = _obtenerDB(); } catch (_) {}
  if (!_S || !_db) { msgsEl.innerHTML = `<div class="chat-cargando">${L('Chat unavailable right now.', 'Chat no disponible ahora.')}</div>`; return; }

  const q = _S.query(_S.collection(_db, 'chat'), _S.orderBy('ts', 'desc'), _S.limit(LIMITE));
  let _primeraCarga = true;
  _unsub = _S.onSnapshot(q, (snap) => {
    // Notificar avisos de bots NUEVOS (no en la carga inicial)
    if (!_primeraCarga && _avisosBotsOn()) {
      try {
        snap.docChanges().forEach(ch => {
          if (ch.type === 'added') {
            const d = ch.doc.data();
            if (d && d.nivel === 'bot' && d.uid !== _yo.uid) _notiBot(d);
          }
        });
      } catch (_) {}
    }
    _primeraCarga = false;
    const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); arr.reverse();
    _msgs = arr; pintarMensajes(msgsEl, arr);
  }, () => { msgsEl.innerHTML = `<div class="chat-cargando">${L('Could not load the chat.', 'No se pudo cargar el chat.')}</div>`; });

  // Campana: activar/desactivar avisos de analistas (bots)
  const bell = cont.querySelector('#chat-bell');
  if (bell) {
    bell.classList.toggle('on', _avisosBotsOn());
    bell.onclick = async () => {
      const nuevo = !_avisosBotsOn();
      _setAvisosBots(nuevo);
      bell.classList.toggle('on', nuevo);
      if (nuevo && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (_) {} }
      avisoChat(input, nuevo ? L('Analyst alerts on', 'Avisos de analistas activados') : L('Analyst alerts off', 'Avisos de analistas desactivados'));
    };
  }

  // Tocar/clic izquierdo un mensaje -> menú de acciones
  msgsEl.addEventListener('click', (e) => {
    const el = e.target.closest('.chat-m'); if (!el) return;
    abrirMenu(el, el.dataset.id);
  });
  // Clic DERECHO sobre un mensaje -> nuestro menú (no el del navegador ni el de estatus global)
  msgsEl.addEventListener('contextmenu', (e) => {
    const el = e.target.closest('.chat-m'); if (!el) return;
    e.preventDefault();
    e.stopPropagation();   // evita que salga el menú global de estatus detrás
    abrirMenu(el, el.dataset.id, e);
  });

  // Cancelar respuesta
  cont.querySelector('#chat-reply-x').onclick = () => setRespuesta(null);

  // Panel de stickers
  const stkBtn = cont.querySelector('#chat-stk-btn');
  const stkPanel = cont.querySelector('#chat-stk-panel');
  stkBtn.onclick = () => { stkPanel.hidden = !stkPanel.hidden; };
  stkPanel.querySelectorAll('[data-stk]').forEach(b => b.onclick = () => {
    stkPanel.hidden = true;
    enviarMsg({ sticker: b.dataset.stk, texto: b.dataset.emoji });
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const texto = (input.value || '').trim(); if (!texto) return;
    if (terminoProhibido(texto, _palabras)) { avisoChat(input, L('That language is not allowed here.', 'Ese lenguaje no está permitido aquí.')); return; }
    if (detectarPublicidad(texto)) { avisoChat(input, L('Links and ads are not allowed.', 'No se permiten enlaces ni publicidad.')); return; }
    input.value = '';
    enviarMsg({ texto });
  };
}

/* Envía un mensaje (texto normal o sticker). */
async function enviarMsg({ texto, sticker = null }) {
  if (!_S || !_db) return;
  const ES = (localStorage.getItem('handicapper-idioma') || 'en') === 'es';
  const input = document.getElementById('chat-in');
  const ahora = Date.now();
  if (ahora - _ultimoEnvio < ANTISPAM_MS) { if (input) avisoChat(input, _L('Wait a moment before sending again.', 'Espera un momento antes de enviar de nuevo.')); return; }
  _ultimoEnvio = ahora;
  const doc = {
    uid: _yo.uid || null,
    nombre: _yo.nombre || (ES ? 'Usuario' : 'User'),
    foto: _nivel === 'premium' ? (_yo.foto || null) : null,
    nivel: _nivel, texto: (texto || '').slice(0, MAX_LEN), ts: _S.serverTimestamp(),
  };
  if (sticker) doc.sticker = sticker;
  if (_respondiendo) doc.respuestaA = { nombre: _respondiendo.nombre, texto: (_respondiendo.texto || '').slice(0, 120) };
  setRespuesta(null);
  try { await _S.addDoc(_S.collection(_db, 'chat'), doc); limpiarViejos(); }
  catch (_) { if (input) avisoChat(input, _L('Could not send. Try again.', 'No se pudo enviar. Intenta de nuevo.')); }
}

function pintarMensajes(cont, arr) {
  const L = _L;
  if (!arr.length) { cont.innerHTML = `<div class="chat-cargando">${L('No messages yet. Say hi!', 'Aún no hay mensajes. ¡Saluda!')}</div>`; return; }
  cont.innerHTML = arr.map(m => {
    const propio = m.uid && _yo.uid && m.uid === _yo.uid;
    const av = m.foto
      ? `<span class="chat-av"><img src="${esc(m.foto)}" alt="" onerror="this.parentNode.textContent='${esc(iniciales(m.nombre))}'"></span>`
      : `<span class="chat-av chat-av-ini">${esc(iniciales(m.nombre))}</span>`;
    const badge = m.nivel === 'premium' ? '<span class="chat-badge prem">Premium</span>' : (m.nivel === 'admin' ? '<span class="chat-badge adm">Staff</span>' : '');
    const quote = m.respuestaA ? `<div class="chat-quote"><b>${esc(m.respuestaA.nombre)}</b><span>${esc(m.respuestaA.texto)}</span></div>` : '';
    // Sticker: emoji grande sin burbuja
    if (m.sticker && /^[0-9A-Fa-f-]{2,}$/.test(m.sticker)) {
      return `<div class="chat-m stk ${propio ? 'yo' : ''}" data-id="${esc(m.id)}">
        ${propio ? '' : av}
        <div class="chat-stk-msg">
          ${propio ? '' : `<div class="chat-nm">${esc(m.nombre)}${badge}</div>`}
          ${quote}
          <img class="chat-stk-img" src="https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/${esc(m.sticker)}.svg" alt="${esc(m.texto)}" onerror="this.replaceWith(document.createTextNode('${esc(m.texto)}'))">
        </div>
      </div>`;
    }
    return `<div class="chat-m ${propio ? 'yo' : ''}" data-id="${esc(m.id)}">
      ${propio ? '' : av}
      <div class="chat-b">
        ${propio ? '' : `<div class="chat-nm">${esc(m.nombre)}${badge}</div>`}
        ${quote}
        <div class="chat-tx">${esc(m.texto)}</div>
        ${_trad[m.id] ? `<div class="chat-trad"><span>${_L('Translated', 'Traducido')}</span>${esc(_trad[m.id])}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  cont.scrollTop = cont.scrollHeight;
}

/* ---- Menú de acciones al tocar un mensaje ---- */
function cerrarMenu() { document.getElementById('chat-menu')?.remove(); }
function abrirMenu(el, id, ev) {
  cerrarMenu();
  const m = _msgs.find(x => x.id === id); if (!m) return;
  const L = _L;
  const propio = m.uid && _yo.uid && m.uid === _yo.uid;
  const puedeBorrar = propio || _nivel === 'admin';
  const menu = document.createElement('div'); menu.className = 'chat-menu'; menu.id = 'chat-menu';
  menu.innerHTML = `
    <button data-act="responder">${L('Reply', 'Responder')}</button>
    <button data-act="copiar">${L('Copy', 'Copiar')}</button>
    ${(m.texto && !m.sticker) ? `<button data-act="traducir">${L('Translate', 'Traducir')}</button>` : ''}
    ${puedeBorrar ? `<button data-act="borrar" class="del">${L('Delete', 'Eliminar')}</button>` : ''}`;
  document.body.appendChild(menu);
  // Posicionar: en el cursor si es clic derecho; si no, cerca del mensaje. SIEMPRE dentro del chat.
  const r = el.getBoundingClientRect();
  const box = el.closest('.chat');
  const cr = box ? box.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  const mh = menu.offsetHeight, mw = menu.offsetWidth;
  let top, left;
  if (ev && typeof ev.clientX === 'number') { top = ev.clientY; left = ev.clientX; }
  else { top = r.top - mh - 6; if (top < cr.top + 6) top = r.bottom + 6; left = r.left; }
  top = Math.max(cr.top + 6, Math.min(top, cr.bottom - mh - 6));
  left = Math.max(cr.left + 6, Math.min(left, cr.right - mw - 6));
  menu.style.top = top + 'px'; menu.style.left = left + 'px';
  requestAnimationFrame(() => menu.classList.add('on'));
  menu.querySelectorAll('button').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); accion(b.dataset.act, m); cerrarMenu(); });
  setTimeout(() => document.addEventListener('click', cerrarMenu, { once: true }), 0);
}

async function accion(act, m) {
  const L = _L;
  if (act === 'copiar') { try { await navigator.clipboard.writeText(m.texto || ''); } catch (_) {} return; }
  if (act === 'responder') { setRespuesta({ nombre: m.nombre, texto: m.texto }); document.getElementById('chat-in')?.focus(); return; }
  if (act === 'traducir') { traducirMensaje(m); return; }
  if (act === 'borrar') {
    try { await _S.deleteDoc(_S.doc(_db, 'chat', m.id)); }
    catch (_) { const inp = document.getElementById('chat-in'); if (inp) avisoChat(inp, L('Could not delete.', 'No se pudo eliminar.')); }
  }
}

/* Traduce UN mensaje en el propio dispositivo (API del navegador), gratis y privado.
   Destino = idioma de la app. Si el navegador no lo soporta (ej. iPhone hoy), avisa sin romper. */
async function traducirMensaje(m) {
  const L = _L;
  const inp = document.getElementById('chat-in');
  const target = (localStorage.getItem('handicapper-idioma') || 'en') === 'es' ? 'es' : 'en';
  if (_trad[m.id]) { delete _trad[m.id]; pintarMensajes(document.getElementById('chat-msgs'), _msgs); return; } // segundo toque = quitar
  const texto = (m.texto || '').trim();
  if (!texto) return;
  if (inp) avisoChat(inp, L('Translating…', 'Traduciendo…'));
  try {
    // Google Translate (endpoint público gtx): auto-detecta el idioma de origen. Gratis, sin clave.
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + target + '&dt=t&q=' + encodeURIComponent(texto.slice(0, 400));
    const r = await fetch(url);
    if (!r.ok) throw new Error('http');
    const d = await r.json();
    let out = '';
    if (Array.isArray(d) && Array.isArray(d[0])) out = d[0].map(seg => (seg && seg[0]) ? seg[0] : '').join('');
    out = (out || '').trim();
    if (out) { _trad[m.id] = out; pintarMensajes(document.getElementById('chat-msgs'), _msgs); }
    else if (inp) { avisoChat(inp, L('Could not translate.', 'No se pudo traducir.')); }
  } catch (_) {
    // Respaldo: MyMemory
    try {
      const src = target === 'es' ? 'en' : 'es';
      const r2 = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(texto.slice(0, 400)) + '&langpair=' + src + '|' + target);
      const d2 = await r2.json();
      const o2 = d2 && d2.responseData && d2.responseData.translatedText;
      if (o2 && !/^MYMEMORY WARNING/i.test(o2)) { _trad[m.id] = o2; pintarMensajes(document.getElementById('chat-msgs'), _msgs); }
      else if (inp) avisoChat(inp, L('Could not translate right now.', 'No se pudo traducir ahora.'));
    } catch (__) { if (inp) avisoChat(inp, L('Could not translate right now.', 'No se pudo traducir ahora.')); }
  }
}

function setRespuesta(r) {
  _respondiendo = r;
  const bar = document.getElementById('chat-reply'); if (!bar) return;
  if (r) { document.getElementById('chat-reply-nm').textContent = r.nombre || ''; document.getElementById('chat-reply-msg').textContent = r.texto || ''; bar.hidden = false; }
  else { bar.hidden = true; }
}

/* ---- Auto-limpieza (solo admin; la regla exige admin para borrar) ---- */
async function limpiarViejos() {
  if (_nivel !== 'admin') return;
  if (Math.random() > 0.25) return;
  try {
    const q = _S.query(_S.collection(_db, 'chat'), _S.orderBy('ts', 'desc'), _S.limit(TOPE_CHAT + 80));
    const snap = await _S.getDocs(q); const docs = []; snap.forEach(d => docs.push(d));
    if (docs.length > TOPE_CHAT) for (const d of docs.slice(TOPE_CHAT)) { try { await _S.deleteDoc(d.ref); } catch (_) {} }
  } catch (_) {}
}

function avisoChat(input, msg) {
  const cont = input.closest('.chat'); if (!cont) return;
  let t = cont.querySelector('.chat-toast');
  if (!t) { t = document.createElement('div'); t.className = 'chat-toast'; cont.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}

/* --- Avisos de analistas (bots) en el chat: preferencia + notificación --- */
function _avisosBotsOn() {
  try { const n = JSON.parse(localStorage.getItem('se_notif') || '{}'); return n.bots !== false; } catch (_) { return true; }
}
function _setAvisosBots(v) {
  try { const n = JSON.parse(localStorage.getItem('se_notif') || '{}'); n.bots = !!v; localStorage.setItem('se_notif', JSON.stringify(n)); } catch (_) {}
}
async function _notiBot(d) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: (d.texto || '').slice(0, 140), icon: 'assets/imagenes/apple-touch-icon.png', badge: 'assets/imagenes/favicon-32.png', vibrate: [180, 90, 180], tag: 'se-bot-' + (d.uid || ''), renotify: true, data: { url: './' } };
  try {
    if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); if (reg && reg.showNotification) { await reg.showNotification(d.nombre || 'Sports Expectations', opts); return; } }
    new Notification(d.nombre || 'Sports Expectations', opts);
  } catch (_) {}
}
