/* ============================================================
   MESA · PANEL DE ADMINISTRACIÓN (pantalla completa)
   Secciones: Overview · Users · Analysis.
   Solo visible si esAdmin() (verificado en Firestore).
   ============================================================ */
import { esAdmin, listarUsuarios, fijarBloqueo, fijarSuscripcionUsuario, guardarAnalisis, borrarAnalisis, listarAnalisis } from './mesa-datos.js';
import { LIGAS, listarPartidos } from '../datos/proveedor.js';
import { PLANES, planPorId } from '../datos/planes.js';
import { salir, usuarioActual } from '../auth/auth.js';
import { marcarVistaPrevia } from '../auth/estado-pago.js';

let _cont = null, _usuarios = [], _analisis = [], _tab = 'resumen';
let _ligaSel = null, _partidos = [], _cargandoPart = false;

export async function abrirMesa() {
  _cont = document.getElementById('mesa-screen');
  if (!_cont) return;
  mostrar();
  _cont.innerHTML = cargando();
  const ok = await esAdmin();
  if (!ok) {
    _cont.innerHTML = accesoDenegado();
    _cont.querySelector('#mesa-volver')?.addEventListener('click', () => { location.hash = ''; location.reload(); });
    return;
  }
  render();
  cargarDatos();
}

