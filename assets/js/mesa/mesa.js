/* ============================================================
   MESA · PANEL DE ADMINISTRACIÓN (pantalla completa)
   Secciones: Overview · Users · Analysis.
   Solo visible si esAdmin() (verificado en Firestore).
   ============================================================ */
import { esAdmin, listarUsuarios, listarAdmins, fijarBloqueo, fijarSuscripcionUsuario, guardarAnalisis, borrarAnalisis, listarAnalisis, esAnalista, listarAnalistas, guardarAnalista, fijarAnalista, eliminarAnalista, leerModeracion, guardarModeracion, resumenIngresos, contarApoyos, listarReportes, resolverReporte, borrarReporte, asignarFotoAnalista, quitarFotoAnalista, ajustarContadorAnalista, leerFichaAnalista, guardarPerfilAnalista } from './mesa-datos.js';
import { rutaFotoAnalista } from '../datos/fotos-analistas.js';
import { seguidoresBot, likesDe, dislikesDe } from '../datos/bots.js';
import { abrirSelectorFotos } from '../ui/selector-fotos.js';
import { prepararEstilosSenal, tarjetaMuestra } from '../ui/senales.js';
import { PALETA, INTENSIDADES, EMBLEMAS, EMBLEMA_NOMBRE, estiloSeguro } from '../ui/estilo-senal.js';
import { PALABRAS_DEFECTO, terminoProhibido, limpiarLista, detectarPublicidad } from '../datos/moderacion.js';
import { LIGAS, listarPartidos, detallePartido } from '../datos/proveedor.js';
import { PLANES, planPorId } from '../datos/planes.js';
import { salir, usuarioActual } from '../auth/auth.js';
import { marcarVistaPrevia } from '../auth/estado-pago.js';
import { idiomaActual } from '../ui/idioma.js';

let _cont = null, _usuarios = [], _analisis = [], _tab = 'resumen', _admins = [];
let _ligaSel = null, _partidos = [], _cargandoPart = false;
let _rol = 'admin', _deporteAnalista = null, _analistas = [];
let _miFirma = null, _miNombre = null, _miUid = null, _miEstilo = null, _estiloAuto = false, _miFoto = null;
let _mesaLang = 'es';
let _uBusqueda = '', _uFiltro = 'todos', _uPagina = 1;
let _anBusqueda = '', _anFiltro = 'todos';
let _monFiltro = 'todos';
let _moderacion = [];
let _reportes = [];
function _reportesAbiertos() { return _reportes.filter(r => (r.estado || 'abierto') !== 'resuelto').length; }
let _ingresos = {};
const U_POR_PAGINA = 8;
const ML = (en, es) => _mesaLang === 'es' ? es : en;
const DEPORTES = {
  beisbol:   { en: 'Baseball', es: 'Béisbol', ligas: ['mlb'] },
  basket:    { en: 'Basketball', es: 'Básquet', ligas: ['nba'] },
  hockey:    { en: 'Ice hockey', es: 'Hockey', ligas: ['nhl'] },
  americano: { en: 'American football', es: 'Fútbol americano', ligas: ['nfl'] },
  futbol:    { en: 'Soccer', es: 'Fútbol', ligas: ['epl', 'laliga', 'ucl', 'seriea', 'bundes'] },
};
const depNombre = (id) => { const d = DEPORTES[id]; return d ? (_mesaLang === 'es' ? d.es : d.en) : (id || '—'); };
const ligasDeporte = (id) => (DEPORTES[id] && DEPORTES[id].ligas) || [];
const deporteDeLiga = (ligaId) => { for (const k in DEPORTES) if (DEPORTES[k].ligas.includes(ligaId)) return k; return 'futbol'; };
const segMostrar = (a) => seguidoresBot(a, 0);
const likesMostrar = (a) => likesDe(a);
const dislikesMostrar = (a) => dislikesDe(a);
const counterUI = (uid, campo, label, valor) => `<div class="anc"><span class="anc-lbl">${label}</span><button type="button" class="anc-b" data-anc="${campo}" data-ancuid="${uid}" data-d="-1">−</button><b class="anc-v" data-ancv="${campo}-${uid}">${(valor || 0).toLocaleString()}</b><button type="button" class="anc-b" data-anc="${campo}" data-ancuid="${uid}" data-d="1">+</button></div>`;

export async function abrirMesa() {
  _cont = document.getElementById('mesa-screen');
  if (!_cont) return;
  mostrar();
  _cont.innerHTML = cargando();
  const admin = await esAdmin();
  let analista = null;
  if (!admin) { try { analista = await esAnalista(); } catch (_) { analista = null; } }
  if (!admin && !analista) {
    _cont.innerHTML = accesoDenegado();
    _cont.querySelector('#mesa-volver')?.addEventListener('click', () => { location.hash = ''; location.reload(); });
    return;
  }
  if (admin) {
    _rol = 'admin'; _deporteAnalista = null;
    const _u = usuarioActual(); _miUid = _u && _u.uid;
    _miFirma = _miFirma || (_u && (_u.nombre || _u.email)) || 'Admin';
    try { const _f = await leerFichaAnalista(_miUid); if (_f) { if (_f.firma) _miFirma = _f.firma; if (_f.nombre) _miNombre = _f.nombre; if (_f.estilo) _miEstilo = estiloSeguro(_f.estilo); _miFoto = _f.foto || null; } } catch (_) {}
  }
  else { _rol = 'analista'; _deporteAnalista = analista.deporte || null; _miFirma = analista.firma || analista.alias || null; _miNombre = analista.nombre || null; _miUid = analista.uid || null; _miEstilo = estiloSeguro(analista.estilo); _estiloAuto = analista.estiloAuto === true; _tab = 'analisis'; }
  render();
  cargarDatos();
}

