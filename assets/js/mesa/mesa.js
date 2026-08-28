/* ============================================================
   MESA · PANEL DE ADMINISTRACIÓN (pantalla completa)
   Secciones: Overview · Users · Analysis.
   Solo visible si esAdmin() (verificado en Firestore).
   ============================================================ */
import { esAdmin, listarUsuarios, listarAdmins, fijarBloqueo, fijarSuscripcionUsuario, guardarAnalisis, borrarAnalisis, listarAnalisis } from './mesa-datos.js';
import { LIGAS, listarPartidos, detallePartido } from '../datos/proveedor.js';
import { PLANES, planPorId } from '../datos/planes.js';
import { salir, usuarioActual } from '../auth/auth.js';
import { marcarVistaPrevia } from '../auth/estado-pago.js';
import { idiomaActual } from '../ui/idioma.js';

let _cont = null, _usuarios = [], _analisis = [], _tab = 'resumen', _admins = [];
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
            <div class="mesa-yo-txt"><b>${esc(u?.nombre || '')}</b><span>${esc(correoCorto(u?.email || ''))}</span></div>
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

  // Delegación de clicks sobre _cont (que persiste): liga, partido, borrar, bloquear.
  if (!_cont._delegado) {
    _cont._delegado = true;
    _cont.addEventListener('click', (e) => {
      const liga = e.target.closest('[data-liga]');
      if (liga) { seleccionarLiga(liga.dataset.liga); return; }
      const match = e.target.closest('[data-match]');
      if (match) { abrirModalSenal(match.dataset.match); return; }
      const del = e.target.closest('[data-del]');
      if (del) { eliminarAnalisis(del.dataset.del, del); return; }
      const bloq = e.target.closest('[data-bloq]');
      if (bloq) { toggleBloqueo(bloq.dataset.bloq, bloq); return; }
    });
  }
  pintarTab();
}

/* Entrar a la plataforma como admin, con todo desbloqueado */
function verSitio() {
  marcarVistaPrevia('premium');            // acceso total para el admin
  document.body.classList.remove('en-mesa');
  try { history.replaceState(null, '', location.pathname); } catch (_) {}
  if (window.__handiVerSitio) window.__handiVerSitio();
  else location.reload();
}

async function cargarDatos() {
  try { _usuarios = await listarUsuarios(); } catch (_) { _usuarios = []; }
  try { _analisis = await listarAnalisis(); } catch (_) { _analisis = []; }
  try { _admins = await listarAdmins(); } catch (_) { _admins = []; }
  pintarTab();
}
function rolAdmin(u) {
  const a = _admins.find(x => x.uid === u.uid || (x.email && u.email && x.email.toLowerCase() === u.email.toLowerCase()));
  if (!a) return null;
  return a.rol || (u.email && u.email.toLowerCase().includes('oscar') ? 'Admin analyst' : 'Admin developer');
}
/* Correo compacto: yamicelan…@gmail.com */
function correoCorto(e) {
  const s = String(e || ''); const i = s.indexOf('@');
  if (i < 0) return s;
  const u = s.slice(0, i), d = s.slice(i);
  return (u.length > 6 ? u.slice(0, 5) + '…' : u) + d;
}
/* Nombre de equipo compacto para las tarjetas del panel (con el logo al lado basta) */
function nombreCortoEquipo(nombre) {
  const w = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (w.length <= 2) return nombre;
  return w[0].charAt(0).toUpperCase() + '. ' + w.slice(-1)[0];
}

function pintarTab() {
  const m = document.getElementById('mesa-main');
  if (!m) return;
  if (_tab === 'resumen') { m.innerHTML = vistaResumen(); enlazarResumen(); }
  else if (_tab === 'usuarios') { m.innerHTML = vistaUsuarios(); enlazarUsuarios(); }
  else if (_tab === 'analisis') { m.innerHTML = vistaAnalisis(); enlazarAnalisis(); }
}

/* ================= OVERVIEW ================= */
function activo(u) { return !!(u.suscripcion && u.suscripcion.activo); }function precioMensual(planId) { const p = planPorId(planId); return p ? p.mensual : 0; }

function enlazarResumen() {
  _cont.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => {
    _tab = b.dataset.goto;
    _cont.querySelectorAll('.mesa-nav button[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === _tab));
    pintarTab();
  });
}