function mostrar() {
  ['landing-screen', 'pricing-screen', 'app-screen'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  _cont.style.display = '';
  document.body.classList.add('en-mesa');
}

function cargando() { return `<div class="mesa-cargando">Loading…</div>`; }
function accesoDenegado() {
  return `<div class="mesa-denegado"><div class="md-ic">${IC.lock}</div><h2>Restricted area</h2><p>This panel is for administrators only.</p><button id="mesa-volver" class="mesa-btn">Go back</button></div>`;
}

function render() {
  const u = usuarioActual();
  _cont.innerHTML = `
    <div class="mesa">
      <aside class="mesa-side" id="mesa-side">
        <div class="mesa-side-top">
          <div class="mesa-marca">HANDICAPPER<span>Mesa</span></div>
          <button class="mesa-burger" id="mesa-burger" aria-label="Menu">${IC.menu}</button>
        </div>
        <nav class="mesa-nav" id="mesa-nav">
          <button data-tab="resumen" class="on">${IC.grid} Overview</button>
          <button data-tab="usuarios">${IC.users} Users</button>
          <button data-tab="analisis">${IC.pen} Analysis</button>
          <button class="mesa-ver" id="mesa-ver-sitio">${IC.eye} View site</button>
          <div class="mesa-yo">
            <div class="mesa-yo-av">${(u?.nombre || u?.email || '?').charAt(0).toUpperCase()}</div>
            <div class="mesa-yo-txt"><b>${esc(u?.nombre || '')}</b><span>${esc(u?.email || '')}</span></div>
          </div>
          <button class="mesa-salir" id="mesa-salir">${IC.exit} Log out</button>
        </nav>
      </aside>
      <main class="mesa-main" id="mesa-main"></main>
    </div>`;

  _cont.querySelectorAll('.mesa-nav button[data-tab]').forEach(b => b.onclick = () => {
    _tab = b.dataset.tab;
    _cont.querySelectorAll('.mesa-nav button[data-tab]').forEach(x => x.classList.toggle('on', x === b));
    _cont.querySelector('#mesa-nav').classList.remove('abierto');
    pintarTab();
  });
  _cont.querySelector('#mesa-burger').onclick = () => _cont.querySelector('#mesa-nav').classList.toggle('abierto');
  _cont.querySelector('#mesa-salir').onclick = async () => { await salir(); location.hash = ''; location.reload(); };
  _cont.querySelector('#mesa-ver-sitio').onclick = () => verSitio();
  pintarTab();
}

/* Entrar a la plataforma como admin, con todo desbloqueado */
function verSitio() {
  marcarVistaPrevia('premium');            // acceso total para el admin
  _cont.style.display = 'none';
  document.body.classList.remove('en-mesa');
  location.hash = '';
  // arranca la plataforma sin recargar
  import('../app.js').then(m => m.entrarComoAdmin?.()).catch(() => location.reload());
}

async function cargarDatos() {
  try { _usuarios = await listarUsuarios(); } catch (_) { _usuarios = []; }
  try { _analisis = await listarAnalisis(); } catch (_) { _analisis = []; }
  pintarTab();
}

function pintarTab() {
  const m = document.getElementById('mesa-main');
  if (!m) return;
  if (_tab === 'resumen') m.innerHTML = vistaResumen();
  else if (_tab === 'usuarios') { m.innerHTML = vistaUsuarios(); enlazarUsuarios(); }
  else if (_tab === 'analisis') { m.innerHTML = vistaAnalisis(); enlazarAnalisis(); }
}

/* ================= OVERVIEW ================= */
function activo(u) { return !!(u.suscripcion && u.suscripcion.activo); }
function precioMensual(planId) { const p = planPorId(planId); return p ? p.mensual : 0; }

function vistaResumen() {
  const total = _usuarios.length;
  const conPlan = _usuarios.filter(activo);
  const inactivos = total - conPlan.length;
  const mrr = conPlan.reduce((s, u) => s + precioMensual(u.suscripcion.plan), 0);
  const bloqueados = _usuarios.filter(u => u.bloqueado).length;
  const porPlan = PLANES.map(p => ({ nombre: p.nombre, n: conPlan.filter(u => u.suscripcion.plan === p.id).length }));

  const kpi = (etq, val, sub) => `<div class="mesa-kpi"><span class="k-etq">${etq}</span><span class="k-val">${val}</span>${sub ? `<span class="k-sub">${sub}</span>` : ''}</div>`;
  const max = Math.max(1, ...porPlan.map(x => x.n));
  const barras = porPlan.map(p => `<div class="mp-row"><span class="mp-n">${p.nombre}</span><div class="mp-bar"><i style="width:${(p.n / max) * 100}%"></i></div><span class="mp-v">${p.n}</span></div>`).join('');

  return `
    <div class="mesa-head"><h1>Overview</h1><p>Live snapshot of the platform.</p></div>
    <div class="mesa-kpis">
      ${kpi('Registered users', total)}
      ${kpi('Active', conPlan.length, 'paying members')}
      ${kpi('Inactive', inactivos, 'free / lapsed')}
      ${kpi('Monthly revenue', '$' + mrr.toFixed(2), 'MRR estimate')}
    </div>
    <div class="mesa-grid2">
      <div class="mesa-card"><div class="mc-t">Active by plan</div><div class="mp-lista">${barras}</div></div>
      <div class="mesa-card"><div class="mc-t">Health</div>
        <div class="mesa-mini"><span>Blocked accounts</span><b>${bloqueados}</b></div>
        <div class="mesa-mini"><span>Published signals</span><b>${_analisis.length}</b></div>
        <div class="mesa-mini"><span>Conversion</span><b>${total ? Math.round(conPlan.length / total * 100) : 0}%</b></div>
      </div>
    </div>`;
}

/* ================= USERS ================= */
function esActivoReciente(u) {
  // "activo" = con plan pagado. (Con el tiempo se puede sumar último acceso.)
  return activo(u);
}
function vistaUsuarios() {
  const filas = _usuarios.map(u => {
    const sub = u.suscripcion || {};
    const estado = u.bloqueado
      ? `<span class="pill red">Blocked</span>`
      : (sub.activo ? `<span class="pill on">${(planPorId(sub.plan)?.nombre || 'Active')}</span>` : `<span class="pill">Inactive</span>`);
    const vence = sub.vence ? new Date(sub.vence).toLocaleDateString() : '—';
    return `<tr class="${u.bloqueado ? 'blocked' : ''}">
      <td data-l="User"><div class="u-nom">${esc(u.nombre || '—')}</div><div class="u-mail">${esc(u.email || '')}</div></td>
      <td data-l="Status">${estado}</td>
      <td data-l="Expires">${vence}</td>
      <td data-l="Plan"><select data-plan="${u.uid}" class="u-select">
        <option value="">Inactive</option>
        ${PLANES.map(p => `<option value="${p.id}" ${sub.activo && sub.plan === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
      </select></td>
      <td data-l="Action"><button class="u-bloq ${u.bloqueado ? 'activo' : ''}" data-bloq="${u.uid}">${u.bloqueado ? 'Unblock' : 'Block'}</button></td>
    </tr>`;
  }).join('');
  const act = _usuarios.filter(esActivoReciente).length;
  return `
    <div class="mesa-head"><h1>Users</h1><p>${_usuarios.length} registered · ${act} active · ${_usuarios.length - act} inactive.</p></div>
    <div class="mesa-card mesa-card-tabla">
      <table class="mesa-tabla">
        <thead><tr><th>User</th><th>Status</th><th>Expires</th><th>Plan</th><th>Action</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="5" class="mesa-vacio">No users yet.</td></tr>'}</tbody>
      </table>
    </div>`;
}
function enlazarUsuarios() {
  _cont.querySelectorAll('[data-bloq]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.bloq; const u = _usuarios.find(x => x.uid === uid); if (!u) return;
    b.disabled = true;
    try { await fijarBloqueo(uid, !u.bloqueado); u.bloqueado = !u.bloqueado; pintarTab(); } catch (_) { b.disabled = false; }
  });
  _cont.querySelectorAll('[data-plan]').forEach(sel => sel.onchange = async () => {
    const uid = sel.dataset.plan; const u = _usuarios.find(x => x.uid === uid); if (!u) return;
    const planId = sel.value;
    let sub;
    if (!planId) sub = { activo: false, plan: null, vence: null, metodo: 'manual' };
    else { const v = new Date(); v.setMonth(v.getMonth() + 1); sub = { activo: true, plan: planId, vence: v.toISOString(), metodo: 'manual' }; }
    try { await fijarSuscripcionUsuario(uid, sub); u.suscripcion = sub; pintarTab(); } catch (_) {}
  });
}

/* ================= ANALYSIS ================= */
function vistaAnalisis() {
  const ligas = LIGAS.map(l => `<button class="an-liga ${_ligaSel === l.id ? 'on' : ''}" data-liga="${l.id}">
    <img src="${l.logo}" alt="${esc(l.nombre)}" onerror="this.style.display='none'"><span>${esc(l.corto || l.nombre)}</span></button>`).join('');

  let partidosHTML;
  if (!_ligaSel) partidosHTML = `<div class="an-hint">${IC.arrow} Pick a league to load its matches.</div>`;
  else if (_cargandoPart) partidosHTML = `<div class="an-hint">Loading matches…</div>`;
  else if (!_partidos.length) partidosHTML = `<div class="an-hint">No matches available in this league right now.</div>`;
  else partidosHTML = `<div class="an-grid">${_partidos.map(tarjetaPartidoAdmin).join('')}</div>`;

  const publicados = _analisis.length
    ? _analisis.map(a => `<div class="an-item">
        <div class="an-top"><b>${esc(a.equipos || a.matchId || a.id)}</b>${a.ajustar ? `<span class="an-adj">${a.prob}%</span>` : ''}</div>
        <div class="an-ver">${esc(a.veredicto || '')}</div>
        <div class="an-txt">${esc(a.texto || '')}</div>
        <button class="an-del" data-del="${esc(a.matchId || a.id)}">Delete</button>
      </div>`).join('')
    : '<p class="mesa-vacio">No signals published yet.</p>';

  return `
    <div class="mesa-head"><h1>Analysis</h1><p>Pick a league, choose a match, publish your signal.</p></div>
    <div class="an-ligas">${ligas}</div>
    <div class="mesa-grid-an">
      <div class="mesa-card">${partidosHTML}</div>
      <div class="mesa-card"><div class="mc-t">Published signals (${_analisis.length})</div><div class="an-lista">${publicados}</div></div>
    </div>`;
}

function tarjetaPartidoAdmin(p) {
  const ya = _analisis.find(a => a.matchId === p.id);
  return `<button class="an-card ${ya ? 'tiene' : ''}" data-match="${esc(p.id)}">
    <div class="anc-eq"><span class="anc-ab">${esc(p.local.abrev)}</span><span class="anc-pct oro">${p.mercado?.local ?? '—'}%</span></div>
    <div class="anc-vs">vs</div>
    <div class="anc-eq"><span class="anc-ab">${esc(p.visita.abrev)}</span><span class="anc-pct azul">${p.mercado?.visita ?? '—'}%</span></div>
    ${ya ? `<span class="anc-flag">${IC.check} signal</span>` : ''}
  </button>`;
}

function enlazarAnalisis() {
  _cont.querySelectorAll('[data-liga]').forEach(b => b.onclick = async () => {
    _ligaSel = b.dataset.liga; _cargandoPart = true; _partidos = []; pintarTab();
    try { _partidos = await listarPartidos(_ligaSel); } catch (_) { _partidos = []; }
    _cargandoPart = false; pintarTab();
  });
  _cont.querySelectorAll('[data-match]').forEach(b => b.onclick = () => abrirModalSenal(b.dataset.match));
  _cont.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await borrarAnalisis(b.dataset.del); _analisis = await listarAnalisis(); pintarTab(); } catch (_) { b.disabled = false; }
  });
}

/* Modal de señal */
function abrirModalSenal(matchId) {
  const p = _partidos.find(x => x.id === matchId); if (!p) return;
  const ya = _analisis.find(a => a.matchId === matchId);
  const bg = document.createElement('div');
  bg.className = 'an-modal-bg';
  bg.innerHTML = `
    <div class="an-modal">
      <button class="an-modal-x" id="anm-x">${IC.close}</button>
      <div class="anm-liga">${esc(p.liga)}</div>
      <div class="anm-duelo">
        <div class="anm-eq"><span class="anm-ab">${esc(p.local.nombre)}</span><span class="anm-base oro">${p.mercado?.local ?? '—'}%</span></div>
        <span class="anm-vs">VS</span>
        <div class="anm-eq"><span class="anm-ab">${esc(p.visita.nombre)}</span><span class="anm-base azul">${p.mercado?.visita ?? '—'}%</span></div>
      </div>

      <label class="anm-lbl">Your verdict</label>
      <div class="anm-fav">
        <button class="anm-fbtn on" data-fav="local">${esc(p.local.abrev)} wins</button>
        <button class="anm-fbtn" data-fav="visita">${esc(p.visita.abrev)} wins</button>
      </div>

      <label class="anm-lbl">Win probability for <b id="anm-fav-nom">${esc(p.local.abrev)}</b></label>
      <div class="anm-chips" id="anm-chips">
        ${[55, 60, 65, 70, 75, 80, 85, 90].map(v => `<button class="anm-chip" data-p="${v}">${v}%</button>`).join('')}
        <span class="anm-custom">Custom <input type="number" id="anm-prob" min="1" max="99" value="${p.mercado?.local ?? 60}"></span>
      </div>

      <label class="anm-lbl">Signal text (for Pro / Premium members)</label>
      <textarea id="anm-txt" class="mesa-area" rows="4" placeholder="Explain your reasoning…">${esc(ya?.texto || '')}</textarea>

      <label class="anm-check"><input type="checkbox" id="anm-adj" ${ya?.ajustar !== false ? 'checked' : ''}> Adjust the shown probability to back my signal</label>

      <div class="anm-acc">
        ${ya ? `<button class="mesa-btn" id="anm-del">Delete</button>` : ''}
        <button class="mesa-btn oro" id="anm-guardar">Publish signal</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  let fav = 'local';
  const probInput = bg.querySelector('#anm-prob');
  const favNom = bg.querySelector('#anm-fav-nom');
  bg.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
    fav = b.dataset.fav;
    bg.querySelectorAll('[data-fav]').forEach(x => x.classList.toggle('on', x === b));
    favNom.textContent = fav === 'local' ? p.local.abrev : p.visita.abrev;
    probInput.value = (fav === 'local' ? p.mercado?.local : p.mercado?.visita) ?? 60;
  });
  bg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    probInput.value = b.dataset.p;
    bg.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b));
  });
  const cerrar = () => bg.remove();
  bg.querySelector('#anm-x').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };

  bg.querySelector('#anm-guardar').onclick = async () => {
    let prob = Math.max(1, Math.min(99, Number(probInput.value) || 60));
    // La prob se guarda SIEMPRE como probabilidad del LOCAL (para la barra)
    const probLocal = fav === 'local' ? prob : 100 - prob;
    const favAb = fav === 'local' ? p.local.abrev : p.visita.abrev;
    const analisis = {
      equipos: `${p.local.abrev} vs ${p.visita.abrev}`,
      veredicto: `${favAb} to win`,
      texto: bg.querySelector('#anm-txt').value.trim(),
      ajustar: bg.querySelector('#anm-adj').checked,
      prob: probLocal,
      favorito: favAb,
    };
    const btn = bg.querySelector('#anm-guardar'); btn.disabled = true; btn.textContent = 'Publishing…';
    try { await guardarAnalisis(matchId, analisis); _analisis = await listarAnalisis(); cerrar(); pintarTab(); }
    catch (_) { btn.disabled = false; btn.textContent = 'Publish signal'; }
  };
  const del = bg.querySelector('#anm-del');
  if (del) del.onclick = async () => { del.disabled = true; try { await borrarAnalisis(matchId); _analisis = await listarAnalisis(); cerrar(); pintarTab(); } catch (_) { del.disabled = false; } };
}

/* ================= utilidades ================= */
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const IC = {
  grid: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
  users: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 0 1 0 6"/>'),
  pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  exit: svg('<path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'),
  eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  lock: svg('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  eyeClose: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: svg('<path d="M20 6L9 17l-5-5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};
function svg(inner) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">${inner}</svg>`; }
