/* ============================================================
   APP — arranca y conecta módulos: datos, vistas, tema, idioma,
   logo con respaldo, y compartir imagen.
   ============================================================ */
import { LIGAS, listarPartidos, detallePartido } from './datos/proveedor.js';
import { tarjetaPartido, detalle } from './ui/vistas.js';
import { IC } from './ui/iconos.js';
import { initTema } from './ui/tema.js';
import { initIdioma, fijarIdioma, idiomaActual, t } from './ui/idioma.js';
import { compartirPartido } from './ui/compartir.js';
import { iniciarAuth, registrarCorreo, entrarCorreo, entrarGoogle, salir, mensajeError, estaConfigurado } from './auth/auth.js';
import { initAuthUI, abrirAuth } from './auth/auth-ui.js';
import { initNavegacion, mostrarPantalla, aplicarI18n } from './ui/navegacion.js';
import { fijarSuscripcion, tieneAcceso, limpiarVistaPrevia, marcarVistaPrevia } from './auth/estado-pago.js';

const $ = (id) => document.getElementById(id);

let ligaActiva = null;
let partidoSel = null;

/* -------- Logo con respaldo -------- */
/* Intenta cargar el PNG correcto (según tema y tamaño). Si no existe,
   se queda el texto estilizado como respaldo. */
function actualizarLogo() {
  const cont = $('marca');
  const img = $('logo-img');
  if (!cont || !img) return;
  const oscuro = (document.documentElement.getAttribute('data-tema') !== 'claro');
  const movil = window.matchMedia('(max-width: 1023px)').matches;
  let archivo;
  if (movil) archivo = oscuro ? 'logo-h-oscuro.png' : 'logo-h-claro.png';
  else       archivo = 'logo-nombre-oscuro.png';   // escritorio: siempre el blanco/dorado (se ve mejor en ambos temas)
  img.onload = () => { img.classList.add('visible'); cont.classList.add('tiene-img'); };
  img.onerror = () => { img.classList.remove('visible'); cont.classList.remove('tiene-img'); };
  img.src = 'assets/imagenes/' + archivo;
}

/* -------- Menú lateral móvil (drawer) -------- */
function pintarDrawer() {
  const cont = $('drawer-ligas');
  if (!cont) return;
  const items = [{ id: null, nombre: t('liga.todos'), corto: t('liga.todos'), logo: 'assets/imagenes/dep-todos.png' }, ...LIGAS];
  cont.innerHTML = items.map(l => `
    <button class="liga ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">
      <span class="ic">${ligaIcono(l)}</span>${l.corto || l.nombre}
    </button>`).join('');
  cont.querySelectorAll('.liga').forEach(b => b.onclick = () => {
    ligaActiva = b.dataset.liga || null;
    pintarLigas(); pintarDrawer(); cargarLista(); cerrarDrawer();
  });
  const dt = $('drawer-t'); if (dt) dt.textContent = t('nav.deportes');
}
function abrirDrawer() { $('drawer')?.classList.add('abierto'); $('drawer-bg')?.classList.add('abierto'); }
function cerrarDrawer() { $('drawer')?.classList.remove('abierto'); $('drawer-bg')?.classList.remove('abierto'); }

/* Icono de una liga: imagen si existe, con respaldo a icono SVG */
function ligaIcono(l) {
  if (l.logo) return `<img class="liga-logo" src="${l.logo}" alt="" onerror="this.style.display='none'">`;
  return IC[l.icono] || IC.diana;
}

/* -------- Sidebar de ligas -------- */
function pintarLigas() {
  const cont = $('lista-ligas');
  if (!cont) return;
  const items = [{ id: null, nombre: t('liga.todos'), logo: 'assets/imagenes/dep-todos.png' }, ...LIGAS];
  cont.innerHTML = items.map(l => `
    <button class="liga ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">
      <span class="ic">${ligaIcono(l)}</span>${l.nombre}
    </button>`).join('');
  cont.querySelectorAll('.liga').forEach(b => b.onclick = () => {
    ligaActiva = b.dataset.liga || null; pintarLigas(); pintarPestanas(); cargarLista();
  });
}

/* -------- Pestañas de ligas (móvil) -------- */
function pintarPestanas() {
  const cont = $('pestanas');
  if (!cont) return;
  const items = [{ id: null, nombre: t('liga.todos') }, ...LIGAS.map(l => ({ id: l.id, nombre: l.nombre }))];
  cont.innerHTML = items.map(l => `
    <button class="pestana ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">${l.nombre}</button>`).join('');
  cont.querySelectorAll('.pestana').forEach(b => b.onclick = () => {
    ligaActiva = b.dataset.liga || null; pintarLigas(); pintarPestanas(); cargarLista();
  });
}