function vistaResumen() {
  const total = _usuarios.length;
  const conPlan = _usuarios.filter(activo);
  const inactivos = total - conPlan.length;
  const mrr = conPlan.reduce((s, u) => s + precioMensual(u.suscripcion.plan), 0);
  const bloqueados = _usuarios.filter(u => u.bloqueado).length;
  const act = conPlan.length;
  const conv = total ? Math.round(act / total * 100) : 0;
  const COL = { basic: '#38a9f0', pro: '#e8b84b', premium: '#f0353a' };
  const porPlan = PLANES.map(p => ({ id: p.id, nombre: p.nombre, n: conPlan.filter(u => u.suscripcion.plan === p.id).length }));

  const C = 2 * Math.PI * 58; let off = 0;
  const segs = porPlan.map(p => { const len = act ? p.n / act * C : 0; const s = `<circle cx="75" cy="75" r="58" fill="none" stroke="${COL[p.id] || '#38a9f0'}" stroke-width="15" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 75 75)"/>`; off += len; return s; }).join('');
  const barras = porPlan.map(p => { const pct = act ? Math.round(p.n / act * 100) : 0; return `<div class="ov-plan ${p.id}"><div class="ov-plan-n"><i></i>${p.nombre}</div><div class="ov-plan-track"><i style="width:${pct}%"></i></div><div class="ov-plan-v">${p.n}</div><div class="ov-plan-pct">${pct}%</div></div>`; }).join('');

  const spark = (color, fill) => `<svg class="ov-spark" viewBox="0 0 300 64" preserveAspectRatio="none">${fill ? `<defs><linearGradient id="sg${color.slice(1)}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M0 48 C40 46 60 40 90 42 S150 30 190 34 240 22 300 26 L300 64 L0 64Z" fill="url(#sg${color.slice(1)})"/>` : ''}<path d="M0 48 C40 46 60 40 90 42 S150 30 190 34 240 22 300 26" fill="none" stroke="${color}" stroke-width="2.5"/></svg>`;

  const ICp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0111 0"/><path d="M16 5.5a3 3 0 010 5.6M17 20a5.5 5.5 0 00-3-4.9"/></svg>`;
  const ICu = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0113 0"/></svg>`;
  const ICx = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="8" r="3.2"/><path d="M3.5 20a6 6 0 0110-3.2"/><path d="M16 9l5 5M21 9l-5 5" stroke-linecap="round"/></svg>`;
  const ICd = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M16 7.5c0-2-1.8-3-4-3s-4 .9-4 2.8c0 3.7 8 2 8 5.7 0 2-1.9 3-4 3s-4-1-4-3"/></svg>`;
  const kpi = (cls, ic, lab, dot, val, cap, color, fill) => `<div class="ov-kpi">
      <div class="ov-kpi-lab ${cls}">${lab}${dot}</div>
      <div class="ov-kpi-row"><div class="ov-kpi-ic ${cls}">${ic}</div><div><div class="ov-kpi-num">${val}</div><div class="ov-kpi-cap">${cap}</div></div></div>
      ${spark(color, fill)}</div>`;

  return `
    <div class="ov-head"><h1>Overview</h1><p>Live snapshot of the platform.</p></div>
    <div class="ov-kpis">
      ${kpi('blue', ICp, 'Registered users', '', total, 'Total registered', '#38a9f0', true)}
      ${kpi('blue', ICu, 'Active', '<span class="ov-dot on"></span>', act, 'Paying members', '#38a9f0', false)}
      ${kpi('muted', ICx, 'Inactive', '<span class="ov-dot off"></span>', inactivos, 'Free / lapsed', '#7b8494', false)}
      ${kpi('gold', ICd, 'Monthly revenue', '', '$' + mrr.toFixed(2), 'MRR estimate', '#e8b84b', true)}
    </div>
    <div class="ov-grid2">
      <div class="ov-card"><div class="ov-card-t">Active by plan</div>
        <div class="ov-plan-wrap">
          <div class="ov-donut"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="58" fill="none" stroke="#1b2433" stroke-width="15"/>${segs}</svg><div class="ov-donut-mid"><div class="c">${act}</div><div class="t">Total</div></div></div>
          <div class="ov-plans">${barras}</div>
        </div></div>
      <div class="ov-card"><div class="ov-card-t heart">Health</div>
        <div class="ov-mini"><span>Blocked accounts</span><b>${bloqueados}</b></div>
        <div class="ov-mini"><span>Published signals</span><b>${_analisis.length}</b></div>
        <div class="ov-mini hl"><span>Conversion</span><b>${conv}%</b></div>
      </div>
    </div>
    <div class="ov-band"><div class="ov-band-t">Admin only</div>
      <div class="ov-band-grid">
        <button class="ov-adm" data-goto="usuarios"><span class="ov-adm-ic">${ICu}</span><span class="ov-adm-tx"><b>Manage users</b><em>Users, plans and blocks.</em></span><span class="ov-adm-go">›</span></button>
        <button class="ov-adm" data-goto="analisis"><span class="ov-adm-ic gear">${ICp}</span><span class="ov-adm-tx"><b>Analysis</b><em>Published analysis &amp; signals.</em></span><span class="ov-adm-go">›</span></button>
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
    const rol = rolAdmin(u);
    const estado = rol
      ? `<span class="pill admin">${esc(rol)}</span>`
      : (u.bloqueado
        ? `<span class="pill red">Blocked</span>`
        : (sub.activo ? `<span class="pill on">${(planPorId(sub.plan)?.nombre || 'Active')}</span>` : `<span class="pill">Inactive</span>`));
    const vence = sub.vence ? new Date(sub.vence).toLocaleDateString() : '—';
    return `<tr class="${u.bloqueado ? 'blocked' : ''}">
      <td data-l="User"><div class="u-nom">${esc(u.nombre || (u.email || '').split('@')[0] || '—')}</div><div class="u-mail">${esc(correoCorto(u.email || ''))}</div></td>
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
  _cont.querySelectorAll('[data-plan]').forEach(sel => sel.onchange = async () => {
    const uid = sel.dataset.plan; const u = _usuarios.find(x => x.uid === uid); if (!u) return;
    const planId = sel.value;
    let sub;
    if (!planId) sub = { activo: false, plan: null, vence: null, metodo: 'manual' };
    else { const v = new Date(); v.setMonth(v.getMonth() + 1); sub = { activo: true, plan: planId, vence: v.toISOString(), metodo: 'manual' }; }
    try { await fijarSuscripcionUsuario(uid, sub); u.suscripcion = sub; pintarTab(); } catch (_) {}
  });
}
async function toggleBloqueo(uid, btn) {
  const u = _usuarios.find(x => x.uid === uid); if (!u) return;
  if (btn) btn.disabled = true;
  try { await fijarBloqueo(uid, !u.bloqueado); u.bloqueado = !u.bloqueado; pintarTab(); } catch (_) { if (btn) btn.disabled = false; }
}

