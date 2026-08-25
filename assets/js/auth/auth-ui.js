/* ============================================================
   UI DE AUTENTICACIÓN — modal de entrar / registrarse.
   No depende de Firebase directamente: recibe las funciones por
   parámetro, así queda desacoplado y testeable.
   ============================================================ */
import { t, idiomaActual } from '../ui/idioma.js';

let _acc = null;   // acciones: { registrar, entrar, google, salir, mensajeError }

export function initAuthUI(acciones) { _acc = acciones; construirModal(); }

function construirModal() {
  if (document.getElementById('auth-modal')) return;
  const el = document.createElement('div');
  el.id = 'auth-modal';
  el.className = 'auth-bg';
  el.innerHTML = `
    <div class="auth-card">
      <button class="auth-x" id="auth-x" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="auth-marca">HANDICAPPER</div>
      <div class="auth-tabs">
        <button class="auth-tab on" data-modo="entrar">${t('auth.entrar')}</button>
        <button class="auth-tab" data-modo="registrar">${t('auth.registrar')}</button>
      </div>
      <button class="auth-google" id="auth-google">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.2-1.5H12z"/></svg>
        ${t('auth.google')}
      </button>
      <div class="auth-o"><span>${t('auth.o')}</span></div>
      <form class="auth-form" id="auth-form">
        <label class="auth-campo nombre-campo"><span>${t('auth.nombre')}</span><input type="text" id="auth-nombre" autocomplete="name"></label>
        <label class="auth-campo"><span>${t('auth.correo')}</span><input type="email" id="auth-email" autocomplete="email" required></label>
        <label class="auth-campo"><span>${t('auth.clave')}</span><input type="password" id="auth-pass" autocomplete="current-password" required minlength="6"></label>
        <div class="auth-error" id="auth-error"></div>
        <button type="submit" class="auth-enviar" id="auth-enviar">${t('auth.entrar')}</button>
      </form>
    </div>`;
  document.body.appendChild(el);

  let modo = 'entrar';
  const setModo = (m) => {
    modo = m;
    el.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('on', b.dataset.modo === m));
    el.querySelector('.nombre-campo').style.display = (m === 'registrar') ? 'block' : 'none';
    el.querySelector('#auth-enviar').textContent = (m === 'registrar') ? t('auth.crear') : t('auth.entrar');
    error('');
  };
  const error = (msg) => { el.querySelector('#auth-error').textContent = msg || ''; };

  el.querySelectorAll('.auth-tab').forEach(b => b.onclick = () => setModo(b.dataset.modo));
  el.querySelector('#auth-x').onclick = cerrarAuth;
  el.onclick = (e) => { if (e.target === el) cerrarAuth(); };

  el.querySelector('#auth-google').onclick = async () => {
    error('');
    try { await _acc.google(); cerrarAuth(); }
    catch (e) { error(_acc.mensajeError(e, idiomaActual())); }
  };

  el.querySelector('#auth-form').onsubmit = async (ev) => {
    ev.preventDefault();
    error('');
    const email = el.querySelector('#auth-email').value.trim();
    const pass = el.querySelector('#auth-pass').value;
    const nombre = el.querySelector('#auth-nombre').value.trim();
    const btn = el.querySelector('#auth-enviar');
    btn.disabled = true; btn.textContent = '…';
    try {
      if (modo === 'registrar') await _acc.registrar(email, pass, nombre);
      else await _acc.entrar(email, pass);
      cerrarAuth();
    } catch (e) {
      error(_acc.mensajeError(e, idiomaActual()));
    } finally {
      btn.disabled = false;
      btn.textContent = (modo === 'registrar') ? t('auth.crear') : t('auth.entrar');
    }
  };

  setModo('entrar');
}

export function abrirAuth() {
  const el = document.getElementById('auth-modal');
  if (el) { el.classList.add('abierto'); document.querySelector('#auth-email')?.focus(); }
}
export function cerrarAuth() {
  document.getElementById('auth-modal')?.classList.remove('abierto');
}
