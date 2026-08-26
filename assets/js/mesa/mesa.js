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
  const bg = document.createElement('div');
  bg.className = 'an-modal-bg';
  bg.innerHTML = `
    <div class="an-modal grande">
      <button class="an-modal-x" id="anm-x">${IC.close}</button>
      <div class="anm-liga">${esc(p.liga)}</div>
      <div class="anm-duelo">
        <div class="anm-eq"><img class="anm-logo" src="${esc(p.local.logo||'')}" onerror="this.style.visibility='hidden'"><span class="anm-ab">${esc(p.local.nombre)}</span></div>
        <span class="anm-vs">VS</span>
        <div class="anm-eq"><img class="anm-logo" src="${esc(p.visita.logo||'')}" onerror="this.style.visibility='hidden'"><span class="anm-ab">${esc(p.visita.nombre)}</span></div>
      </div>

      <div class="anm-dos">
        <!-- SECTOR IZQUIERDO: análisis de la página -->
        <section class="anm-sec izq">
          <div class="anm-sec-cab"><h4>${idiomaActual()==='es'?'Análisis de la página':'Page analysis'}</h4>
            <button class="anm-edit" id="anm-editar">${idiomaActual()==='es'?'Editar':'Edit'}</button></div>
          <div class="anm-pag">
            <div class="anm-prob-vis">
              <div class="anm-pv-row"><span>${esc(p.local.abrev)}</span><b class="oro">${p.mercado?.local ?? '—'}%</b></div>
              <div class="anm-bar"><i style="width:${p.mercado?.local ?? 0}%"></i></div>
              <div class="anm-pv-row"><span>${esc(p.visita.abrev)}</span><b class="azul">${p.mercado?.visita ?? '—'}%</b></div>
            </div>
            <div id="anm-datos" class="anm-datos">${idiomaActual()==='es'?'Cargando datos del partido…':'Loading match data…'}</div>
          </div>
          <div id="anm-editbox" class="anm-editbox" style="display:none">
            <label class="anm-lbl">${idiomaActual()==='es'?'Corrige la probabilidad de':'Adjust probability for'} <b id="anm-fav-nom">${esc(p.local.abrev)}</b></label>
            <div class="anm-chips" id="anm-chips">
              ${[55,60,65,70,75,80,85,90].map(v=>`<button class="anm-chip" data-p="${v}">${v}%</button>`).join('')}
              <span class="anm-custom">${idiomaActual()==='es'?'Otro':'Custom'} <input type="number" id="anm-prob" min="1" max="99" value="${p.mercado?.local ?? 60}"></span>
            </div>
          </div>
        </section>

        <!-- SECTOR DERECHO: análisis del analista -->
        <section class="anm-sec der">
          <div class="anm-sec-cab"><h4>${idiomaActual()==='es'?'Tu análisis':'Your analysis'}</h4></div>
          <label class="anm-lbl">${idiomaActual()==='es'?'¿Quién gana?':'Who wins?'}</label>
          <div class="anm-fav">
            <button class="anm-fbtn on" data-fav="local">${esc(p.local.abrev)}</button>
            <button class="anm-fbtn" data-fav="visita">${esc(p.visita.abrev)}</button>
          </div>
          <label class="anm-lbl">${idiomaActual()==='es'?'Ingresa tu análisis aquí':'Enter your analysis here'}</label>
          <textarea id="anm-txt" class="mesa-area" rows="7" placeholder="${idiomaActual()==='es'?'Escribe tu criterio para los miembros Pro / Premium…':'Write your reasoning for Pro / Premium members…'}">${esc(ya?.texto||'')}</textarea>
        </section>
      </div>

      <div class="anm-acc">
        ${ya ? `<button class="mesa-btn" id="anm-del">${idiomaActual()==='es'?'Eliminar':'Delete'}</button>` : ''}
        <label class="anm-check"><input type="checkbox" id="anm-adj" ${ya?.ajustar!==false?'checked':''}> ${idiomaActual()==='es'?'Aplicar mi probabilidad en la página':'Apply my probability on the site'}</label>
        <button class="mesa-btn oro" id="anm-guardar">${idiomaActual()==='es'?'Publicar señal':'Publish signal'}</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  // Trae datos reales (abridores, líderes) para el sector izquierdo
  detallePartido(matchId).then(d => {
    const cont = bg.querySelector('#anm-datos'); if (!cont || !d) return;
    const mano = (a) => a?.mano === 'L' ? 'LHP' : (a?.mano === 'R' ? 'RHP' : '');
    const bloque = (lado, e) => {
      const partes = [];
      if (e.abridor?.nombre) partes.push(`<div class="anm-d-row"><span>${idiomaActual()==='es'?'Abridor':'Starter'}</span><b>${esc(e.abridor.nombre)} ${mano(e.abridor)?`<em>${mano(e.abridor)}</em>`:''}</b></div>`);
      const lids = (d.jugadores && d.jugadores[lado]) || [];
      lids.slice(0,2).forEach(j => partes.push(`<div class="anm-d-row"><span>${esc(j.etiqueta)}</span><b>${esc(j.nombre)} ${esc(j.dato)}</b></div>`));
      if (!partes.length) return '';
      return `<div class="anm-d-col"><div class="anm-d-cab">${esc(e.abrev)}</div>${partes.join('')}</div>`;
    };
    const html = bloque('local', d.local) + bloque('visita', d.visita);
    cont.innerHTML = html || (idiomaActual()==='es'?'Sin datos públicos para este partido todavía.':'No public data for this match yet.');
  }).catch(()=>{ const c=bg.querySelector('#anm-datos'); if(c) c.textContent=''; });

  let fav = 'local';
  const probInput = bg.querySelector('#anm-prob');
  const favNom = bg.querySelector('#anm-fav-nom');
  bg.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
    fav = b.dataset.fav;
    bg.querySelectorAll('[data-fav]').forEach(x => x.classList.toggle('on', x === b));
    if (favNom) favNom.textContent = fav === 'local' ? p.local.abrev : p.visita.abrev;
    if (probInput) probInput.value = (fav === 'local' ? p.mercado?.local : p.mercado?.visita) ?? 60;
  });
  bg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    if (probInput) probInput.value = b.dataset.p;
    bg.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b));
  });
  bg.querySelector('#anm-editar').onclick = () => {
    const box = bg.querySelector('#anm-editbox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  };
  const cerrar = () => bg.remove();
  bg.querySelector('#anm-x').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };

  bg.querySelector('#anm-guardar').onclick = async () => {
    const prob = Math.max(1, Math.min(99, Number(probInput?.value) || 60));
    const probLocal = fav === 'local' ? prob : 100 - prob;
    const favAb = fav === 'local' ? p.local.abrev : p.visita.abrev;
    const analisis = {
      equipos: `${p.local.abrev} vs ${p.visita.abrev}`,
      veredicto: `${favAb} ${idiomaActual()==='es'?'gana':'to win'}`,
      texto: bg.querySelector('#anm-txt').value.trim(),
      ajustar: bg.querySelector('#anm-adj').checked,
      prob: probLocal,
      favorito: favAb,
    };
    const btn = bg.querySelector('#anm-guardar'); btn.disabled = true; btn.textContent = '…';
    try { await guardarAnalisis(matchId, analisis); _analisis = await listarAnalisis(); cerrar(); pintarTab(); }
    catch (_) { btn.disabled = false; btn.textContent = idiomaActual()==='es'?'Publicar señal':'Publish signal'; }
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