function mostrar() {
  ['landing-screen', 'pricing-screen', 'app-screen'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  _cont.style.display = '';
  document.body.classList.add('en-mesa');
}

function cargando() { return `<div class="mesa-cargando">${ML('Loading…','Cargando…')}</div>`; }
function accesoDenegado() {
  return `<div class="mesa-denegado"><div class="md-ic">${IC.lock}</div><h2>${ML('Restricted area','Área restringida')}</h2><p>${ML('This panel is for administrators only.','Este panel es solo para administradores.')}</p><button id="mesa-volver" class="mesa-btn">${ML('Go back','Volver')}</button></div>`;
}

function render() {
  const u = usuarioActual();
  const navBtns = _rol === 'analista'
    ? `<button data-tab="analisis" class="on">${IC.pen} ${ML('Analysis Hub','Central de análisis')}</button>
       <div class="mesa-dep-badge">${IC.check} ${esc(depNombre(_deporteAnalista))}</div>`
    : `<button data-tab="resumen" class="${_tab==='resumen'?'on':''}">${IC.grid} ${ML('Overview','Resumen')}</button>
       <button data-tab="usuarios" class="${_tab==='usuarios'?'on':''}">${IC.users} ${ML('Users','Usuarios')}</button>
       <button data-tab="analisis" class="${_tab==='analisis'?'on':''}">${IC.pen} ${ML('Analysis','Análisis')}</button>
       <button data-tab="analistas" class="${_tab==='analistas'?'on':''}">${IC.contrato} ${ML('Staff','Personal')}</button>
       <button data-tab="monitoreo" class="${_tab==='monitoreo'?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg> ${ML('Monitoring','Monitoreo')}</button>
       <button data-tab="moderacion" class="${_tab==='moderacion'?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6l7-3z"/></svg> ${ML('Moderation','Moderación')}</button>
       <button data-tab="reportes" class="${_tab==='reportes'?'on':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/></svg> ${ML('Reports','Reportes')}${_reportesAbiertos() ? `<span class="mesa-nav-badge">${_reportesAbiertos()}</span>` : ''}</button>`;
  _cont.innerHTML = `
    <div class="mesa">
      <aside class="mesa-side" id="mesa-side">
        <div class="mesa-side-top">
          <div class="mesa-marca">HANDICAPPER${_rol === 'analista' ? `<span>${ML('Analyst','Analista')}</span>` : ''}</div>
          <button class="mesa-burger" id="mesa-burger" aria-label="Menu">${IC.menu}</button>
        </div>
        <nav class="mesa-nav" id="mesa-nav">
          ${navBtns}
          <button class="mesa-ver" id="mesa-ver-sitio">${IC.eye} ${ML('View site','Ver sitio')}</button>
          <button class="mesa-lang" id="mesa-lang">${IC.globe} ${_mesaLang === 'es' ? 'English' : 'Español'}</button>
          <div class="mesa-yo">
            <div class="mesa-yo-av">${(u?.nombre || u?.email || '?').charAt(0).toUpperCase()}</div>
            <div class="mesa-yo-txt"><b>${esc(u?.nombre || '')}</b><span>${esc(correoCorto(u?.email || ''))}</span></div>
          </div>
          <button class="mesa-salir" id="mesa-salir">${IC.exit} ${ML('Log out','Cerrar sesión')}</button>
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
  _cont.querySelector('#mesa-lang').onclick = () => { _mesaLang = _mesaLang === 'es' ? 'en' : 'es'; render(); pintarTab(); };

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
      const pub = e.target.closest('[data-open-pub]');
      if (pub) { abrirModalPublicadas(); return; }
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
  try { _moderacion = await leerModeracion(); } catch (_) { _moderacion = []; }
  try { _reportes = await listarReportes(); } catch (_) { _reportes = []; }
  try { _admins = await listarAdmins(); } catch (_) { _admins = []; }
  if (_rol === 'admin') { try { _analistas = await listarAnalistas(); } catch (_) { _analistas = []; } }
  if (_rol === 'admin') { try { _ingresos = await resumenIngresos(); } catch (_) { _ingresos = {}; } }
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
  else if (_tab === 'analistas') { m.innerHTML = vistaAnalistas(); enlazarAnalistas(); }
  else if (_tab === 'monitoreo') { m.innerHTML = vistaMonitoreo(); enlazarMonitoreo(); }
  else if (_tab === 'moderacion') { m.innerHTML = vistaModeracion(); enlazarModeracion(); }
  else if (_tab === 'reportes') { m.innerHTML = vistaReportes(); enlazarReportes(); }
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
  const esStaff = (u) => _analistas.some(a => a.uid === u.uid);
  const clientes = _usuarios.filter(u => !rolAdmin(u) && !esStaff(u));
  const total = clientes.length;
  const conPlan = clientes.filter(activo);
  const inactivos = total - conPlan.length;
  const mrr = conPlan.reduce((s, u) => s + precioMensual(u.suscripcion.plan), 0);
  const bloqueados = clientes.filter(u => u.bloqueado).length;
  const act = conPlan.length;
  const conv = total ? Math.round(act / total * 100) : 0;
  const nStaff = _analistas.length;
  const nAdmins = _admins.length;
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
  const kpi = (cls, lab, val, cap) => `<div class="ov-kpi ${cls}">
      <div class="ov-kpi-lab">${lab}</div><div class="ov-kpi-num">${val}</div><div class="ov-kpi-cap">${cap}</div></div>`;

  return `
    <div class="ov-kpis">
      ${kpi('blue', ML('Registered','Registrados'), total, ML('Paying customers only','Solo clientes'))}
      ${kpi('green', ML('Active','Activos'), act, ML('With paid plan','Con plan de pago'))}
      ${kpi('muted', ML('Inactive','Inactivos'), inactivos, ML('No active plan','Sin plan activo'))}
      ${kpi('gold', ML('Monthly revenue','Ingresos mensuales'), '$' + mrr.toFixed(2), ML('MRR estimate','MRR estimado'))}
      ${kpi('staff', ML('Staff','Personal'), nStaff, ML('Hired analysts','Analistas contratados'))}
      ${kpi('blue', ML('Admins','Admins'), nAdmins, ML('Owners','Dueños'))}
    </div>
    <div class="ov-grid2">
      <div class="ov-card"><div class="ov-card-t">${ML('Active by plan','Activos por plan')}</div>
        <div class="ov-plan-wrap">
          <div class="ov-donut"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="58" fill="none" stroke="#1b2433" stroke-width="15"/>${segs}</svg><div class="ov-donut-mid"><div class="c">${act}</div><div class="t">${ML('Total','Total')}</div></div></div>
          <div class="ov-plans">${barras}</div>
        </div></div>
      <div class="ov-card"><div class="ov-card-t heart">${ML('Health','Salud')}</div>
        <div class="ov-mini"><span>${ML('Blocked accounts','Cuentas bloqueadas')}</span><b>${bloqueados}</b></div>
        <div class="ov-mini"><span>${ML('Published signals','Señales publicadas')}</span><b>${_analisis.length}</b></div>
        <div class="ov-mini hl"><span>${ML('Paying rate','% que paga')}</span><b>${conv}%</b></div>
      </div>
    </div>
    <div class="ov-band"><div class="ov-band-t">${ML('Admin only','Solo admin')}</div>
      <div class="ov-band-grid">
        <button class="ov-adm" data-goto="usuarios"><span class="ov-adm-ic">${ICu}</span><span class="ov-adm-tx"><b>${ML('Manage users','Gestionar usuarios')}</b><em>${ML('Users, plans and blocks.','Usuarios, planes y bloqueos.')}</em></span><span class="ov-adm-go">›</span></button>
        <button class="ov-adm" data-goto="analisis"><span class="ov-adm-ic gear">${ICp}</span><span class="ov-adm-tx"><b>${ML('Analysis','Análisis')}</b><em>${ML('Published analysis &amp; signals.','Análisis y señales publicados.')}</em></span><span class="ov-adm-go">›</span></button>
        <button class="ov-adm" data-goto="analistas"><span class="ov-adm-ic">${IC.contrato}</span><span class="ov-adm-tx"><b>${ML('Staff','Personal')}</b><em>${ML('Hire &amp; manage analysts.','Contrata y gestiona analistas.')}</em></span><span class="ov-adm-go">›</span></button>
      </div>
    </div>`;
}

/* ================= USERS ================= */
function esActivoReciente(u) {
  // "activo" = con plan pagado. (Con el tiempo se puede sumar último acceso.)
  return activo(u);
}
function filaUsuario(u) {
  const sub = u.suscripcion || {};
  const rol = rolAdmin(u);
  const estado = rol
    ? `<span class="pill admin">${esc(rol)}</span>`
    : (u.bloqueado
      ? `<span class="pill red">${ML('Blocked','Bloqueado')}</span>`
      : (sub.activo ? `<span class="pill on">${(planPorId(sub.plan)?.nombre || ML('Active','Activo'))}</span>` : `<span class="pill">${ML('Inactive','Inactivo')}</span>`));
  const vence = sub.vence ? new Date(sub.vence).toLocaleDateString() : '—';
  return `<tr class="${u.bloqueado ? 'blocked' : ''}">
    <td data-l="${ML('User','Usuario')}"><div class="u-nom">${esc(u.nombre || (u.email || '').split('@')[0] || '—')}</div><div class="u-mail">${esc(correoCorto(u.email || ''))}</div></td>
    <td data-l="${ML('Status','Estado')}">${estado}</td>
    <td data-l="${ML('Expires','Vence')}">${vence}</td>
    <td data-l="${ML('Plan','Plan')}"><select data-plan="${u.uid}" class="u-select">
      <option value="">${ML('Inactive','Inactivo')}</option>
      ${PLANES.map(p => `<option value="${p.id}" ${sub.activo && sub.plan === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
    </select></td>
    <td data-l="${ML('Action','Acción')}"><button class="u-bloq ${u.bloqueado ? 'activo' : ''}" data-bloq="${u.uid}">${u.bloqueado ? ML('Unblock','Desbloquear') : ML('Block','Bloquear')}</button></td>
  </tr>`;
}

function filtrarUsuarios() {
  const q = _uBusqueda.trim().toLowerCase();
  return _usuarios.filter(u => {
    const sub = u.suscripcion || {};
    if (_uFiltro === 'con' && !sub.activo) return false;
    if (_uFiltro === 'sin' && sub.activo) return false;
    if (_uFiltro === 'bloq' && !u.bloqueado) return false;
    if (_uFiltro.indexOf('plan:') === 0 && !(sub.activo && sub.plan === _uFiltro.slice(5))) return false;
    if (q) {
      const nom = (u.nombre || '').toLowerCase(), mail = (u.email || '').toLowerCase();
      if (nom.indexOf(q) === -1 && mail.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function pintarUsuariosTabla() {
  const tbody = _cont.querySelector('#u-tbody'), pager = _cont.querySelector('#u-pager');
  if (!tbody) return;
  const lista = filtrarUsuarios();
  const paginas = Math.max(1, Math.ceil(lista.length / U_POR_PAGINA));
  if (_uPagina > paginas) _uPagina = paginas;
  const ini = (_uPagina - 1) * U_POR_PAGINA;
  const slice = lista.slice(ini, ini + U_POR_PAGINA);
  tbody.innerHTML = slice.length ? slice.map(filaUsuario).join('')
    : `<tr><td colspan="5" class="mesa-vacio">${ML('No matches for this search.','Sin resultados para esta búsqueda.')}</td></tr>`;
  if (pager) {
    let dentro = `<span class="u-pager-info">${lista.length} ${ML('results','resultados')}</span>`;
    if (paginas > 1) {
      let btns = '';
      for (let i = 1; i <= paginas; i++) btns += `<button class="u-page ${i === _uPagina ? 'on' : ''}" data-upage="${i}">${i}</button>`;
      dentro += `<div class="u-pages"><button class="u-page nav" data-upage="${Math.max(1, _uPagina - 1)}" ${_uPagina === 1 ? 'disabled' : ''}>‹</button>${btns}<button class="u-page nav" data-upage="${Math.min(paginas, _uPagina + 1)}" ${_uPagina === paginas ? 'disabled' : ''}>›</button></div>`;
    }
    pager.innerHTML = dentro;
    pager.querySelectorAll('[data-upage]').forEach(b => b.onclick = () => { _uPagina = +b.dataset.upage; pintarUsuariosTabla(); });
  }
  tbody.querySelectorAll('[data-plan]').forEach(sel => sel.onchange = async () => {
    const uid = sel.dataset.plan, u = _usuarios.find(x => x.uid === uid); if (!u) return;
    const planId = sel.value;
    let sub;
    if (!planId) sub = { activo: false, plan: null, vence: null, metodo: 'manual' };
    else { const v = new Date(); v.setMonth(v.getMonth() + 1); sub = { activo: true, plan: planId, vence: v.toISOString(), metodo: 'manual' }; }
    try { await fijarSuscripcionUsuario(uid, sub); u.suscripcion = sub; pintarUsuariosTabla(); } catch (_) {}
  });
}

function vistaUsuarios() {
  const Ilupa = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  const act = _usuarios.filter(esActivoReciente).length;
  const filtros = [['todos', ML('All', 'Todos')], ['con', ML('With plan', 'Con plan')], ['sin', ML('No plan', 'Sin plan')], ['bloq', ML('Blocked', 'Bloqueados')]].concat(PLANES.map(p => ['plan:' + p.id, p.nombre]));
  const chips = filtros.map(([k, l]) => `<button data-uf="${k}" class="u-chip ${_uFiltro === k ? 'on' : ''}">${esc(l)}</button>`).join('');
  return `
    <div class="mesa-head"><h1>${ML('Users', 'Usuarios')}</h1><p>${_usuarios.length} ${ML('registered', 'registrados')} · ${act} ${ML('active', 'activos')} · ${_usuarios.length - act} ${ML('inactive', 'inactivos')}.</p></div>
    <div class="u-toolbar">
      <div class="u-search">${Ilupa}<input id="u-buscar" type="text" placeholder="${ML('Search by name or email…', 'Buscar por nombre o correo…')}" value="${esc(_uBusqueda)}"></div>
      <div class="u-chips" id="u-chips">${chips}</div>
    </div>
    <div class="mesa-card mesa-card-tabla">
      <table class="mesa-tabla">
        <thead><tr><th>${ML('User', 'Usuario')}</th><th>${ML('Status', 'Estado')}</th><th>${ML('Expires', 'Vence')}</th><th>${ML('Plan', 'Plan')}</th><th>${ML('Action', 'Acción')}</th></tr></thead>
        <tbody id="u-tbody"></tbody>
      </table>
      <div class="u-pager" id="u-pager"></div>
    </div>`;
}
function enlazarUsuarios() {
  const buscar = _cont.querySelector('#u-buscar');
  if (buscar) buscar.oninput = () => { _uBusqueda = buscar.value; _uPagina = 1; pintarUsuariosTabla(); };
  _cont.querySelectorAll('#u-chips [data-uf]').forEach(b => b.onclick = () => {
    _uFiltro = b.dataset.uf; _uPagina = 1;
    _cont.querySelectorAll('#u-chips [data-uf]').forEach(x => x.classList.toggle('on', x === b));
    pintarUsuariosTabla();
  });
  pintarUsuariosTabla();
}

async function toggleBloqueo(uid, btn) {
  const u = _usuarios.find(x => x.uid === uid); if (!u) return;
  if (btn) btn.disabled = true;
  try { await fijarBloqueo(uid, !u.bloqueado); u.bloqueado = !u.bloqueado; if (_cont.querySelector('#u-tbody')) pintarUsuariosTabla(); else pintarTab(); } catch (_) { if (btn) btn.disabled = false; }
}

/* ================= ANALYSTS (contratación) ================= */
function candidatosAnalista() {
  const q = _anBusqueda.trim().toLowerCase();
  return _usuarios.filter(u => {
    if (rolAdmin(u)) return false;
    if (_analistas.some(a => a.uid === u.uid)) return false;
    const sub = u.suscripcion || {};
    if (_anFiltro === 'con' && !sub.activo) return false;
    if (_anFiltro === 'sin' && sub.activo) return false;
    if (_anFiltro === 'bloq' && !u.bloqueado) return false;
    if (q) { const nom = (u.nombre || '').toLowerCase(), mail = (u.email || '').toLowerCase(); if (nom.indexOf(q) === -1 && mail.indexOf(q) === -1) return false; }
    return true;
  });
}
function pintarCandidatos() {
  const cont = _cont.querySelector('#an-cands'); if (!cont) return;
  const lista = candidatosAnalista(); const MAX = 6; const shown = lista.slice(0, MAX);
  const deps = Object.keys(DEPORTES);
  cont.innerHTML = shown.length ? (shown.map(u => {
    const sub = u.suscripcion || {};
    const st = u.bloqueado ? `<span class="pill red">${ML('Blocked', 'Bloqueado')}</span>`
      : (sub.activo ? `<span class="pill on">${planPorId(sub.plan)?.nombre || ML('Active', 'Activo')}</span>` : `<span class="pill">${ML('No plan', 'Sin plan')}</span>`);
    return `<div class="an-cand">
      <div class="an-cand-who"><b>${esc(u.nombre || (u.email || '').split('@')[0] || '—')}</b><span>${esc(correoCorto(u.email || ''))}</span></div>
      <div class="an-cand-st">${st}</div>
      <select class="u-select" data-cand-dep="${esc(u.uid)}">${deps.map(k => `<option value="${k}">${esc(depNombre(k))}</option>`).join('')}</select>
      <button class="mesa-btn oro sm" data-cand-add="${esc(u.uid)}" data-mail="${esc(u.email || '')}">${ML('Add', 'Agregar')}</button>
    </div>`;
  }).join('') + (lista.length > MAX ? `<div class="an-cand-more">${ML('Showing', 'Mostrando')} ${MAX} ${ML('of', 'de')} ${lista.length}. ${ML('Refine your search.', 'Afina la búsqueda.')}</div>` : ''))
    : `<div class="an-mng-empty">${ML('No matching users.', 'Sin usuarios que coincidan.')}</div>`;
  cont.querySelectorAll('[data-cand-add]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.candAdd, mail = b.dataset.mail || '';
    const sel = cont.querySelector(`[data-cand-dep="${uid}"]`), dep = sel ? sel.value : deps[0];
    b.disabled = true;
    try { await guardarAnalista(uid, { email: mail, deporte: dep, activo: true }); _analistas = await listarAnalistas(); pintarTab(); }
    catch (_) { b.disabled = false; }
  });
}
/* ============================================================
   FASE 5 — EDITOR DE ESTILO DE SEÑAL (solo analista, en su hub)
   Opciones curadas + vista previa en tiempo real. Límites automáticos:
   solo colores de la paleta, 3 intensidades y emblemas de la lista.
   ============================================================ */
let _estiloDraft = null;   // borrador del editor (se guarda al Aplicar)
function editorEstilo() {
  const ES = _mesaLang === 'es';
  const L = (en, es) => ES ? es : en;
  const e = _estiloDraft || estiloSeguro(_miEstilo);
  const IPaint = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M12 3a9 9 0 100 18 2 2 0 002-2c0-.6-.4-1-.4-1.5 0-.5.4-1 1-1H16a5 5 0 005-5c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1.1" fill="currentColor"/></svg>`;
  const IChev = `<svg class="est-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>`;
  const swatches = PALETA.map(p =>
    `<button class="est-sw ${e.color === p.id ? 'on' : ''}" data-color="${p.id}" style="--sw:${p.hex}" title="${esc(ES ? p.nombre.es : p.nombre.en)}"><i></i></button>`).join('');
  const inten = INTENSIDADES.map(k =>
    `<button class="est-int ${e.intensidad === k ? 'on' : ''}" data-inten="${k}">${esc(L(k === 'subtle' ? 'Subtle' : k === 'normal' ? 'Normal' : 'Bold', k === 'subtle' ? 'Sutil' : k === 'normal' ? 'Normal' : 'Fuerte'))}</button>`).join('');
  const embs = Object.keys(EMBLEMAS).map(k =>
    `<button class="est-emb ${e.emblema === k ? 'on' : ''}" data-emb="${k}" title="${esc(ES ? EMBLEMA_NOMBRE[k].es : EMBLEMA_NOMBRE[k].en)}">${k === 'none' ? `<span class="est-emb-none">${L('None', 'Ninguno')}</span>` : EMBLEMAS[k]}</button>`).join('');

  return `<details class="mesa-card est-editor">
    <summary class="est-sum">
      <span class="est-sum-t">${IPaint} ${L('My signal style', 'Estilo de mis señales')}<span class="est-opt">${L('optional', 'opcional')}</span></span>
      ${IChev}
    </summary>
    <div class="est-body">
      <p class="est-sub">${L('Give your signals a personal touch, then apply the changes. The platform keeps limits so everything stays premium.', 'Dale un toque personal a tus señales y luego aplica los cambios. La plataforma mantiene los límites para que todo se vea premium.')}</p>
      <div class="est-grid">
        <div class="est-controls">
          <div class="est-field"><label>${L('Accent color', 'Color de acento')}</label><div class="est-sws">${swatches}</div></div>
          <div class="est-field"><label>${L('Intensity', 'Intensidad')}</label><div class="est-seg">${inten}</div></div>
          <div class="est-field"><label>${L('Profile photo', 'Foto de perfil')}</label>
            <button type="button" class="est-foto-btn" id="est-foto">${_miFoto ? `<img src="${rutaFotoAnalista(_miFoto)}" alt="">` : `<span class="est-foto-mas">+</span>`}<span>${_miFoto ? L('Change photo', 'Cambiar foto') : L('Choose photo', 'Elegir foto')}</span></button></div>
        </div>
        <div class="est-preview">
          <label>${L('Live preview', 'Vista previa en tiempo real')}</label>
          <div class="est-prev sn" id="est-prev"></div>
        </div>
      </div>
      <div class="est-apply-row">
        <span class="est-saved" id="est-saved" hidden>${L('Saved', 'Guardado')} ✓</span>
        <button class="mesa-btn oro" id="est-apply">${L('Apply changes', 'Aplicar cambios')}</button>
      </div>
    </div>
  </details>`;
}

function _renderPreview() {
  const box = _cont.querySelector('#est-prev'); if (!box) return;
  box.innerHTML = tarjetaMuestra(_estiloDraft, _miFirma, {
    foto: _miFoto, local: 'Los Angeles Lakers', visita: 'Boston Celtics',
    logoLocal: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
    logoVisita: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png',
    favLocal: true, favorito: 'Los Angeles Lakers', prob: 72,
  });
}
function enlazarEditorEstilo() {
  prepararEstilosSenal();               // inyecta el CSS de señales para el preview
  _miEstilo = estiloSeguro(_miEstilo);
  _estiloDraft = { ..._miEstilo };      // borrador: el preview cambia en vivo, se guarda al Aplicar
  _renderPreview();
  const setSel = (sel, val, attr) => _cont.querySelectorAll(sel).forEach(x => x.classList.toggle('on', x.dataset[attr] === val));
  const marcarSucio = () => { const s = _cont.querySelector('#est-saved'); if (s) s.hidden = true; };
  _cont.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { _estiloDraft.color = b.dataset.color; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-color]', _estiloDraft.color, 'color'); _renderPreview(); marcarSucio(); });
  _cont.querySelectorAll('[data-inten]').forEach(b => b.onclick = () => { _estiloDraft.intensidad = b.dataset.inten; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-inten]', _estiloDraft.intensidad, 'inten'); _renderPreview(); marcarSucio(); });
  _cont.querySelectorAll('[data-emb]').forEach(b => b.onclick = () => { _estiloDraft.emblema = b.dataset.emb; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-emb]', _estiloDraft.emblema, 'emb'); _renderPreview(); marcarSucio(); });
  _cont.querySelector('#est-foto') && (_cont.querySelector('#est-foto').onclick = () => {
    if (!_miUid) return;
    abrirSelectorFotos({
      actual: _miFoto, uidAnalista: _miUid,
      titulo: ML('Your profile photo', 'Tu foto de perfil'), sub: ML('This becomes your permanent photo on every signal.', 'Será tu foto permanente en cada señal.'),
      txtOk: ML('Set photo', 'Poner foto'), txtCancel: ML('Cancel', 'Cancelar'), secHombres: ML('Men', 'Hombres'), secMujeres: ML('Women', 'Mujeres'),
      onGuardar: async (foto) => {
        const ok = await asignarFotoAnalista(_miUid, foto, _miFirma);
        if (ok) { _miFoto = foto; const bb = _cont.querySelector('#est-foto'); if (bb) bb.innerHTML = `<img src="${rutaFotoAnalista(foto)}" alt=""><span>${ML('Change photo', 'Cambiar foto')}</span>`; _renderPreview(); }
        return ok;
      },
    });
  });
  const apply = _cont.querySelector('#est-apply');
  if (apply) apply.onclick = async () => {
    apply.disabled = true; const txt = apply.textContent; apply.textContent = '…';
    _miEstilo = { ..._estiloDraft };
    try { if (_miUid) await fijarAnalista(_miUid, { estilo: { color: _miEstilo.color, intensidad: _miEstilo.intensidad, emblema: _miEstilo.emblema } }); } catch (_) {}
    apply.disabled = false; apply.textContent = txt;
    const s = _cont.querySelector('#est-saved'); if (s) s.hidden = false;
  };
}

/* ============================================================
   FASE 6 — MODERACIÓN (panel admin): lista administrable de palabras
   prohibidas. Agregar/quitar términos sin tocar código. Auto-guarda.
   ============================================================ */
let _modGuardar = null;
function _listaModEfectiva() { return _moderacion.length ? _moderacion : PALABRAS_DEFECTO.slice(); }

/* Revisa el análisis (lenguaje + publicidad/enlaces) y devuelve el mensaje del
   motivo por el que se bloquea, o null si está limpio. `L` traduce en/es. */
function _revisarAnalisis(texto, L) {
  const mal = terminoProhibido(texto, _listaModEfectiva());
  if (mal) return L(`Your analysis contains language that isn't allowed ("${mal}"). Please edit it.`, `Tu análisis contiene lenguaje no permitido ("${mal}"). Edítalo.`);
  const ad = detectarPublicidad(texto);
  if (ad) {
    if (ad.tipo === 'sitio') return L(`You can't promote external sites ("${ad.detalle}") in the analysis. Remove it to publish.`, `No puedes promocionar páginas externas ("${ad.detalle}") en el análisis. Quítalo para publicar.`);
    if (ad.tipo === 'contacto') return L(`You can't share contact info or social networks in the analysis. Remove it to publish.`, `No puedes compartir contactos ni redes sociales en el análisis. Quítalo para publicar.`);
    return L(`Links and web addresses aren't allowed in the analysis. Remove it to publish.`, `No se permiten enlaces ni direcciones web en el análisis. Quítalo para publicar.`);
  }
  return null;
}
function vistaModeracion() {
  const IShield = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6l7-3z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>`;
  const Iplus = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  const lista = _listaModEfectiva();
  const chips = lista.map(w => `<span class="mod-chip">${esc(w)}<button class="mod-x" data-modx="${esc(w)}" aria-label="remove">&times;</button></span>`).join('');
  return `
    <div class="mesa-head"><h1>${ML('Moderation', 'Moderación')}</h1>
      <p>${ML('Blocked words for analyst signals (Spanish + English). A signal with any of these can\u2019t be published.', 'Palabras bloqueadas en las señales de analistas (español + inglés). Una señal con alguna de estas no se puede publicar.')}</p></div>
    <div class="mesa-card">
      <div class="mc-t">${IShield} ${ML('Prohibited words', 'Palabras prohibidas')}</div>
      <div class="mod-add">
        <input id="mod-input" type="text" maxlength="40" placeholder="${ML('Add a word or phrase\u2026', 'Agrega una palabra o frase\u2026')}">
        <button class="mesa-btn oro" id="mod-add-btn">${Iplus} ${ML('Add', 'Agregar')}</button>
      </div>
      <div class="mod-chips" id="mod-chips">${chips || `<span class="mod-empty">${ML('No words yet.', 'Aún no hay palabras.')}</span>`}</div>
      <p class="mod-note">${ML('Matches whole words (accents respected) and simple plurals. Changes save automatically.', 'Coincide por palabra completa (respeta acentos) y plurales simples. Los cambios se guardan solos.')}</p>
    </div>`;
}
function _pintarChipsMod() {
  const cont = _cont.querySelector('#mod-chips'); if (!cont) return;
  const lista = _listaModEfectiva();
  cont.innerHTML = lista.length
    ? lista.map(w => `<span class="mod-chip">${esc(w)}<button class="mod-x" data-modx="${esc(w)}" aria-label="remove">&times;</button></span>`).join('')
    : `<span class="mod-empty">${ML('No words yet.', 'Aún no hay palabras.')}</span>`;
  cont.querySelectorAll('[data-modx]').forEach(b => b.onclick = () => {
    const w = b.dataset.modx;
    _moderacion = limpiarLista(_listaModEfectiva().filter(x => x !== w));
    _pintarChipsMod(); _guardarMod();
  });
}
function _guardarMod() {
  clearTimeout(_modGuardar);
  _modGuardar = setTimeout(async () => { try { await guardarModeracion(_moderacion); } catch (_) {} }, 500);
}
function enlazarModeracion() {
  _pintarChipsMod();
  const inp = _cont.querySelector('#mod-input'), btn = _cont.querySelector('#mod-add-btn');
  const agregar = () => {
    const val = (inp.value || '').trim(); if (!val) return;
    _moderacion = limpiarLista([..._listaModEfectiva(), val]);
    inp.value = ''; inp.focus(); _pintarChipsMod(); _guardarMod();
  };
  if (btn) btn.onclick = agregar;
  if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } };
}

/* ============================================================
   REPORTES (solo admin) — quejas de usuarios sobre señales.
   Un reporte por usuario (id del documento = uid), para no llenar
   Firebase; el resto de reclamaciones van al grupo de Telegram.
   ============================================================ */
function _repMotivoTxt(m) {
  const map = {
    enganoso: ML('Misleading content', 'Contenido engañoso'),
    spam: ML('Spam or advertising', 'Spam o publicidad'),
    ofensivo: ML('Offensive language', 'Lenguaje ofensivo'),
    otro: ML('Other', 'Otro'),
  };
  return map[m] || m || ML('Other', 'Otro');
}
function _repFecha(ts) {
  try { const d = ts && ts.toDate ? ts.toDate() : (ts ? new Date(ts) : null); return d ? d.toLocaleString(_mesaLang === 'es' ? 'es' : 'en') : ''; } catch (_) { return ''; }
}
function vistaReportes() {
  const IFlag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/></svg>`;
  const abiertos = _reportesAbiertos();
  const orden = _reportes.slice().sort((a, b) => {
    const ra = (a.estado || 'abierto') === 'resuelto' ? 1 : 0, rb = (b.estado || 'abierto') === 'resuelto' ? 1 : 0;
    if (ra !== rb) return ra - rb;
    const ta = a.creado && a.creado.toMillis ? a.creado.toMillis() : 0, tb = b.creado && b.creado.toMillis ? b.creado.toMillis() : 0;
    return tb - ta;
  });
  const filas = orden.length ? orden.map(r => {
    const resuelto = (r.estado || 'abierto') === 'resuelto';
    return `<div class="rep-row ${resuelto ? 'ok' : ''}" data-repid="${esc(r.id)}">
      <div class="rep-row-main">
        <div class="rep-row-top"><span class="rep-tag ${esc(r.motivo || 'otro')}">${esc(_repMotivoTxt(r.motivo))}</span>${resuelto ? `<span class="rep-tag done">${ML('Resolved', 'Resuelto')}</span>` : ''}<span class="rep-row-sig">${esc(r.firma ? '@' + r.firma : (r.signalId || ''))}</span></div>
        ${r.comentario ? `<p class="rep-row-txt">${esc(r.comentario)}</p>` : `<p class="rep-row-txt empty">${ML('No extra details.', 'Sin detalles adicionales.')}</p>`}
        <div class="rep-row-meta">${esc(r.correo || r.reportadoPor || '')} · ${esc(_repFecha(r.creado))}</div>
      </div>
      <div class="rep-row-acts">
        <button class="rep-act ok" data-repok="${esc(r.id)}">${resuelto ? ML('Reopen', 'Reabrir') : ML('Resolve', 'Resolver')}</button>
        <button class="rep-act del" data-repdel="${esc(r.id)}">${ML('Delete', 'Eliminar')}</button>
      </div>
    </div>`;
  }).join('') : `<div class="rep-adm-empty">${IFlag}<b>${ML('No reports', 'Sin reportes')}</b><span>${ML('User complaints about signals will show up here.', 'Las quejas de los usuarios sobre las señales aparecerán aquí.')}</span></div>`;
  return `
    <div class="mesa-head"><h1>${ML('Reports', 'Reportes')}</h1>
      <p>${ML('User complaints about signals. Each user can send one report; further issues go to the Telegram group.', 'Quejas de los usuarios sobre las señales. Cada usuario puede enviar un reporte; lo demás va al grupo de Telegram.')}</p></div>
    <div class="rep-adm-kpis">
      <div class="rep-adm-kpi"><b>${_reportes.length}</b><span>${ML('Total', 'Total')}</span></div>
      <div class="rep-adm-kpi ${abiertos ? 'alerta' : ''}"><b>${abiertos}</b><span>${ML('Open', 'Abiertos')}</span></div>
      <div class="rep-adm-kpi"><b>${_reportes.length - abiertos}</b><span>${ML('Resolved', 'Resueltos')}</span></div>
    </div>
    <div class="rep-adm-list">${filas}</div>`;
}
function enlazarReportes() {
  const refrescarMain = () => { const m = _cont.querySelector('.mesa-main'); if (m) { m.innerHTML = vistaReportes(); enlazarReportes(); } };
  _cont.querySelectorAll('[data-repok]').forEach(b => b.onclick = async () => {
    const id = b.dataset.repok; const r = _reportes.find(x => x.id === id); if (!r) return;
    const nuevo = (r.estado || 'abierto') === 'resuelto' ? 'abierto' : 'resuelto';
    b.disabled = true;
    try { await resolverReporte(id, nuevo); r.estado = nuevo; } catch (_) {}
    refrescarMain();
  });
  _cont.querySelectorAll('[data-repdel]').forEach(b => b.onclick = () => {
    const id = b.dataset.repdel;
    confirmar(ML('Delete this report? The user will be able to send a new one.', '¿Eliminar este reporte? El usuario podrá enviar uno nuevo.'), ML('Yes, delete', 'Sí, eliminar'), async () => {
      try { await borrarReporte(id); _reportes = _reportes.filter(x => x.id !== id); } catch (_) {}
      refrescarMain();
    });
  });
}

/* ============================================================
   FASE 1 — MONITOREO DE ANALISTAS (solo admin)
   Rendimiento por analista: señales del mes (individual), seguidores,
   estado y actividad (quién trabaja y quién no). No global.
   ============================================================ */
function _tsADate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') { try { return ts.toDate(); } catch (_) { return null; } }
  if (ts.seconds != null) return new Date(ts.seconds * 1000);
  const d = new Date(ts); return isNaN(d.getTime()) ? null : d;
}
function _senalesMesDe(uid) {
  if (!uid) return 0;
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth();
  return _analisis.filter(s => {
    if (s.autorUid !== uid) return false;
    const d = _tsADate(s.actualizado); if (!d) return false;
    return d.getFullYear() === y && d.getMonth() === mo;
  }).length;
}
function _nombreAnalista(a) {
  const uu = _usuarios.find(x => x.uid === a.uid);
  return a.alias || a.firma || a.nombre || (uu && uu.nombre) || (a.email || (uu && uu.email) || '').split('@')[0] || '—';
}
function _monDatos() {
  return _analistas.map(a => {
    const uu = _usuarios.find(x => x.uid === a.uid);
    const sig = _senalesMesDe(a.uid);
    return {
      uid: a.uid,
      nombre: _nombreAnalista(a),
      email: a.email || (uu && uu.email) || '',
      deporte: a.deporte,
      seguidores: Number(a.seguidores || 0),
      apoyos: Number((_ingresos || {})[a.uid] || 0),
      activo: a.activo !== false,
      sig,
      trabajando: sig > 0,
    };
  }).sort((x, y) => y.sig - x.sig || y.seguidores - x.seguidores);
}

function _bloqueIngresos() {
  const ES = _mesaLang === 'es';
  const L = (en, es) => ES ? es : en;
  const Icoin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="12" r="9"/><path d="M15 9.5A2.5 2.5 0 0012.5 8h-1a2 2 0 000 4h1a2 2 0 010 4h-1A2.5 2.5 0 019 14.5M12 6.5v11"/></svg>`;
  const datos = _monDatos().filter(d => d.apoyos > 0).sort((a, b) => b.apoyos - a.apoyos);
  const totSub = _monDatos().reduce((s, d) => s + d.apoyos, 0);
  const paraAnalistas = totSub * 1, paraPlataforma = totSub * 1, total = totSub * 2;
  const kpi = (cls, val, lab) => `<div class="mon-kpi ${cls}"><b>${val}</b><span>${esc(lab)}</span></div>`;
  const filas = datos.length ? datos.map(d => `
    <div class="ing-row">
      <div class="ing-who"><b>${esc(d.nombre)}</b><span>${esc(depNombre(d.deporte))}</span></div>
      <div class="ing-sub">${d.apoyos} <span>${ML('supporters', 'suscriptores')}</span></div>
      <div class="ing-amt an">$${d.apoyos}<span>${ML('analyst', 'analista')}</span></div>
      <div class="ing-amt pl">$${d.apoyos}<span>${ML('platform', 'plataforma')}</span></div>
      <div class="ing-amt tot">$${d.apoyos * 2}<span>${ML('total', 'total')}</span></div>
    </div>`).join('') : `<div class="ing-empty">${ML('No paid supporters yet.', 'Aún no hay suscriptores de pago.')}</div>`;
  return `<div class="mesa-card mon-ing">
    <div class="mc-t">${Icoin} ${L('Monthly earnings · paid supporters', 'Ingresos mensuales · suscriptores de pago')}</div>
    <div class="mon-kpis ing-kpis">
      ${kpi('', totSub, L('Paid supporters', 'Suscriptores'))}
      ${kpi('ok', '$' + paraAnalistas, L('To analysts', 'Para analistas'))}
      ${kpi('', '$' + paraPlataforma, L('Platform revenue', 'Para la plataforma'))}
      ${kpi('warn', '$' + total, L('Total generated', 'Total generado'))}
    </div>
    <div class="ing-list">${filas}</div>
    <p class="mon-note">${Icoin} ${L('Each supporter pays $2/mo → $1 analyst + $1 platform. Figures are in preview until the payment gateway (Stripe) is connected.', 'Cada suscriptor paga $2/mes → $1 analista + $1 plataforma. Las cifras son de vista previa hasta conectar la pasarela de pago (Stripe).')}</p>
  </div>`;
}

function vistaMonitoreo() {
  const IPulse = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>`;
  const datos = _monDatos();
  const total = datos.length;
  const trabajando = datos.filter(d => d.trabajando && d.activo).length;
  const inactivos = datos.filter(d => !d.trabajando && d.activo).length;
  const bloqueados = datos.filter(d => !d.activo).length;

  const filtros = [['todos', ML('All', 'Todos')], ['trab', ML('Working', 'Trabajando')], ['inac', ML('Inactive', 'Inactivos')], ['bloq', ML('Blocked', 'Bloqueados')]];
  const chips = filtros.map(([k, l]) => `<button data-monf="${k}" class="u-chip ${_monFiltro === k ? 'on' : ''}">${esc(l)}</button>`).join('');

  const kpi = (cls, val, lab) => `<div class="mon-kpi ${cls}"><b>${val}</b><span>${esc(lab)}</span></div>`;

  return `
    <div class="mesa-head"><h1>${ML('Analyst Monitoring', 'Monitoreo de analistas')}</h1>
      <p>${ML('Performance by analyst: signals this month, followers, status and activity.', 'Rendimiento por analista: señales del mes, seguidores, estado y actividad.')}</p></div>
    <div class="mon-kpis">
      ${kpi('', total, ML('Analysts', 'Analistas'))}
      ${kpi('ok', trabajando, ML('Working this month', 'Trabajando este mes'))}
      ${kpi('warn', inactivos, ML('Inactive', 'Inactivos'))}
      ${kpi('bad', bloqueados, ML('Blocked', 'Bloqueados'))}
    </div>
    <div class="u-toolbar"><div class="u-chips" id="mon-chips">${chips}</div></div>
    <div class="mesa-card mesa-card-tabla">
      <table class="mesa-tabla mon-tabla">
        <thead><tr>
          <th>${ML('Analyst', 'Analista')}</th>
          <th>${ML('Sport', 'Deporte')}</th>
          <th>${ML('Signals (month)', 'Señales (mes)')}</th>
          <th>${ML('Followers', 'Seguidores')}</th>
          <th>${ML('Status', 'Estado')}</th>
          <th>${ML('Activity', 'Actividad')}</th>
        </tr></thead>
        <tbody id="mon-tbody"></tbody>
      </table>
    </div>
    <p class="mon-note">${IPulse} ${ML('Signals are counted individually per analyst for the current month. Followers fill in once the follow system is live.', 'Las señales se cuentan por analista para el mes actual. Los seguidores se llenan al activar el sistema de seguidores.')}</p>
    ${_bloqueIngresos()}`;
}

function pintarMonitoreo() {
  const tbody = _cont.querySelector('#mon-tbody'); if (!tbody) return;
  let datos = _monDatos();
  if (_monFiltro === 'trab') datos = datos.filter(d => d.trabajando && d.activo);
  else if (_monFiltro === 'inac') datos = datos.filter(d => !d.trabajando && d.activo);
  else if (_monFiltro === 'bloq') datos = datos.filter(d => !d.activo);

  tbody.innerHTML = datos.length ? datos.map(d => {
    const estado = d.activo ? `<span class="pill on">${ML('Active', 'Activo')}</span>` : `<span class="pill red">${ML('Blocked', 'Bloqueado')}</span>`;
    const act = !d.activo ? `<span class="mon-act off">${ML('Blocked', 'Bloqueado')}</span>`
      : (d.trabajando ? `<span class="mon-act on"><i></i>${ML('Working', 'Trabajando')}</span>`
        : `<span class="mon-act idle"><i></i>${ML('Inactive', 'Inactivo')}</span>`);
    return `<tr>
      <td data-l="${ML('Analyst', 'Analista')}"><div class="u-nom">${esc(d.nombre)}</div><div class="u-mail">${esc(correoCorto(d.email))}</div></td>
      <td data-l="${ML('Sport', 'Deporte')}"><span class="mon-dep">${esc(depNombre(d.deporte))}</span></td>
      <td data-l="${ML('Signals (month)', 'Señales (mes)')}"><b class="mon-sig">${d.sig}</b></td>
      <td data-l="${ML('Followers', 'Seguidores')}">${d.seguidores.toLocaleString()}</td>
      <td data-l="${ML('Status', 'Estado')}">${estado}</td>
      <td data-l="${ML('Activity', 'Actividad')}">${act}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" class="mesa-vacio">${ML('No analysts to show.', 'No hay analistas para mostrar.')}</td></tr>`;
}

function enlazarMonitoreo() {
  _cont.querySelectorAll('#mon-chips [data-monf]').forEach(b => b.onclick = () => {
    _monFiltro = b.dataset.monf;
    _cont.querySelectorAll('#mon-chips [data-monf]').forEach(x => x.classList.toggle('on', x === b));
    pintarMonitoreo();
  });
  pintarMonitoreo();
}

function vistaAnalistas() {
  const Ilupa = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  const filtros = [['todos', ML('All', 'Todos')], ['con', ML('With plan', 'Con plan')], ['sin', ML('No plan', 'Sin plan')], ['bloq', ML('Blocked', 'Bloqueados')]];
  const chips = filtros.map(([k, l]) => `<button data-anf="${k}" class="u-chip ${_anFiltro === k ? 'on' : ''}">${esc(l)}</button>`).join('');
  const lista = _analistas.length ? _analistas.map(a => {
    const uu = _usuarios.find(x => x.uid === a.uid); const mail = a.email || (uu && uu.email) || a.uid;
    return `<div class="an-mng-row ${a.activo === false ? 'off' : ''}${a.esBot ? ' es-bot' : ''}">
      <button class="an-mng-foto ${a.foto ? 'tiene' : ''}" data-an-foto="${esc(a.uid)}" title="${ML('Set photo', 'Poner foto')}">
        ${a.foto ? `<img src="${rutaFotoAnalista(a.foto)}" alt="">` : `<span class="an-mng-foto-mas">+</span>`}
      </button>
      <div class="an-mng-who"><b>${esc(mail)}${a.esBot ? ` <span class="an-mng-bot">BOT</span>` : ''}</b><span class="an-mng-dep">${esc(depNombre(a.deporte))}${a.foto ? ` · ${esc(a.foto)}` : ''}</span></div>
      <div class="an-mng-id">
        <input class="an-mng-inp" data-an-nombre="${esc(a.uid)}" placeholder="${ML('Full name', 'Nombre')}" value="${esc(a.nombre || '')}" maxlength="40">
        <input class="an-mng-inp firma" data-an-firma="${esc(a.uid)}" placeholder="${ML('Signature / alias', 'Firma / alias')}" value="${esc(a.firma || a.alias || '')}" maxlength="24">
      </div>
      <select data-an-dep="${esc(a.uid)}" class="u-select an-mng-sel">${Object.keys(DEPORTES).map(k => `<option value="${k}" ${a.deporte === k ? 'selected' : ''}>${esc(depNombre(k))}</option>`).join('')}</select>
      <button class="an-mng-toggle ${a.activo === false ? '' : 'on'}" data-an-toggle="${esc(a.uid)}">${a.esBot ? (a.activo === false ? ML('Paused', 'Pausado') : ML('Pause', 'Pausar')) : (a.activo === false ? ML('Blocked', 'Bloqueado') : ML('Active', 'Activo'))}</button>
      ${a.esBot ? '' : `<button class="an-mng-del" data-an-del="${esc(a.uid)}">${ML('Remove', 'Quitar')}</button>`}
      <div class="an-mng-counters">
        ${counterUI(a.uid, 'followersExtra', ML('Followers', 'Seguidores'), segMostrar(a))}
        ${counterUI(a.uid, 'likesExtra', ML('Likes', 'Likes'), likesMostrar(a))}
        ${counterUI(a.uid, 'dislikesExtra', ML('Dislikes', 'Dislikes'), dislikesMostrar(a))}
      </div>
    </div>`;
  }).join('') : `<div class="an-mng-empty">${ML('No analysts yet.', 'Aún no hay analistas.')}</div>`;
  return `
    <div class="mesa-head an-head">
      <div><h1>${ML('Staff', 'Personal')}</h1><p>${ML('Hire analysts and assign each one a sport. They only access the Analysis Hub for their sport.', 'Contrata analistas y asigna a cada uno un deporte. Solo acceden al Analysis Hub de su deporte.')}</p></div>
    </div>
    <div class="mesa-card an-mng">
      <div class="mc-t">${IC.contrato} ${ML('Add analyst', 'Agregar analista')}</div>
      <p class="an-mng-sub">${ML('Search a registered user and assign a sport. You only see who matches, so you won\u2019t add the wrong person by mistake.', 'Busca un usuario registrado y asígnale un deporte. Solo ves a quién coincide, para no agregar a la persona equivocada.')}</p>
      <div class="an-add-tools">
        <div class="u-search">${Ilupa}<input id="an-buscar" type="text" placeholder="${ML('Search by name or email…', 'Buscar por nombre o correo…')}" value="${esc(_anBusqueda)}"></div>
        <div class="u-chips" id="an-chips">${chips}</div>
      </div>
      <div class="an-cands" id="an-cands"></div>
    </div>
    <div class="mesa-card an-mng">
      <div class="mc-t">${IC.pen} ${ML('Current analysts', 'Analistas actuales')}</div>
      <div class="an-mng-list">${lista}</div>
    </div>`;
}
function enlazarAnalistas() {
  _cont.querySelector('#an-go-users') && (_cont.querySelector('#an-go-users').onclick = () => {
    _tab = 'usuarios';
    _cont.querySelectorAll('.mesa-nav button[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === 'usuarios'));
    pintarTab();
  });
  const btnBots = _cont.querySelector('#an-bots-pub');
  if (btnBots) btnBots.onclick = async () => {
    btnBots.disabled = true; const txt = btnBots.textContent; btnBots.textContent = ML('Publishing…', 'Publicando…');
    try {
      const { publicarTodosLosBots, API_FOOTBALL_KEY } = await import('../datos/bots-senales.js');
      if (!API_FOOTBALL_KEY) { alert(ML('Paste your API-Football key in bots-senales.js first.', 'Primero pega tu key de API-Football en bots-senales.js.')); }
      else { const r = await publicarTodosLosBots(guardarAnalisis); alert(r.ok ? ML('Published ', 'Publicadas ') + r.publicadas + ML(' bot signals.', ' señales de bots.') : (r.error || 'Error')); }
    } catch (e) { alert('Error: ' + ((e && e.message) || e)); }
    btnBots.disabled = false; btnBots.textContent = txt;
  };
  const buscar = _cont.querySelector('#an-buscar');
  if (buscar) buscar.oninput = () => { _anBusqueda = buscar.value; pintarCandidatos(); };
  _cont.querySelectorAll('#an-chips [data-anf]').forEach(b => b.onclick = () => {
    _anFiltro = b.dataset.anf;
    _cont.querySelectorAll('#an-chips [data-anf]').forEach(x => x.classList.toggle('on', x === b));
    pintarCandidatos();
  });
  pintarCandidatos();
  _cont.querySelectorAll('[data-an-toggle]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.anToggle, a = _analistas.find(x => x.uid === uid); if (!a) return;
    b.disabled = true;
    const nuevoActivo = a.activo === false;   // estado tras el toggle
    try {
      await fijarAnalista(uid, { activo: nuevoActivo });
      if (!nuevoActivo && !(a && a.esBot)) { try { await quitarFotoAnalista(uid); } catch (_) {} }   // suspendido (no bot) → libera su foto
      _analistas = await listarAnalistas(); pintarTab();
    } catch (_) { b.disabled = false; }
  });
  _cont.querySelectorAll('[data-anc]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.ancuid, campo = b.dataset.anc, d = Number(b.dataset.d);
    b.disabled = true;
    const nuevo = await ajustarContadorAnalista(uid, campo, d);
    b.disabled = false;
    if (nuevo == null) return;
    const a = _analistas.find(x => x.uid === uid); if (a) a[campo] = nuevo;
    const val = campo === 'followersExtra' ? segMostrar(a) : campo === 'likesExtra' ? likesMostrar(a) : dislikesMostrar(a);
    _cont.querySelectorAll(`[data-ancv="${campo}-${uid}"]`).forEach(el => el.textContent = (val || 0).toLocaleString());
  });
  _cont.querySelectorAll('[data-an-foto]').forEach(b => b.onclick = () => {
    const uid = b.dataset.anFoto, a = _analistas.find(x => x.uid === uid); if (!a) return;
    abrirSelectorFotos({
      actual: a.foto || null, uidAnalista: uid,
      titulo: ML('Assign a photo', 'Asignar una foto'),
      sub: esc(a.email || a.nombre || uid),
      txtOk: ML('Assign', 'Asignar'), txtCancel: ML('Cancel', 'Cancelar'),
      secHombres: ML('Men', 'Hombres'), secMujeres: ML('Women', 'Mujeres'),
      onGuardar: async (foto) => {
        const ok = await asignarFotoAnalista(uid, foto, a.firma || a.nombre || null);
        if (ok) { _analistas = await listarAnalistas(); pintarTab(); }
        return ok;
      },
    });
  });
  _cont.querySelectorAll('[data-an-dep]').forEach(sel => sel.onchange = async () => {
    const uid = sel.dataset.anDep;
    try { await fijarAnalista(uid, { deporte: sel.value }); const a = _analistas.find(x => x.uid === uid); if (a) a.deporte = sel.value; } catch (_) {}
  });
  _cont.querySelectorAll('[data-an-nombre]').forEach(inp => inp.onchange = async () => {
    const uid = inp.dataset.anNombre, val = inp.value.trim().slice(0, 40);
    try { await fijarAnalista(uid, { nombre: val }); const a = _analistas.find(x => x.uid === uid); if (a) a.nombre = val; } catch (_) {}
  });
  _cont.querySelectorAll('[data-an-firma]').forEach(inp => inp.onchange = async () => {
    const uid = inp.dataset.anFirma, val = inp.value.trim().slice(0, 24);
    // La firma es única: si otro analista ya la usa, se rechaza (queda atada a un solo uid).
    const choca = val && _analistas.some(x => x.uid !== uid && String(x.firma || x.alias || '').toLowerCase() === val.toLowerCase());
    if (choca) {
      inp.classList.add('err');
      const a0 = _analistas.find(x => x.uid === uid); inp.value = a0 ? (a0.firma || a0.alias || '') : '';
      setTimeout(() => inp.classList.remove('err'), 1600);
      alert(ML('That signature is already taken by another analyst.', 'Esa firma ya está en uso por otro analista.'));
      return;
    }
    try { await fijarAnalista(uid, { firma: val }); const a = _analistas.find(x => x.uid === uid); if (a) a.firma = val; } catch (_) {}
  });
  _cont.querySelectorAll('[data-an-del]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.anDel, a = _analistas.find(x => x.uid === uid), mail = (a && a.email) || uid;
    if (!confirm(ML('Remove ' + mail + ' as analyst? This is permanent. They lose the role and access.', '¿Quitar a ' + mail + ' como analista? Es permanente: pierde el rol y el acceso.'))) return;
    b.disabled = true;
    try { await quitarFotoAnalista(uid); await eliminarAnalista(uid); _analistas = await listarAnalistas(); pintarTab(); } catch (_) { b.disabled = false; }
  });
}

/* ================= ANALYSIS ================= */
function vistaAnalisis() {
  const ES = _mesaLang === 'es';
  const L = (en, es) => ES ? es : en;
  const iniLoc = (p) => (p && p.inicio && typeof p.inicio === 'object') ? (ES ? p.inicio.es : p.inicio.en) : ((p && p.inicio) || '');
  const ligaObj = LIGAS.find(l => l.id === _ligaSel) || {};
  const ligaNm = ligaObj.corto || ligaObj.nombre || '';

  const Ilupa = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  const Icheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
  const Iflag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V5a1 1 0 011-1h11l-2 4 2 4H6"/></svg>`;
  const Iarrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  const Iempty = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/></svg>`;
  const IEyeMini = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;

  const ligasVis = _rol === 'analista' ? LIGAS.filter(l => ligasDeporte(_deporteAnalista).includes(l.id)) : LIGAS;
  const ligas = ligasVis.map(l => `<button class="ah2-lg ${_ligaSel === l.id ? 'on' : ''}" data-liga="${l.id}">
    <img src="${l.logo}" alt="" onerror="this.style.display='none'"><span>${esc(l.corto || l.nombre)}</span></button>`).join('');

  const confDe = (p) => {
    if (p.confianza && ['alta', 'media', 'baja'].includes(p.confianza)) return p.confianza;
    const l = p.mercado?.local, v = p.mercado?.visita;
    if (l == null || v == null) return 'media';
    const g = Math.abs(l - v); return g >= 30 ? 'alta' : g >= 12 ? 'media' : 'baja';
  };
  const confTx = { alta: L('High', 'Alta'), media: L('Medium', 'Media'), baja: L('Low', 'Baja') };

  const dayKey = (p) => { const d = p.cuando ? new Date(p.cuando) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : 'tbd'; };
  const dayLbl = (k) => {
    if (k === 'tbd') return L('Date TBD', 'Fecha por definir');
    const d = new Date(k + 'T12:00:00'); const t = new Date();
    const tk = t.toISOString().slice(0, 10); const tm = new Date(t.getTime() + 864e5).toISOString().slice(0, 10);
    if (k === tk) return L('Today', 'Hoy'); if (k === tm) return L('Tomorrow', 'Mañana');
    return d.toLocaleDateString(ES ? 'es' : 'en', { weekday: 'long', day: 'numeric', month: 'short' });
  };
  const groups = {}; _partidos.forEach(p => { const k = dayKey(p); (groups[k] = groups[k] || []).push(p); });
  const keys = Object.keys(groups).sort((a, b) => (a === 'tbd') - (b === 'tbd') || a.localeCompare(b));

  const logoBox = (e) => e.logo
    ? `<span class="ah2-lo"><img src="${esc(e.logo)}" alt="" onerror="this.parentNode.classList.add('fb');this.remove()" data-ab="${esc(e.abrev || '')}"><\/span>`
    : `<span class="ah2-lo fb" data-ab="${esc(e.abrev || '')}">${esc(e.abrev || '')}<\/span>`;

  const card = (p) => {
    const c = confDe(p); const ya = _analisis.find(a => a.matchId === p.id);
    const pL = p.mercado?.local, pV = p.mercado?.visita;
    const barra = (pL != null && pV != null)
      ? `<div class="ah2-mc-bar"><i class="l" style="width:${pL}%"></i><i class="r" style="width:${pV}%"></i></div>`
      : `<div class="ah2-mc-bar"><i class="n" style="width:100%"></i></div>`;
    return `<button class="ah2-mc ${ya ? 'has' : ''}" data-match="${esc(p.id)}">
      <div class="ah2-mc-top"><span class="ah2-mc-time">${esc(iniLoc(p))}</span><span class="ah2-badge ${c}">${confTx[c]}</span></div>
      <div class="ah2-mc-team">${logoBox(p.local)}<b>${esc(p.local.nombre)}</b><span class="ah2-mc-pct l">${pL != null ? pL + '%' : '—'}</span></div>
      ${barra}
      <div class="ah2-mc-team">${logoBox(p.visita)}<b>${esc(p.visita.nombre)}</b><span class="ah2-mc-pct r">${pV != null ? pV + '%' : '—'}</span></div>
      <div class="ah2-mc-foot">${ya ? `<span class="ah2-mc-pub">${Icheck}${L('Signal published', 'Señal publicada')}</span>` : `<span class="ah2-mc-cta">${Ilupa}${L('Analyze & publish', 'Analizar y publicar')} ${Iarrow}</span>`}</div>
    </button>`;
  };

  const dayTabs = _partidos.length ? `<div class="ah2-filter"><button class="ah2-ft on" data-day="all">${L('All', 'Todos')} <em>${_partidos.length}</em></button>${keys.map(k => `<button class="ah2-ft" data-day="${k}">${dayLbl(k)} <em>${groups[k].length}</em></button>`).join('')}</div>` : '';
  const dias = keys.map(k => `<div class="ah2-day" data-daygroup="${k}"><div class="ah2-day-h">${dayLbl(k)}<span>${groups[k].length}</span></div><div class="ah2-grid">${groups[k].map(card).join('')}</div></div>`).join('');

  let tablero;
  if (!_ligaSel) tablero = `<div class="ah2-empty">${Iempty}<b>${L('Choose a league to start', 'Elige una liga para empezar')}</b><span>${L('Pick a competition above and its matches will appear here, ready to analyze.', 'Selecciona una competición arriba y sus partidos aparecerán aquí, listos para analizar.')}</span></div>`;
  else if (_cargandoPart) tablero = `<div class="ah2-empty loading"><div class="ah2-spin"></div><b>${L('Loading matches…', 'Cargando partidos…')}</b></div>`;
  else if (!_partidos.length) tablero = `<div class="ah2-empty">${Iempty}<b>${L('No matches right now', 'No hay partidos ahora')}</b><span>${L('There are no upcoming matches in this league at the moment.', 'No hay próximos partidos en esta liga por ahora.')}</span></div>`;
  else tablero = `${dayTabs}<div class="ah2-days">${dias}</div>`;

  return `
    <div class="ah2">
      <div class="ah2-top">
        <div class="ah2-titles"><h1>Analysis Hub</h1></div>
      </div>
      <div class="ah2-metrics">
        <div class="ah2-metric"><b>${LIGAS.length}</b><span>${L('Leagues', 'Ligas')}</span></div>
        <div class="ah2-metric"><b>${_partidos.length}</b><span>${L('Matches', 'Partidos')}</span></div>
        <div class="ah2-metric gold"><b>${_analisis.length}</b><span>${L('Signals', 'Señales')}</span></div>
        <button class="ah2-metric ah2-metric-btn" data-open-pub><b>${IEyeMini}</b><span>${L('Published signals', 'Señales publicadas')} ›</span></button>
      </div>

      <div class="ah2-lgs">${ligas}</div>

      <div class="ah2-board">
        <div class="ah2-sec-h"><span>${L('Upcoming matches', 'Próximos partidos')}${ligaNm ? ` · ${esc(ligaNm)}` : ''}</span></div>
        ${tablero}
      </div>
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
  const cont = _cont; if (!cont) return;
  cont.querySelectorAll('.ah2-ft').forEach(tab => tab.addEventListener('click', () => {
    const d = tab.dataset.day;
    cont.querySelectorAll('.ah2-ft').forEach(x => x.classList.toggle('on', x === tab));
    cont.querySelectorAll('.ah2-day').forEach(g => { g.style.display = (d === 'all' || g.dataset.daygroup === d) ? '' : 'none'; });
  }));
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
/* ============================================================
   BLOQUE 1 — Señales publicadas (modal) + editar + confirmación
   ============================================================ */
function confirmar(msg, textoOk, onOk) {
  const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en;
  document.getElementById('mesa-confirm')?.remove();
  const bg = document.createElement('div'); bg.className = 'mesa-cfm-bg'; bg.id = 'mesa-confirm';
  bg.innerHTML = `<div class="mesa-cfm" role="dialog" aria-modal="true">
    <div class="mesa-cfm-msg">${esc(msg)}</div>
    <div class="mesa-cfm-btns">
      <button class="mesa-cfm-cancel">${L('Cancel', 'Cancelar')}</button>
      <button class="mesa-cfm-ok">${esc(textoOk)}</button>
    </div></div>`;
  document.body.appendChild(bg);
  const cerrar = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  bg.querySelector('.mesa-cfm-cancel').onclick = cerrar;
  bg.querySelector('.mesa-cfm-ok').onclick = async () => { const b = bg.querySelector('.mesa-cfm-ok'); b.disabled = true; try { await onOk(); } catch (_) {} cerrar(); };
}

function _confTxMesa() { const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en; return { alta: L('High', 'Alta'), media: L('Medium', 'Media'), baja: L('Low', 'Baja') }; }

function cuerpoPublicadas() {
  const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en, cf = _confTxMesa();
  const IEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
  const ITrash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/></svg>`;
  const Iempty = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/></svg>`;
  if (!_analisis.length) return `<div class="pub-empty">${Iempty}<b>${L('No signals yet', 'Aún no hay señales')}</b><span>${L('When you publish an analysis it will show up here.', 'Cuando publiques un análisis aparecerá aquí.')}</span></div>`;
  return `<div class="pub-grid">${_analisis.map(a => `<div class="pub-card">
    <div class="pub-c-h"><b>${esc(a.equipos || a.matchId)}</b>${a.prob != null ? `<span class="pub-c-pct">${a.prob}%</span>` : ''}</div>
    <div class="pub-c-v">${esc(a.veredicto || '')}${a.confianza ? `<span class="pub-c-conf ${a.confianza}">${esc(cf[a.confianza] || a.confianza)}</span>` : ''}</div>
    ${a.texto ? `<p class="pub-c-t">${esc(a.texto)}</p>` : ''}
    <div class="pub-c-acts">
      <button class="pub-edit" data-pubedit="${esc(a.matchId || a.id)}">${IEdit} ${L('Edit', 'Editar')}</button>
      <button class="pub-del" data-pubdel="${esc(a.matchId || a.id)}">${ITrash} ${L('Delete', 'Eliminar')}</button>
    </div></div>`).join('')}</div>`;
}

function enlazarPublicadas(bg) {
  const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en;
  const refrescar = () => { const body = bg.querySelector('.pub-body'); if (body) body.innerHTML = cuerpoPublicadas(); const em = bg.querySelector('.pub-head em'); if (em) em.textContent = _analisis.length; enlazarPublicadas(bg); pintarTab(); };
  bg.querySelectorAll('[data-pubdel]').forEach(b => b.onclick = () => {
    const id = b.dataset.pubdel;
    confirmar(L('Are you sure you want to delete this signal?', '¿Estás seguro que quieres eliminar esta señal?'), L('Yes, delete', 'Sí, eliminar'), async () => {
      try { await borrarAnalisis(id); _analisis = await listarAnalisis(); } catch (_) {}
      refrescar();
    });
  });
  bg.querySelectorAll('[data-pubedit]').forEach(b => b.onclick = () => {
    const a = _analisis.find(x => (x.matchId || x.id) === b.dataset.pubedit); if (!a) return;
    abrirModalEditarSenal(a, bg);
  });
}

function abrirModalPublicadas() {
  const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en;
  document.getElementById('pub-modal')?.remove();
  const bg = document.createElement('div'); bg.className = 'pub-bg'; bg.id = 'pub-modal';
  const cerrar = () => bg.remove();
  bg.innerHTML = `<div class="pub-modal" role="dialog" aria-modal="true">
    <div class="pub-head"><h2>${L('Published signals', 'Señales publicadas')} <em>${_analisis.length}</em></h2><button class="pub-x" aria-label="close">✕</button></div>
    <div class="pub-body">${cuerpoPublicadas()}</div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.pub-x').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  enlazarPublicadas(bg);
}

function abrirModalEditarSenal(a, padre) {
  const ES = _mesaLang === 'es', L = (en, es) => ES ? es : en, cf = _confTxMesa();
  const equipos = String(a.equipos || ''); const partes = equipos.split(/\s+vs\s+/i);
  const tA = (partes[0] || '').trim(), tB = (partes[1] || '').trim();
  let fav = a.favorito || tA, conf = a.confianza || 'media';
  const mkOpts = [['ml', L('Match winner', 'Ganador del partido')], ['ml_ot', L('Winner (incl. OT)', 'Ganador (incl. TE)')], ['spread', L('Spread / Handicap', 'Hándicap')], ['totals', L('Totals (O/U)', 'Totales (M/M)')]];
  document.getElementById('edit-modal')?.remove();
  const bg = document.createElement('div'); bg.className = 'edit-bg'; bg.id = 'edit-modal';
  const cerrar = () => bg.remove();
  bg.innerHTML = `<div class="edit-modal" role="dialog" aria-modal="true">
    <div class="edit-head"><h3>${L('Edit signal', 'Editar señal')}</h3><button class="edit-x" aria-label="close">✕</button></div>
    <div class="edit-body">
      <div class="edit-match">${esc(equipos)}</div>
      <label class="edit-lbl">${L('Winner', 'Ganador')}</label>
      <div class="edit-pick">
        <button class="edit-team ${fav === tA ? 'on' : ''}" data-team="${esc(tA)}">${esc(tA)}</button>
        <button class="edit-team ${fav === tB ? 'on' : ''}" data-team="${esc(tB)}">${esc(tB)}</button>
      </div>
      <label class="edit-lbl">${L('Probability', 'Probabilidad')}: <b id="edit-probv">${a.prob ?? 60}%</b></label>
      <input type="range" id="edit-prob" min="1" max="99" value="${a.prob ?? 60}" class="edit-range">
      <label class="edit-lbl">${L('Confidence', 'Confianza')}</label>
      <div class="edit-conf">${['alta', 'media', 'baja'].map(k => `<button class="edit-cf ${conf === k ? 'on' : ''}" data-cf="${k}">${esc(cf[k] || k)}</button>`).join('')}</div>
      <label class="edit-lbl">${L('Market', 'Mercado')}</label>
      <select id="edit-mkt" class="edit-select">${mkOpts.map(([v, t]) => `<option value="${v}" ${(a.mercado || 'ml') === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <label class="edit-lbl">${L('Analysis', 'Análisis')}</label>
      <textarea id="edit-txt" class="edit-txt" rows="4">${esc(a.texto || '')}</textarea>
      <div class="edit-hint" id="edit-hint"></div>
    </div>
    <div class="edit-btns"><button class="edit-cancel">${L('Cancel', 'Cancelar')}</button><button class="edit-save">${L('Save changes', 'Guardar cambios')}</button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.edit-x').onclick = cerrar; bg.querySelector('.edit-cancel').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  bg.querySelectorAll('[data-team]').forEach(b => b.onclick = () => { fav = b.dataset.team; bg.querySelectorAll('[data-team]').forEach(x => x.classList.toggle('on', x === b)); });
  const prob = bg.querySelector('#edit-prob'); prob.oninput = () => { bg.querySelector('#edit-probv').textContent = prob.value + '%'; };
  bg.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { conf = b.dataset.cf; bg.querySelectorAll('[data-cf]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('.edit-save').onclick = async () => {
    const texto = bg.querySelector('#edit-txt').value.trim();
    const motivo = _revisarAnalisis(texto, L);
    if (motivo) { const h = bg.querySelector('#edit-hint'); h.classList.add('err'); h.textContent = motivo; return; }
    const nProb = Number(prob.value);
    const analisis = { ...a, equipos, veredicto: `${fav} ${L('to win', 'gana')}`, prob: nProb, favorito: fav, confianza: conf, mercado: bg.querySelector('#edit-mkt').value, texto, estado: 'publicado' };
    const save = bg.querySelector('.edit-save'); save.disabled = true; save.textContent = '…';
    try { await guardarAnalisis(a.matchId || a.id, analisis); _analisis = await listarAnalisis(); } catch (_) {}
    cerrar();
    if (padre) { const body = padre.querySelector('.pub-body'); if (body) { body.innerHTML = cuerpoPublicadas(); enlazarPublicadas(padre); } }
    pintarTab();
  };
}

async function abrirModalSenal(matchId) {
  const p = _partidos.find(x => x.id === matchId); if (!p) return;
  const ya = _analisis.find(a => a.matchId === matchId);
  const ES = _mesaLang === 'es';
  const L = (en, es) => ES ? es : en;
  const ini = (p.inicio && typeof p.inicio === 'object') ? (ES ? p.inicio.es : p.inicio.en) : p.inicio;

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
      <button class="anm2-back" id="anm-x">${IBack}<span class="anm2-lg-t">${L('Match Analysis', 'Análisis de partido')}</span><span class="anm2-sm-t">${L('Analysis', 'Análisis')}</span></button>
      <div class="anm2-head-r">
        <button class="anm2-prev" id="anm-prev">${IEye}<span class="anm2-lg-t">${L('Preview', 'Vista previa')}</span><span class="anm2-sm-t">${L('Preview', 'Vista')}</span></button>
        <button class="anm2-close2" id="anm-x2" aria-label="Close">${IClose}</button>
      </div>
    </div>

    <div class="anm2-banner">
      <div class="anm2-team l">${logo(p.local)}
        <div class="anm2-team-tx">${cl.ciudad ? `<span class="anm2-city">${esc(cl.ciudad)}</span>` : ''}<span class="anm2-name">${esc(cl.nombre)}</span><span class="anm2-side red">${L('Home', 'Casa')} ${IHome}</span></div>
      </div>
      <div class="anm2-mid"><span class="anm2-league">${esc(p.liga)}</span><span class="anm2-vs">VS</span><span class="anm2-date">${ICal}${esc(ini || L('Date TBD', 'Fecha por definir'))}</span></div>
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
            <div class="anm2-bal" id="bal"><span class="anm2-bal-ic">${ICheck}</span><div><b>${L('Balanced at 100%', 'Probabilidades balanceadas al 100%')}</b></div></div>
          </div>
          <button type="button" class="anm2-info-btn" id="anm-info-btn">
            <span class="anm2-info-btn-l">${IInfo}${L('Match information', 'Información del partido')}</span>
            <span class="anm2-info-btn-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
          </button>
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
          <div class="anm2-ta"><textarea id="anm-txt" maxlength="1000" rows="4" placeholder="${L('Write your detailed analysis here…', 'Escribe tu análisis detallado aquí…')}">${esc(ya?.texto || '')}</textarea><span class="anm2-ta-c" id="cnt">0/1000</span></div>
          <label class="anm2-lbl">${L('Main market', 'Mercado principal')}</label>
          <div class="anm2-dd" id="anm-mkt-dd">
            <input type="hidden" id="anm-mkt" value="${esc(ya?.mercado || 'ml')}">
            <button type="button" class="anm2-dd-btn" id="anm-mkt-btn"><span id="anm-mkt-lbl"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="anm2-dd-list" id="anm-mkt-list" hidden>
              <button type="button" data-mkt="ml">${L('Match winner (regulation)', 'Ganador del partido (Tiempo reglamentario)')}</button>
              <button type="button" data-mkt="ml_ot">${L('Match winner (incl. OT)', 'Ganador (incl. tiempo extra)')}</button>
              <button type="button" data-mkt="spread">${L('Spread / Handicap', 'Hándicap')}</button>
              <button type="button" data-mkt="totals">${L('Totals (Over/Under)', 'Totales (Más/Menos)')}</button>
            </div>
          </div>
          <label class="anm2-lbl">${L('Analysis confidence', 'Confidencia en el análisis')}</label>
          <div class="anm2-conf" id="anm-conf">
            <button data-c="baja">${L('Low', 'Baja')}</button>
            <button data-c="media" class="on">${L('Medium', 'Media')}</button>
            <button data-c="alta">${L('High', 'Alta')}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="anm2-infopop" id="anm-infopop" hidden>
      <div class="anm2-infopop-card">
        <div class="anm2-infopop-h"><span>${IInfo}${L('Match information', 'Información del partido')}</span><button class="anm2-infopop-x" id="anm-info-x" aria-label="Close">${IClose}</button></div>
        <div class="anm2-info">
          <div class="anm2-info-c">${ICal}<div><span>${L('Date', 'Fecha')}</span><b>${esc(p.fecha || L('TBD', 'Por definir'))}</b></div></div>
          <div class="anm2-info-c">${IClock}<div><span>${L('Time', 'Hora')}</span><b>${esc(ini || L('TBD', 'Por definir'))}</b></div></div>
          <div class="anm2-info-c">${IPin}<div><span>${L('Stadium', 'Estadio')}</span><b>${esc(p.sede || L('TBD', 'Por definir'))}</b></div></div>
          <div class="anm2-info-c">${ITrophy}<div><span>${L('League', 'Liga')}</span><b>${esc(p.liga || '—')}</b></div></div>
          ${p.local.record ? `<div class="anm2-info-c">${ITrophy}<div><span>${esc(p.local.abrev)} ${L('record','récord')}</span><b>${esc(p.local.record)}${p.local.posicion ? ` · ${p.local.posicion}º` : ''}</b></div></div>` : ''}
          ${p.visita.record ? `<div class="anm2-info-c">${ITrophy}<div><span>${esc(p.visita.abrev)} ${L('record','récord')}</span><b>${esc(p.visita.record)}${p.visita.posicion ? ` · ${p.visita.posicion}º` : ''}</b></div></div>` : ''}
          ${(p.local.division || p.visita.division) ? `<div class="anm2-info-c">${IPin}<div><span>${L('Division','División')}</span><b>${esc(p.local.division || p.visita.division)}</b></div></div>` : ''}
        </div>
      </div>
    </div>

    <div class="anm2-foot">
      <div class="anm2-note">${IInfo}<div><b>${L('Important', 'Importante')}</b><em>${L('Make sure the probabilities reflect your analysis and sum to 100%.', 'Asegúrate de que las probabilidades reflejen tu análisis y estén balanceadas al 100%.')}</em></div></div>
      <label class="anm2-apply"><input type="checkbox" id="anm-adj" ${ya?.ajustar !== false ? 'checked' : ''}><div><b>${L('Apply my probability on the site', 'Aplicar mi probabilidad en la página')}</b><em>${L('Users will see these probabilities', 'Los usuarios verán estas probabilidades')}</em></div></label>
      <div class="anm2-foot-btns">
        ${ya ? `<button class="anm2-btn danger" id="anm-del">${L('Delete', 'Eliminar')}</button>` : ''}
        <button class="anm2-btn ghost" id="anm-estilo">${L('Style / Preview', 'Estilo / Vista previa')}</button>
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

  // Ventanita de información del partido
  const infoBtn = bg.querySelector('#anm-info-btn'), infoPop = bg.querySelector('#anm-infopop'), infoX = bg.querySelector('#anm-info-x');
  if (infoBtn && infoPop) {
    infoBtn.onclick = () => { infoPop.hidden = false; };
    if (infoX) infoX.onclick = () => { infoPop.hidden = true; };
    infoPop.onclick = (e) => { if (e.target === infoPop) infoPop.hidden = true; };
  }

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
  // ---- Dropdown de mercado (custom, con estilo completo) ----
  const mktLabels = { ml: L('Match winner (regulation)', 'Ganador del partido (Tiempo reglamentario)'), ml_ot: L('Match winner (incl. OT)', 'Ganador (incl. tiempo extra)'), spread: L('Spread / Handicap', 'Hándicap'), totals: L('Totals (Over/Under)', 'Totales (Más/Menos)') };
  const mktInput = bg.querySelector('#anm-mkt'), mktBtn = bg.querySelector('#anm-mkt-btn'), mktList = bg.querySelector('#anm-mkt-list'), mktLbl = bg.querySelector('#anm-mkt-lbl');
  mktLbl.textContent = mktLabels[mktInput.value] || mktLabels.ml;
  mktBtn.onclick = () => { mktList.hidden = !mktList.hidden; mktBtn.classList.toggle('open', !mktList.hidden); };
  mktList.querySelectorAll('[data-mkt]').forEach(o => o.onclick = () => { mktInput.value = o.dataset.mkt; mktLbl.textContent = mktLabels[o.dataset.mkt]; mktList.hidden = true; mktBtn.classList.remove('open'); });
  document.addEventListener('click', (e) => { if (mktBtn && !e.target.closest('#anm-mkt-dd')) { mktList.hidden = true; mktBtn.classList.remove('open'); } });

  // ---- Modal de vista previa + estilo ----
  const abrirEstiloPreview = (modoPublicar) => {
    const ES2 = _mesaLang === 'es', L2 = (en, es) => ES2 ? es : en;
    prepararEstilosSenal();   // inyecta el CSS de señales para que el preview salga bien
    _estiloDraft = { ...estiloSeguro(_miEstilo) };
    const datos = () => ({
      equipos: `${p.local.nombre} vs ${p.visita.nombre}`,
      local: p.local.nombre, visita: p.visita.nombre,
      logoLocal: p.local.logo || null, logoVisita: p.visita.logo || null,
      favLocal: fav === 'local',
      favorito: fav === 'visita' ? p.visita.nombre : p.local.nombre,
      prob: Number(slL.value),
      confianza: conf,
      mercado: mktInput.value,
      foto: _miFoto,
      analisis: ta.value.trim() || L2('Your analysis will appear here.', 'Tu análisis aparecerá aquí.'),
    });
    document.getElementById('estp-modal')?.remove();
    const pv = document.createElement('div'); pv.className = 'estp-bg'; pv.id = 'estp-modal';
    const cerrar = () => pv.remove();
    const sw = PALETA.map(pp => `<button class="est-sw ${_estiloDraft.color === pp.id ? 'on' : ''}" data-color="${pp.id}" style="--sw:${pp.hex}" title="${esc(ES2 ? pp.nombre.es : pp.nombre.en)}"><i></i></button>`).join('');
    const it = INTENSIDADES.map(k => `<button class="est-int ${_estiloDraft.intensidad === k ? 'on' : ''}" data-inten="${k}">${esc(L2(k === 'subtle' ? 'Subtle' : k === 'normal' ? 'Normal' : 'Bold', k === 'subtle' ? 'Sutil' : k === 'normal' ? 'Normal' : 'Fuerte'))}</button>`).join('');
    const em = Object.keys(EMBLEMAS).map(k => `<button class="est-emb ${_estiloDraft.emblema === k ? 'on' : ''}" data-emb="${k}" title="${esc(ES2 ? EMBLEMA_NOMBRE[k].es : EMBLEMA_NOMBRE[k].en)}">${k === 'none' ? `<span class="est-emb-none">${L2('None', 'Ninguno')}</span>` : EMBLEMAS[k]}</button>`).join('');
    pv.innerHTML = `<div class="estp-modal" role="dialog" aria-modal="true">
      <div class="estp-head"><h3>${L2('This is how your signal will look', 'Así se verá tu señal')}</h3><button class="estp-x" aria-label="close">✕</button></div>
      <div class="estp-body">
        <label class="estp-keep"><input type="checkbox" id="estp-keep" ${_estiloAuto ? 'checked' : ''}><span class="estp-keep-sw"></span><div><b>${L2('Keep my changes for future signals', 'Mantener mis cambios para próximas señales')}</b><em>${L2('Don\u2019t show this window every time. New signals will use this style.', 'No mostrar esta ventana cada vez. Las nuevas señales usarán este estilo.')}</em></div></label>
        <div class="estp-prev sn" id="estp-prev"></div>
        <div class="estp-controls">
          <div class="est-field"><label>${L2('Accent color', 'Color de acento')}</label><div class="est-sws">${sw}</div></div>
          <div class="est-field"><label>${L2('Intensity', 'Intensidad')}</label><div class="est-seg">${it}</div></div>
          <div class="est-field"><label>${L2('Profile photo', 'Foto de perfil')}</label>
            <button type="button" class="est-foto-btn" id="estp-foto">${_miFoto ? `<img src="${rutaFotoAnalista(_miFoto)}" alt="">` : `<span class="est-foto-mas">+</span>`}<span>${_miFoto ? L2('Change photo', 'Cambiar foto') : L2('Choose photo', 'Elegir foto')}</span></button></div>
        </div>
      </div>
      <div class="estp-btns"><button class="estp-cancel">${L2('Cancel', 'Cancelar')}</button><button class="estp-primary">${modoPublicar ? L2('Publish signal', 'Publicar señal') : L2('Save style', 'Guardar estilo')}</button></div>
    </div>`;
    document.body.appendChild(pv);
    const render = () => { const box = pv.querySelector('#estp-prev'); if (box) box.innerHTML = tarjetaMuestra(_estiloDraft, _miFirma, datos()); };
    render();
    const setSel = (sel, val, attr) => pv.querySelectorAll(sel).forEach(x => x.classList.toggle('on', x.dataset[attr] === val));
    pv.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { _estiloDraft.color = b.dataset.color; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-color]', _estiloDraft.color, 'color'); render(); });
    pv.querySelectorAll('[data-inten]').forEach(b => b.onclick = () => { _estiloDraft.intensidad = b.dataset.inten; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-inten]', _estiloDraft.intensidad, 'inten'); render(); });
    pv.querySelectorAll('[data-emb]').forEach(b => b.onclick = () => { _estiloDraft.emblema = b.dataset.emb; _estiloDraft = estiloSeguro(_estiloDraft); setSel('[data-emb]', _estiloDraft.emblema, 'emb'); render(); });
    pv.querySelector('#estp-foto') && (pv.querySelector('#estp-foto').onclick = () => {
      if (!_miUid) return;
      abrirSelectorFotos({
        actual: _miFoto, uidAnalista: _miUid,
        titulo: ML('Your profile photo', 'Tu foto de perfil'), sub: ML('This becomes your permanent photo on every signal.', 'Será tu foto permanente en cada señal.'),
        txtOk: ML('Set photo', 'Poner foto'), txtCancel: ML('Cancel', 'Cancelar'), secHombres: ML('Men', 'Hombres'), secMujeres: ML('Women', 'Mujeres'),
        onGuardar: async (foto) => {
          const ok = await asignarFotoAnalista(_miUid, foto, _miFirma);
          if (ok) { _miFoto = foto; const fb = pv.querySelector('#estp-foto'); if (fb) fb.innerHTML = `<img src="${rutaFotoAnalista(foto)}" alt=""><span>${ML('Change photo', 'Cambiar foto')}</span>`; render(); }
          return ok;
        },
      });
    });
    pv.querySelector('.estp-x').onclick = cerrar; pv.querySelector('.estp-cancel').onclick = cerrar;
    pv.onclick = (e) => { if (e.target === pv) cerrar(); };
    pv.querySelector('.estp-primary').onclick = async () => {
      _miEstilo = { ..._estiloDraft };
      _estiloAuto = pv.querySelector('#estp-keep').checked;
      try { if (_miUid) await fijarAnalista(_miUid, { estilo: { color: _miEstilo.color, intensidad: _miEstilo.intensidad, emblema: _miEstilo.emblema }, estiloAuto: _estiloAuto }); } catch (_) {}
      cerrar();
      if (modoPublicar) publicar('publicado');
    };
  };

  const validarFav = () => {
    if (fav) return true;
    const h = bg.querySelector('#anm-hint'); h.classList.add('err');
    h.textContent = L('Please select the team you think will win.', 'Por favor selecciona el equipo que crees que va a ganar.');
    bg.querySelector('.anm2-pick').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  };
  bg.querySelector('#anm-estilo').onclick = () => { if (validarFav()) abrirEstiloPreview(false); };
  bg.querySelector('#anm-prev').onclick = () => { if (validarFav()) abrirEstiloPreview(false); };
  bg.querySelector('#anm-guardar').onclick = () => { if (!validarFav()) return; if (_estiloAuto) publicar('publicado'); else abrirEstiloPreview(true); };
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };

  const publicar = async (estado) => {
    if (!fav) {
      const hint = bg.querySelector('#anm-hint'); hint.classList.add('err');
      hint.textContent = L('Please select the team you think will win.', 'Por favor selecciona el equipo que crees que va a ganar.');
      bg.querySelector('.anm2-pick').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Moderación: no se publica si el análisis tiene lenguaje prohibido, enlaces o publicidad
    const motivo = _revisarAnalisis(ta.value, L);
    if (motivo) {
      const hint = bg.querySelector('#anm-hint'); hint.classList.add('err');
      hint.textContent = motivo;
      ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus();
      return;
    }
    const probLocal = Number(slL.value);
    const favAb = fav === 'local' ? p.local.abrev : p.visita.abrev;
    const analisis = {
      equipos: `${p.local.nombre} vs ${p.visita.nombre}`,
      local: p.local.nombre, visita: p.visita.nombre,
      logoLocal: p.local.logo || null, logoVisita: p.visita.logo || null,
      favLocal: fav === 'local',
      veredicto: `${fav === 'local' ? p.local.nombre : p.visita.nombre} ${L('to win', 'gana')}`,
      texto: ta.value.trim(),
      ajustar: bg.querySelector('#anm-adj').checked,
      prob: probLocal, favorito: fav === 'local' ? p.local.nombre : p.visita.nombre, confianza: conf,
      mercado: bg.querySelector('#anm-mkt').value, estado,
      deporte: deporteDeLiga(p.ligaId),
      autorUid: _miUid || null,
      firma: _miFirma || null,
      autor: _miNombre || _miFirma || null,
      foto: _miFoto || null,
      estilo: _miEstilo ? { color: _miEstilo.color, intensidad: _miEstilo.intensidad, emblema: _miEstilo.emblema } : null,
    };
    const btn = bg.querySelector(estado === 'borrador' ? '#anm-draft' : '#anm-guardar');
    const txtBtn = btn.textContent; btn.disabled = true; btn.textContent = '…';
    try { await guardarAnalisis(matchId, analisis); _analisis = await listarAnalisis(); cerrar(); pintarTab(); }
    catch (_) { btn.disabled = false; btn.textContent = txtBtn; }
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
  contrato: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>'),
};
function svg(inner) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">${inner}</svg>`; }
