/* ============================================================
   MESA · PANEL DE ADMINISTRACIÓN (pantalla completa)
   Secciones: Resumen · Usuarios · Análisis.
   Solo visible si esAdmin() es verdadero (verificado en Firestore).
   ============================================================ */
import { esAdmin, listarUsuarios, fijarBloqueo, fijarSuscripcionUsuario, guardarAnalisis, borrarAnalisis, listarAnalisis } from './mesa-datos.js';
import { listarPartidos } from '../datos/proveedor.js';
import { PLANES, planPorId } from '../datos/planes.js';
import { salir, usuarioActual } from '../auth/auth.js';

let _cont = null, _usuarios = [], _analisis = [], _partidos = [];

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
  return `<div class="mesa-denegado">
    <div class="md-ic">🔒</div>
    <h2>Restricted area</h2>
    <p>This panel is for administrators only.</p>
    <button id="mesa-volver" class="mesa-btn">Go back</button>
  </div>`;
}

let _tab = 'resumen';
function render() {
  const u = usuarioActual();
  _cont.innerHTML = `
    <div class="mesa">
      <aside class="mesa-side">
        <div class="mesa-marca">HANDICAPPER<span>Mesa</span></div>
        <nav class="mesa-nav">
          <button data-tab="resumen" class="on">${IC.grid} Overview</button>
          <button data-tab="usuarios">${IC.users} Users</button>
          <button data-tab="analisis">${IC.pen} Analysis</button>
        </nav>
        <div class="mesa-yo">
          <div class="mesa-yo-av">${(u?.nombre || u?.email || '?').charAt(0).toUpperCase()}</div>
          <div class="mesa-yo-txt"><b>${esc(u?.nombre || '')}</b><span>${esc(u?.email || '')}</span></div>
        </div>
        <button class="mesa-salir" id="mesa-salir">${IC.exit} Log out</button>
      </aside>
      <main class="mesa-main" id="mesa-main"></main>
    </div>`;
  _cont.querySelectorAll('.mesa-nav button').forEach(b => b.onclick = () => {
    _tab = b.dataset.tab;
    _cont.querySelectorAll('.mesa-nav button').forEach(x => x.classList.toggle('on', x === b));
    pintarTab();
  });
  _cont.querySelector('#mesa-salir').onclick = async () => { await salir(); location.hash = ''; location.reload(); };
  pintarTab();
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

/* -------- RESUMEN -------- */
function activos(u) { return u.suscripcion && u.suscripcion.activo; }
function precioMensual(planId) { const p = planPorId(planId); return p ? p.mensual : 0; }

function vistaResumen() {
  const total = _usuarios.length;
  const conPlan = _usuarios.filter(activos);
  const mrr = conPlan.reduce((s, u) => s + precioMensual(u.suscripcion.plan), 0);
  const porPlan = PLANES.map(p => ({ nombre: p.nombre, n: conPlan.filter(u => u.suscripcion.plan === p.id).length }));
  const bloqueados = _usuarios.filter(u => u.bloqueado).length;

  const kpi = (etq, val, sub) => `<div class="mesa-kpi"><span class="k-etq">${etq}</span><span class="k-val">${val}</span>${sub ? `<span class="k-sub">${sub}</span>` : ''}</div>`;
  const barras = porPlan.map(p => {
    const max = Math.max(1, ...porPlan.map(x => x.n));
    return `<div class="mp-row"><span class="mp-n">${p.nombre}</span><div class="mp-bar"><i style="width:${(p.n / max) * 100}%"></i></div><span class="mp-v">${p.n}</span></div>`;
  }).join('');

  return `
    <div class="mesa-head"><h1>Overview</h1><p>Live snapshot of the platform.</p></div>
    <div class="mesa-kpis">
      ${kpi('Registered users', total)}
      ${kpi('Active subscriptions', conPlan.length)}
      ${kpi('Est. monthly revenue', '$' + mrr.toFixed(2), 'MRR estimate')}
      ${kpi('Blocked', bloqueados)}
    </div>
    <div class="mesa-card">
      <div class="mc-t">Active by plan</div>
      <div class="mp-lista">${barras || '<p class="mesa-vacio">No active subscriptions yet.</p>'}</div>
    </div>`;
}

/* -------- USUARIOS -------- */
function vistaUsuarios() {
  const filas = _usuarios.map(u => {
    const sub = u.suscripcion || {};
    const estado = sub.activo ? `<span class="pill on">${(planPorId(sub.plan)?.nombre || 'Active')}</span>` : `<span class="pill">Free</span>`;
    const vence = sub.vence ? new Date(sub.vence).toLocaleDateString() : '—';
    const bloq = u.bloqueado ? 'blocked' : '';
    return `<tr class="${bloq}">
      <td><div class="u-nom">${esc(u.nombre || '—')}</div><div class="u-mail">${esc(u.email || '')}</div></td>
      <td>${estado}</td>
      <td>${vence}</td>
      <td class="u-acc">
        <select data-plan="${u.uid}" class="u-select">
          <option value="">Free</option>
          ${PLANES.map(p => `<option value="${p.id}" ${sub.activo && sub.plan === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
        </select>
        <button class="u-bloq ${u.bloqueado ? 'activo' : ''}" data-bloq="${u.uid}">${u.bloqueado ? 'Unblock' : 'Block'}</button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="mesa-head"><h1>Users</h1><p>${_usuarios.length} registered. Manage plans and access.</p></div>
    <div class="mesa-card">
      <table class="mesa-tabla">
        <thead><tr><th>User</th><th>Plan</th><th>Expires</th><th>Actions</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4" class="mesa-vacio">No users yet.</td></tr>'}</tbody>
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
    else {
      const vence = new Date(); vence.setMonth(vence.getMonth() + 1);
      sub = { activo: true, plan: planId, vence: vence.toISOString(), metodo: 'manual' };
    }
    try { await fijarSuscripcionUsuario(uid, sub); u.suscripcion = sub; } catch (_) {}
  });
}

/* -------- ANÁLISIS -------- */
function vistaAnalisis() {
  const publicados = _analisis.map(a => `
    <div class="an-item">
      <div class="an-top"><b>${esc(a.matchId || a.id)}</b>${a.ajustar ? `<span class="an-adj">Adjusts ${a.prob}%</span>` : ''}</div>
      <div class="an-ver">${esc(a.veredicto || '')}</div>
      <div class="an-txt">${esc(a.texto || '')}</div>
      <button class="an-del" data-del="${esc(a.matchId || a.id)}">Delete</button>
    </div>`).join('');
  return `
    <div class="mesa-head"><h1>Analysis</h1><p>Publish your verdict on a match. Optionally adjust the probability.</p></div>
    <div class="mesa-grid2">
      <div class="mesa-card">
        <div class="mc-t">New verdict</div>
        <input id="an-buscar" class="mesa-input" placeholder="Search a match (team or league)…">
        <div id="an-resultados" class="an-res"></div>
        <div id="an-form" class="an-form" style="display:none"></div>
      </div>
      <div class="mesa-card">
        <div class="mc-t">Published (${_analisis.length})</div>
        <div class="an-lista">${publicados || '<p class="mesa-vacio">Nothing published yet.</p>'}</div>
      </div>
    </div>`;
}

function enlazarAnalisis() {
  const buscar = _cont.querySelector('#an-buscar');
  const res = _cont.querySelector('#an-resultados');
  const form = _cont.querySelector('#an-form');

  const cargar = async () => { if (!_partidos.length) { try { _partidos = await listarPartidos(null); } catch (_) { _partidos = []; } } };
  buscar?.addEventListener('focus', cargar, { once: true });
  buscar?.addEventListener('input', async () => {
    await cargar();
    const q = buscar.value.trim().toLowerCase();
    if (!q) { res.innerHTML = ''; return; }
    const hits = _partidos.filter(p => [p.local?.nombre, p.visita?.nombre, p.liga].some(x => (x || '').toLowerCase().includes(q))).slice(0, 8);
    res.innerHTML = hits.map(p => `<button class="an-hit" data-id="${esc(p.id)}">${esc(p.local.nombre)} vs ${esc(p.visita.nombre)} <span>${esc(p.liga)}</span></button>`).join('');
    res.querySelectorAll('[data-id]').forEach(b => b.onclick = () => abrirForm(b.dataset.id));
  });

  function abrirForm(matchId) {
    const p = _partidos.find(x => x.id === matchId);
    if (!p) return;
    form.style.display = 'block';
    form.innerHTML = `
      <div class="an-elegido">${esc(p.local.nombre)} <b>vs</b> ${esc(p.visita.nombre)}</div>
      <label class="an-lbl">Verdict (short)</label>
      <input id="anf-ver" class="mesa-input" placeholder="e.g. Home win, value on ${esc(p.local.abrev)}">
      <label class="an-lbl">Analysis (report)</label>
      <textarea id="anf-txt" class="mesa-area" rows="5" placeholder="Explain your reasoning for Pro/Premium members…"></textarea>
      <label class="an-check"><input type="checkbox" id="anf-adj"> Adjust the shown probability to back my verdict</label>
      <div id="anf-adjbox" class="an-adjbox" style="display:none">
        <label class="an-lbl">${esc(p.local.abrev)} win probability (%)</label>
        <input id="anf-prob" type="number" min="1" max="99" value="${p.mercado?.local || 55}" class="mesa-input chico">
      </div>
      <button id="anf-guardar" class="mesa-btn oro">Publish verdict</button>`;
    const chk = form.querySelector('#anf-adj');
    chk.onchange = () => { form.querySelector('#anf-adjbox').style.display = chk.checked ? 'block' : 'none'; };
    form.querySelector('#anf-guardar').onclick = async () => {
      const analisis = {
        veredicto: form.querySelector('#anf-ver').value.trim(),
        texto: form.querySelector('#anf-txt').value.trim(),
        ajustar: chk.checked,
        prob: chk.checked ? Math.max(1, Math.min(99, Number(form.querySelector('#anf-prob').value) || 55)) : null,
        favorito: p.local.abrev,
      };
      const btn = form.querySelector('#anf-guardar'); btn.disabled = true; btn.textContent = 'Publishing…';
      try {
        await guardarAnalisis(matchId, analisis);
        _analisis = await listarAnalisis();
        pintarTab();
      } catch (e) { btn.disabled = false; btn.textContent = 'Publish verdict'; }
    };
  }

  _cont.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await borrarAnalisis(b.dataset.del); _analisis = await listarAnalisis(); pintarTab(); } catch (_) { b.disabled = false; }
  });
}

/* -------- utilidades -------- */
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const IC = {
  grid: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
  users: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 0 1 0 6"/>'),
  pen: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  exit: svg('<path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'),
};
function svg(inner) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">${inner}</svg>`; }