/* -------- Lista central -------- */
let _partidos = [];      // últimos partidos cargados (para el buscador)
let _busqueda = '';

async function cargarLista() {
  const cont = $('lista');
  if (!cont) return;
  cont.innerHTML = `<div class="seccion-t">${t('cargando')}</div>`;
  _partidos = await listarPartidos(ligaActiva);
  pintarLista();
}

function pintarLista() {
  const cont = $('lista');
  if (!cont) return;
  const q = _busqueda.trim().toLowerCase();
  let lista = _partidos;
  if (q) {
    lista = _partidos.filter(p => {
      const campos = [p.local?.nombre, p.local?.abrev, p.visita?.nombre, p.visita?.abrev, p.liga];
      return campos.some(c => (c || '').toLowerCase().includes(q));
    });
  }
  if (!lista.length) {
    cont.innerHTML = `<div class="vacio" style="padding:50px;text-align:center">${t('vacio.lista')}</div>`;
    return;
  }
  const titulo = q ? t('seccion.partidos') : (ligaActiva ? t('seccion.partidos') : t('seccion.destacados'));
  cont.innerHTML = `<div class="seccion-t">${titulo}</div>` + lista.map(tarjetaPartido).join('');
  const tarjetas = [...cont.querySelectorAll('.pmatch')];
  tarjetas.forEach(el => el.onclick = () => abrirDetalle(el.dataset.id, el));
}

/* -------- Detalle (modal emergente premium) -------- */
async function abrirDetalle(id, el) {
  partidoSel = id;
  document.querySelectorAll('.pmatch').forEach(x => x.classList.toggle('sel', x === el));
  const p = await detallePartido(id);
  if (p) await aplicarAnalista(p);
  const html = detalle(p, { bloquear: false });
  abrirModalDetalle(html);
  actualizarCuenta();
}

function abrirModalDetalle(html) {
  cerrarModalDetalle();
  const bg = document.createElement('div');
  bg.className = 'det-modal-bg';
  bg.id = 'det-modal-bg';
  bg.innerHTML = `
    <div class="det-modal" role="dialog" aria-modal="true">
      <button class="det-modal-x" id="det-modal-x" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="det-modal-cuerpo panel">${html}</div>
    </div>`;
  document.body.appendChild(bg);
  document.body.classList.add('det-abierto');
  bg.querySelector('#det-modal-x').onclick = cerrarModalDetalle;
  bg.onclick = (e) => { if (e.target === bg) cerrarModalDetalle(); };
  document.addEventListener('keydown', _escDetalle);
  bg.querySelectorAll('[data-compartir]').forEach(b => b.onclick = async () => {
    const pp = await detallePartido(b.dataset.compartir);
    if (pp) { await aplicarAnalista(pp); compartirPartido(pp); }
  });
}
function cerrarModalDetalle() {
  const bg = $('det-modal-bg');
  if (bg) bg.remove();
  document.body.classList.remove('det-abierto');
  document.removeEventListener('keydown', _escDetalle);
  partidoSel = null;
  document.querySelectorAll('.pmatch').forEach(x => x.classList.remove('sel'));
}
function _escDetalle(e) { if (e.key === 'Escape') cerrarModalDetalle(); }

/* Trae el veredicto del analista (si existe) y, si él lo marcó,
   ajusta la probabilidad mostrada para respaldar su criterio. */
async function aplicarAnalista(p) {
  try {
    const { leerAnalisis } = await import('./mesa/mesa-datos.js');
    const a = await leerAnalisis(p.id);
    if (!a) return;
    p.analista = { autor: a.autor, veredicto: a.veredicto, texto: a.texto, probabilidad: a.prob ?? (p.mercado?.local || null) };
    if (a.ajustar && a.prob != null && p.mercado) {
      const L = Math.max(1, Math.min(99, Number(a.prob)));
      if (p.mercado.empate != null) {
        const resto = 100 - L, e = p.mercado.empate || 26;
        p.mercado = { local: L, empate: Math.min(resto, e), visita: Math.max(0, resto - Math.min(resto, e)) };
      } else {
        p.mercado = { local: L, empate: null, visita: 100 - L };
      }
      p.confianza = 'alta';
      p.factores = { en: 'Adjusted by our analyst.', es: 'Ajustado por nuestro analista.' };
    }
  } catch (_) {}
}