/* ================= ANALYSIS ================= */
function vistaAnalisis() {
  const ligas = LIGAS.map(l => `<button class="an-liga ${_ligaSel === l.id ? 'on' : ''}" data-liga="${l.id}">
    <img src="${l.logo}" alt="${esc(l.nombre)}" height="26" style="height:26px;width:auto" onerror="this.style.display='none'"><span>${esc(l.corto || l.nombre)}</span></button>`).join('');

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
  const eq = (e, pct, cls) => `<div class="anc-eq">
      <img class="anc-logo" src="${esc(e.logo || '')}" alt="${esc(e.abrev || '')}" onerror="this.style.visibility='hidden'">
      <span class="anc-pct ${cls}">${pct ?? '—'}%</span>
    </div>`;
  return `<button class="an-card ${ya ? 'tiene' : ''}" data-match="${esc(p.id)}" title="${esc(p.local.nombre)} vs ${esc(p.visita.nombre)}">
    ${eq(p.local, p.mercado?.local, 'oro')}
    <div class="anc-vs">VS</div>
    ${eq(p.visita, p.mercado?.visita, 'azul')}
    ${ya ? `<span class="anc-flag">${IC.check} signal</span>` : ''}
  </button>`;
}

function enlazarAnalisis() {
  // Los clicks de liga/partido/borrar se gestionan por delegación en render().
  // (Se mantiene la función por compatibilidad con pintarTab.)
}
function seleccionarLiga(id) {
  _ligaSel = id; _cargandoPart = true; _partidos = []; pintarTab();
  listarPartidos(id).then(ps => { _partidos = ps || []; }).catch(() => { _partidos = []; }).finally(() => { _cargandoPart = false; pintarTab(); });
}
async function eliminarAnalisis(matchId, btn) {
  if (btn) btn.disabled = true;
  try { await borrarAnalisis(matchId); _analisis = await listarAnalisis(); pintarTab(); } catch (_) { if (btn) btn.disabled = false; }
}

/* Modal de señal: dos sectores. Izquierda = análisis de la página
   (datos reales + ajustar %). Derecha = criterio del analista. */
