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
import { fijarSuscripcion, tieneAcceso, limpiarVistaPrevia } from './auth/estado-pago.js';

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

  const panel = $('panel');
  const enWeb = panel && getComputedStyle(panel).display !== 'none';
  if (enWeb) {
    const prox = lista.find(p => p.estado === 'vivo') || lista.find(p => p.estado === 'proximo') || lista[0];
    if (prox) { const el = tarjetas.find(x => x.dataset.id === prox.id); abrirDetalle(prox.id, el, { soloPanel: true }); }
  }
}

/* -------- Detalle -------- */
async function abrirDetalle(id, el, opts = {}) {
  partidoSel = id;
  document.querySelectorAll('.pmatch').forEach(x => x.classList.toggle('sel', x === el));
  const p = await detallePartido(id);
  if (p) await aplicarAnalista(p);
  const html = detalle(p, { bloquear: false });
  const panel = $('panel'), hoja = $('hoja');
  if (panel) panel.innerHTML = html;
  if (hoja && !opts.soloPanel) { hoja.querySelector('.hoja-cuerpo').innerHTML = html; hoja.classList.add('abierta'); }
  document.querySelectorAll('[data-compartir]').forEach(b => b.onclick = async () => {
    const pp = await detallePartido(b.dataset.compartir);
    if (pp) { await aplicarAnalista(pp); compartirPartido(pp); }
  });
  actualizarCuenta();
}

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
function onSesion(usuario, extra) {
  pintarCuenta(usuario);
  fijarSuscripcion(usuario?.suscripcion || null);
  if (extra && extra.bloqueado) { mostrarPantalla('landing'); avisarBloqueo(); return; }
  if (!usuario) { mostrarPantalla('landing'); return; }
  // Ruta secreta del panel de administración: #mesa (la seguridad real
  // está en Firestore; si no eres admin, no verás datos).
  if ((location.hash || '').toLowerCase() === '#mesa') { abrirPanelMesa(); return; }
  if (tieneAcceso()) entrarPlataforma();
  else mostrarPantalla('pricing');
}

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

function onCuentaClick() {
  if (!_sesion) {
    if (!estaConfigurado()) { avisoFirebase(); return; }
    abrirAuth();
  } else {
    toggleCuentaMenu();
  }
}

function avisoFirebase() {
  // Si Firebase aún no está configurado, informamos con claridad.
  abrirAuth();  // el modal se abre; al intentar, mostrará el aviso de config
}

function toggleCuentaMenu() {
  let menu = $('cuenta-menu');
  if (menu) { menu.classList.toggle('abierto'); return; }
  menu = document.createElement('div');
  menu.id = 'cuenta-menu';
  menu.className = 'cuenta-menu abierto';
  menu.innerHTML = `
    <div class="quien"><b>${_sesion.nombre || ''}</b><span>${_sesion.email || ''}</span></div>
    <button id="cm-salir">${IC.salir || ''} ${t('auth.salir')}</button>`;
  document.body.appendChild(menu);
  menu.querySelector('#cm-salir').onclick = async () => { limpiarVistaPrevia(); await salir(); cerrarCuentaMenu(); };
  setTimeout(() => document.addEventListener('click', cerrarSiFuera), 0);
}
function cerrarCuentaMenu() { $('cuenta-menu')?.classList.remove('abierto'); document.removeEventListener('click', cerrarSiFuera); }
function cerrarSiFuera(e) {
  if (!e.target.closest('#cuenta-menu') && !e.target.closest('#cuenta-btn')) cerrarCuentaMenu();
}

document.addEventListener('DOMContentLoaded', init);