/* Cuenta atrás "empieza en Xh Ym", se refresca cada 30s */
let _cuentaTimer = null;
function actualizarCuenta() {
  const pinta = () => {
    document.querySelectorAll('.cuenta[data-cuando]').forEach(el => {
      const d = new Date(el.dataset.cuando);
      if (isNaN(d)) { el.textContent = '—'; return; }
      let ms = d - Date.now();
      if (ms <= 0) { el.textContent = '—'; return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      el.textContent = (h > 0 ? h + 'h ' : '') + m + 'm';
    });
  };
  pinta();
  if (_cuentaTimer) clearInterval(_cuentaTimer);
  _cuentaTimer = setInterval(pinta, 30000);
}

function cerrarHoja() { const h = $('hoja'); if (h) h.classList.remove('abierta'); }

/* -------- Barra inferior móvil -------- */
function initTabbar() {
  const bar = $('tabbar');
  if (!bar) return;
  const tabs = [
    { ic: 'diana', k: 'tab.partidos' }, { ic: 'vivo', k: 'tab.vivo' },
    { ic: 'estrella', k: 'tab.analisis' }, { ic: 'perfil', k: 'tab.perfil' },
  ];
  bar.innerHTML = tabs.map((tb, i) => `
    <button class="t ${i===0?'on':''}"><span class="ic">${IC[tb.ic]}</span>${t(tb.k)}</button>`).join('');
  bar.querySelectorAll('.t').forEach(b => b.onclick = () => {
    bar.querySelectorAll('.t').forEach(x => x.classList.toggle('on', x === b));
    cerrarHoja(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* -------- Botón de idioma -------- */
function initBotonIdioma() {
  const btn = $('idioma-btn');
  if (!btn) return;
  const pinta = () => { btn.innerHTML = `${IC.idioma} ${idiomaActual().toUpperCase()}`; };
  pinta();
  btn.onclick = () => { fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en'); pinta(); };
}

/* -------- Aplicar textos estáticos del HTML -------- */
function aplicarTextos() {
  const buscar = document.querySelector('.buscar input');
  if (buscar) buscar.placeholder = t('buscar.ph');
  const cta = document.querySelector('.btn-oro');
  if (cta) cta.textContent = t('cta.suscribir');
  const eyebrow = document.querySelector('.side .eyebrow');
  if (eyebrow) eyebrow.textContent = t('nav.deportes');
  const cerrar = document.querySelector('#hoja .cerrar');
  if (cerrar) cerrar.innerHTML = `${IC.atras} ${t('volver')}`;
}

/* -------- Re-render al cambiar idioma -------- */
function repintarTodo() {
  aplicarTextos(); pintarLigas(); pintarPestanas(); pintarDrawer(); initTabbar(); cargarLista();
  const panel = $('panel');
  if (panel && !partidoSel) panel.innerHTML = `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
}

/* -------- Arranque -------- */
function init() {
  initTema();
  initIdioma();
  aplicarTextos();
  initTabbar();
  initBotonIdioma();

  // Hamburguesa / drawer (móvil)
  $('hamb')?.addEventListener('click', abrirDrawer);
  $('drawer-x')?.addEventListener('click', cerrarDrawer);
  $('drawer-bg')?.addEventListener('click', cerrarDrawer);

  // Buscador
  const bi = $('buscar-input');
  if (bi) bi.addEventListener('input', () => { _busqueda = bi.value; pintarLista(); });

  // Botón "Volver" de la hoja de detalle (móvil) — ahora sí funciona
  const cerrar = document.querySelector('#hoja .cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarHoja);

  // Reaccionar a cambios de tema/tamaño para el logo
  const btnTema = $('tema-btn');
  if (btnTema) btnTema.addEventListener('click', () => setTimeout(actualizarLogo, 0));
  window.addEventListener('resize', actualizarLogo);
  document.addEventListener('idioma-cambio', repintarTodo);

  // Autenticación (Firebase). Si no está configurado, queda en modo invitado.
  initAuthUI({ registrar: registrarCorreo, entrar: entrarCorreo, google: entrarGoogle, salir, mensajeError });
  $('cuenta-btn')?.addEventListener('click', onCuentaClick);

  // Router de pantallas (landing / planes / plataforma)
  initNavegacion({
    abrirAuth: (modo) => abrirAuth(modo),
    salir: async () => { limpiarVistaPrevia(); await salir(); },
    alEntrarApp: () => entrarPlataforma(),
  });

  iniciarAuth(onSesion);
}

let _appArrancada = false;

/* Decide la pantalla según sesión + acceso */
let _esAdmin = false;

async function onSesion(usuario, extra) {
  pintarCuenta(usuario);
  fijarSuscripcion(usuario?.suscripcion || null);
  if (extra && extra.bloqueado) { mostrarPantalla('landing'); avisarBloqueo(); return; }
  if (!usuario) { _esAdmin = false; mostrarPantalla('landing'); return; }
  // ¿Es administrador? (se comprueba en Firestore; la seguridad real está ahí)
  _esAdmin = false;
  try { const { esAdmin } = await import('./mesa/mesa-datos.js'); _esAdmin = await esAdmin(); } catch (_) {}
  pintarCuenta(usuario);   // repinta para mostrar la opción de panel si es admin
  if ((location.hash || '').toLowerCase() === '#mesa') { try { history.replaceState(null, '', location.pathname); } catch (_) {} }
  if (_esAdmin) marcarVistaPrevia('premium');   // el admin tiene acceso total cuando entre
  // NO entramos automáticamente al cargar: el usuario llega al lobby y entra por su elección.
  // Solo entramos directo si el login fue una acción intencional (tocó "Entrar"/"Registrarse").
  if (extra && extra.intencional) { entrarSegunAcceso(); return; }
  mostrarPantalla('landing');
}

/* Decide a dónde va el usuario cuando ELIGE entrar (login intencional o CTA del lobby) */
function entrarSegunAcceso() {
  if (_esAdmin || tieneAcceso()) entrarPlataforma();
  else mostrarPantalla('pricing');
}
/* El lobby llama a esto cuando el usuario ya tiene sesión y toca "Entrar" */
if (typeof window !== 'undefined') window.__handiEntrar = () => { if (_sesion) { entrarSegunAcceso(); return true; } return false; };

async function abrirPanelMesa() {
  try { const m = await import('./mesa/mesa.js'); m.abrirMesa(); }
  catch (_) { mostrarPantalla('landing'); }
}

function avisarBloqueo() {
  alert('This account has been suspended.');
}

/* Entra a la plataforma (y arranca la app la primera vez) */
function entrarPlataforma() {
  mostrarPantalla('app');
  if (!_appArrancada) {
    _appArrancada = true;
    actualizarLogo(); pintarLigas(); pintarPestanas(); pintarDrawer(); cargarLista();
  }
}

/* Llamado desde el panel: ver el sitio como admin, sin recargar */
export function entrarComoAdmin() {
  const mesa = document.getElementById('mesa-screen');
  if (mesa) { mesa.style.display = 'none'; mesa.innerHTML = ''; }
  document.body.classList.remove('en-mesa');
  entrarPlataforma();
}
if (typeof window !== 'undefined') window.__handiVerSitio = entrarComoAdmin;

/* Estado de sesión actual (usuario o null) */
let _sesion = null;

function pintarCuenta(usuario) {
  _sesion = usuario;
  const btn = $('cuenta-btn');
  if (!btn) return;
  if (usuario) {
    const inicial = (usuario.nombre || usuario.email || '?').charAt(0).toUpperCase();
    btn.classList.add('logueado');
    btn.title = usuario.nombre || usuario.email;
    btn.innerHTML = usuario.foto
      ? `<img class="av-img" src="${usuario.foto}" alt="" style="width:22px;height:22px;border-radius:50%">`
      : `<span class="av-ini">${inicial}</span>`;
  } else {
    btn.classList.remove('logueado');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
  }
  cerrarCuentaMenu();
}

function onCuentaClick(e) {
  if (e) { e.stopPropagation(); }
  if (!_sesion) {
    if (!estaConfigurado()) { avisoFirebase(); return; }
    abrirAuth();
  } else {
    toggleCuentaMenu();
  }
}

function avisoFirebase() { abrirAuth(); }

function toggleCuentaMenu() {
  const existe = $('cuenta-menu');
  if (existe) { existe.remove(); document.removeEventListener('click', cerrarSiFuera); return; }
  const menu = document.createElement('div');
  menu.id = 'cuenta-menu';
  menu.className = 'cuenta-menu abierto';
  const botonPanel = _esAdmin
    ? `<button id="cm-panel">${IC.grafico || ''} ${idiomaActual() === 'es' ? 'Panel administrativo' : 'Admin panel'}</button>` : '';
  menu.innerHTML = `
    <div class="quien"><b>${esc(_sesion.nombre || '')}</b><span>${esc(_sesion.email || '')}</span></div>
    ${botonPanel}
    <button id="cm-salir">${IC.salir || ''} ${t('auth.salir')}</button>`;
  document.body.appendChild(menu);
  menu.querySelector('#cm-panel')?.addEventListener('click', () => { cerrarCuentaMenu(); abrirPanelMesa(); });
  menu.querySelector('#cm-salir').addEventListener('click', async () => { limpiarVistaPrevia(); await salir(); cerrarCuentaMenu(); });
  setTimeout(() => document.addEventListener('click', cerrarSiFuera), 0);
}
function cerrarCuentaMenu() { $('cuenta-menu')?.remove(); document.removeEventListener('click', cerrarSiFuera); }
function cerrarSiFuera(e) {
  if (!e.target.closest('#cuenta-menu') && !e.target.closest('#cuenta-btn')) cerrarCuentaMenu();
}
function esc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

document.addEventListener('DOMContentLoaded', init);