async function abrirModalSenal(matchId) {
  const p = _partidos.find(x => x.id === matchId); if (!p) return;
  const ya = _analisis.find(a => a.matchId === matchId);
  const ES = idiomaActual() === 'es';
  const L = (en, es) => ES ? es : en;

  const ciudadNombre = (nom) => {
    const parts = String(nom || '').trim().split(/\s+/);
    return parts.length > 1 ? { ciudad: parts.slice(0, -1).join(' '), nombre: parts.slice(-1)[0] } : { ciudad: '', nombre: nom || '' };
  };
  const cl = ciudadNombre(p.local.nombre), cv = ciudadNombre(p.visita.nombre);
  const pL0 = Math.max(1, Math.min(99, ya?.prob ?? p.mercado?.local ?? 60));

  const IHome = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>`;
  const IAway = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l20-7-7 20-3-8-8-3z"/></svg>`;
  const ICal = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke-linecap="round"/></svg>`;
  const IClock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/></svg>`;
  const IPin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0114 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>`;
  const ITrophy = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 20h6M12 15v5"/></svg>`;
  const ICheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
  const IEye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const IClose = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const IBack = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>`;
  const IInfo = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>`;
  const logo = (eq) => eq.logo ? `<img class="anm2-logo" src="${esc(eq.logo)}" alt="" onerror="this.style.visibility='hidden'">` : `<span class="anm2-logo anm2-logo-fb">${esc(eq.abrev || '')}</span>`;
  const logoSm = (eq) => eq.logo ? `<img src="${esc(eq.logo)}" alt="" onerror="this.style.display='none'">` : '';

  const bg = document.createElement('div');
  bg.className = 'an-modal-bg anm2-bg';
  bg.innerHTML = `
  <div class="anm2">
    <div class="anm2-head">
      <button class="anm2-back" id="anm-x">${IBack}<span>${L('Match Analysis', 'Análisis de partido')}</span></button>
      <div class="anm2-head-r">
        <button class="anm2-prev" id="anm-prev">${IEye}${L('Preview', 'Vista previa')}</button>
        <button class="anm2-close2" id="anm-x2" aria-label="Close">${IClose}</button>
      </div>
    </div>

    <div class="anm2-banner">
      <div class="anm2-team l">${logo(p.local)}
        <div class="anm2-team-tx">${cl.ciudad ? `<span class="anm2-city">${esc(cl.ciudad)}</span>` : ''}<span class="anm2-name">${esc(cl.nombre)}</span><span class="anm2-side red">${L('Home', 'Casa')} ${IHome}</span></div>
      </div>
      <div class="anm2-mid"><span class="anm2-league">${esc(p.liga)}</span><span class="anm2-vs">VS</span><span class="anm2-date">${ICal}${esc(p.inicio || L('Date TBD', 'Fecha por definir'))}</span></div>
      <div class="anm2-team r">
        <div class="anm2-team-tx">${cv.ciudad ? `<span class="anm2-city">${esc(cv.ciudad)}</span>` : ''}<span class="anm2-name">${esc(cv.nombre)}</span><span class="anm2-side blue">${L('Away', 'Visita')} ${IAway}</span></div>${logo(p.visita)}
      </div>
    </div>

    <div class="anm2-body">
      <div class="anm2-col">
        <div class="anm2-card">
          <div class="anm2-card-t">${L('Match probabilities', 'Probabilidades del partido')}</div>
          <div class="anm2-card-s">${L('Set each team\u2019s win probability', 'Define la probabilidad de victoria para cada equipo')}</div>
          <div class="anm2-slider">
            <div class="anm2-sl-top">${logoSm(p.local)}<span class="anm2-sl-nm">${esc(p.local.nombre)}</span><b id="pv-l">${pL0}%</b></div>
            <input type="range" min="0" max="100" value="${pL0}" id="sl-l" class="anm2-range red">
            <div class="anm2-sl-ax"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          <div class="anm2-slider">
            <div class="anm2-sl-top">${logoSm(p.visita)}<span class="anm2-sl-nm">${esc(p.visita.nombre)}</span><b id="pv-v">${100 - pL0}%</b></div>
            <input type="range" min="0" max="100" value="${100 - pL0}" id="sl-v" class="anm2-range blue">
            <div class="anm2-sl-ax"><span>0%</span><span>50%</span><span>100%</span></div>
          </div>
          <div class="anm2-total">
            <div class="anm2-total-l"><span>${L('TOTAL', 'TOTAL')}</span><b id="tot">100%</b></div>
            <div class="anm2-bal" id="bal"><span class="anm2-bal-ic">${ICheck}</span><div><b>${L('Probabilities are balanced', 'Las probabilidades están balanceadas')}</b><em>${L('The probabilities sum to 100%', 'La suma de las probabilidades es 100%')}</em></div></div>
          </div>
        </div>
        <div class="anm2-card">
          <div class="anm2-card-t">${L('Match information', 'Información del partido')}</div>
          <div class="anm2-info">
            <div class="anm2-info-c">${ICal}<div><span>${L('Date', 'Fecha')}</span><b>${esc(p.fecha || L('TBD', 'Por definir'))}</b></div></div>
            <div class="anm2-info-c">${IClock}<div><span>${L('Time', 'Hora')}</span><b>${esc(p.inicio || L('TBD', 'Por definir'))}</b></div></div>
            <div class="anm2-info-c">${IPin}<div><span>${L('Stadium', 'Estadio')}</span><b>${esc(p.sede || L('TBD', 'Por definir'))}</b></div></div>
            <div class="anm2-info-c">${ITrophy}<div><span>${L('League', 'Liga')}</span><b>${esc(p.liga || '—')}</b></div></div>
            ${p.local.record ? `<div class="anm2-info-c">${ITrophy}<div><span>${esc(p.local.abrev)} ${L('record','récord')}</span><b>${esc(p.local.record)}${p.local.posicion ? ` · ${p.local.posicion}º` : ''}</b></div></div>` : ''}
            ${p.visita.record ? `<div class="anm2-info-c">${ITrophy}<div><span>${esc(p.visita.abrev)} ${L('record','récord')}</span><b>${esc(p.visita.record)}${p.visita.posicion ? ` · ${p.visita.posicion}º` : ''}</b></div></div>` : ''}
            ${(p.local.division || p.visita.division) ? `<div class="anm2-info-c">${IPin}<div><span>${L('Division','División')}</span><b>${esc(p.local.division || p.visita.division)}</b></div></div>` : ''}
          </div>
        </div>
      </div>

      <div class="anm2-col">
        <div class="anm2-card">
          <div class="anm2-card-t">${L('Your analysis', 'Tu análisis')}</div>
          <label class="anm2-lbl">${L('Who will win?', '¿Quién ganará?')}</label>
          <div class="anm2-pick">
            <button class="anm2-pick-b red" data-fav="local">${logoSm(p.local)}<span>${esc(p.local.nombre)}</span></button>
            <button class="anm2-pick-b blue" data-fav="visita">${logoSm(p.visita)}<span>${esc(p.visita.nombre)}</span></button>
          </div>
          <div class="anm2-hint" id="anm-hint">${L('Select the team you consider the winner', 'Selecciona el equipo que consideras ganador del partido')}</div>
          <label class="anm2-lbl">${L('Detailed analysis', 'Análisis detallado')}</label>
          <div class="anm2-ta"><textarea id="anm-txt" maxlength="1000" rows="5" placeholder="${L('Write your detailed analysis here…', 'Escribe tu análisis detallado aquí…')}">${esc(ya?.texto || '')}</textarea><span class="anm2-ta-c" id="cnt">0/1000</span></div>
          <label class="anm2-lbl">${L('Main market', 'Mercado principal')}</label>
          <div class="anm2-select"><select id="anm-mkt">
            <option value="ml">${L('Match winner (regulation)', 'Ganador del partido (Tiempo reglamentario)')}</option>
            <option value="ml_ot">${L('Match winner (incl. OT)', 'Ganador (incl. tiempo extra)')}</option>
            <option value="spread">${L('Spread / Handicap', 'Hándicap')}</option>
            <option value="totals">${L('Totals (Over/Under)', 'Totales (Más/Menos)')}</option>
          </select></div>
          <label class="anm2-lbl">${L('Analysis confidence', 'Confidencia en el análisis')}</label>
          <div class="anm2-conf" id="anm-conf">
            <button data-c="baja">${L('Low', 'Baja')}</button>
            <button data-c="media" class="on">${L('Medium', 'Media')}</button>
            <button data-c="alta">${L('High', 'Alta')}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="anm2-foot">
      <div class="anm2-note">${IInfo}<div><b>${L('Important', 'Importante')}</b><em>${L('Make sure the probabilities reflect your analysis and sum to 100%.', 'Asegúrate de que las probabilidades reflejen tu análisis y estén balanceadas al 100%.')}</em></div></div>
      <label class="anm2-apply"><input type="checkbox" id="anm-adj" ${ya?.ajustar !== false ? 'checked' : ''}><div><b>${L('Apply my probability on the site', 'Aplicar mi probabilidad en la página')}</b><em>${L('Users will see these probabilities', 'Los usuarios verán estas probabilidades')}</em></div></label>
      <div class="anm2-foot-btns">
        ${ya ? `<button class="anm2-btn danger" id="anm-del">${L('Delete', 'Eliminar')}</button>` : ''}
        <button class="anm2-btn primary" id="anm-guardar">${L('Publish signal', 'Publicar señal')}</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(bg);

  // ---- Sliders enlazados (arrastrables, suma = 100) ----
  const slL = bg.querySelector('#sl-l'), slV = bg.querySelector('#sl-v');
  const pvL = bg.querySelector('#pv-l'), pvV = bg.querySelector('#pv-v');
  const pintarRange = (el, val, color) => { el.style.background = `linear-gradient(90deg, ${color} 0%, ${color} ${val}%, rgba(255,255,255,.09) ${val}%, rgba(255,255,255,.09) 100%)`; };
  const refrescar = (val) => {
    val = Math.max(0, Math.min(100, Math.round(val)));
    slL.value = val; slV.value = 100 - val;
    pvL.textContent = val + '%'; pvV.textContent = (100 - val) + '%';
    pintarRange(slL, val, '#f0353a'); pintarRange(slV, 100 - val, '#38a9f0');
    bg.querySelector('#tot').textContent = '100%';
  };
  slL.oninput = () => refrescar(Number(slL.value));
  slV.oninput = () => refrescar(100 - Number(slV.value));
  refrescar(pL0);

  // ---- Selección de equipo ganador (empieza sin selección) ----
  let fav = null;
  bg.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
    fav = b.dataset.fav;
    bg.querySelectorAll('[data-fav]').forEach(x => x.classList.toggle('on', x === b));
    const hint = bg.querySelector('#anm-hint'); hint.classList.remove('err');
    hint.textContent = L('Select the team you consider the winner', 'Selecciona el equipo que consideras ganador del partido');
  });

  // ---- Confianza ----
  let conf = 'media';
  bg.querySelectorAll('#anm-conf button').forEach(b => b.onclick = () => {
    conf = b.dataset.c; bg.querySelectorAll('#anm-conf button').forEach(x => x.classList.toggle('on', x === b));
  });

  // ---- Contador del textarea ----
  const ta = bg.querySelector('#anm-txt'), cnt = bg.querySelector('#cnt');
  const actCnt = () => cnt.textContent = `${ta.value.length}/1000`;
  ta.oninput = actCnt; actCnt();

  const cerrar = () => bg.remove();
  bg.querySelector('#anm-x').onclick = cerrar;
  bg.querySelector('#anm-x2')?.addEventListener('click', cerrar);
  bg.querySelector('#anm-prev').onclick = () => {
    const prev = bg.querySelector('#anm-prev'); const t = prev.querySelector('span') || prev;
    prev.disabled = true; const orig = prev.innerHTML;
    prev.innerHTML = L('Signals section coming soon', 'Sección de señales muy pronto');
    setTimeout(() => { prev.innerHTML = orig; prev.disabled = false; }, 1800);
  };
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };

  const publicar = async (estado) => {
    if (!fav) {
      const hint = bg.querySelector('#anm-hint'); hint.classList.add('err');
      hint.textContent = L('Please select the team you think will win.', 'Por favor selecciona el equipo que crees que va a ganar.');
      bg.querySelector('.anm2-pick').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const probLocal = Number(slL.value);
    const favAb = fav === 'local' ? p.local.abrev : p.visita.abrev;
    const analisis = {
      equipos: `${p.local.abrev} vs ${p.visita.abrev}`,
      veredicto: `${favAb} ${L('to win', 'gana')}`,
      texto: ta.value.trim(),
      ajustar: bg.querySelector('#anm-adj').checked,
      prob: probLocal, favorito: favAb, confianza: conf,
      mercado: bg.querySelector('#anm-mkt').value, estado,
    };
    const btn = bg.querySelector(estado === 'borrador' ? '#anm-draft' : '#anm-guardar');
    const txtBtn = btn.textContent; btn.disabled = true; btn.textContent = '…';
    try { await guardarAnalisis(matchId, analisis); _analisis = await listarAnalisis(); cerrar(); pintarTab(); }
    catch (_) { btn.disabled = false; btn.textContent = txtBtn; }
  };
  bg.querySelector('#anm-guardar').onclick = () => publicar('publicado');
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
