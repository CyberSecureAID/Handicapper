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
import { iniciarAuth, registrarCorreo, entrarCorreo, entrarGoogle, salir, mensajeError, estaConfigurado, actualizarPerfil, esCuentaGoogle } from './auth/auth.js';
import { initAuthUI, abrirAuth } from './auth/auth-ui.js';
import { initNavegacion, mostrarPantalla, aplicarI18n } from './ui/navegacion.js';
import { fijarSuscripcion, tieneAcceso, limpiarVistaPrevia, marcarVistaPrevia, planActual } from './auth/estado-pago.js';
import { pintarParlay } from './ui/parlay.js';
import { pintarSenales, cargarSenales, contarSenales } from './ui/senales.js';

const $ = (id) => document.getElementById(id);

let ligaActiva = null;
let proyActiva = null;   // 'mlb' | 'soccer' | 'nba' | null (proyecciones premium)
let proyModo = 'premium';   // 'pro' | 'premium' — según el botón usado
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
  const mostrar = () => { img.classList.add('visible'); cont.classList.add('tiene-img'); };
  img.onload = mostrar;
  img.onerror = () => { img.classList.remove('visible'); cont.classList.remove('tiene-img'); };
  const ruta = 'assets/imagenes/' + archivo;
  if (img.getAttribute('src') !== ruta) img.src = ruta;
  if (img.complete && img.naturalWidth) mostrar();   // ya estaba cargada (src puesto en el HTML)
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
    ligaActiva = b.dataset.liga || null; proyActiva = null; try { localStorage.setItem('se-vista', 'partidos'); } catch (_) {} marcarProyeccion();
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
    ligaActiva = b.dataset.liga || null; proyActiva = null; try { localStorage.setItem('se-vista', 'partidos'); } catch (_) {} marcarProyeccion(); pintarLigas(); pintarPestanas(); cargarLista();
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
    ligaActiva = b.dataset.liga || null; proyActiva = null; try { localStorage.setItem('se-vista', 'partidos'); } catch (_) {} marcarProyeccion(); pintarLigas(); pintarPestanas(); cargarLista();
  });
}

/* -------- Lista central -------- */
let _partidos = [];      // últimos partidos cargados (para el buscador)
let _busqueda = '';

async function cargarLista() {
  const cont = $('lista');
  if (!cont) return;
  // Sección premium Parlay (Top 9 P(≥1 hit))
  if (proyActiva) {
    await pintarParlay(cont, {
      sport: proyActiva,
      nivel: _esAdmin ? 'premium' : planActual(),
      modo: proyModo,
      abrirPlanes: () => mostrarPantalla('pricing'),
    });
    return;
  }
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
  const favs = _favs();
  cont.querySelectorAll('.pmatch').forEach(el => {
    el.onclick = (e) => { if (e.target.closest('.pm-fav')) return; abrirDetalle(el.dataset.id, el); };
  });
  cont.querySelectorAll('.pm-fav').forEach(b => {
    if (favs.includes(b.dataset.fav)) b.classList.add('on');
    b.onclick = (e) => { e.stopPropagation(); _toggleFav(b.dataset.fav); b.classList.toggle('on'); };
  });
}

/* Favoritos: persistencia simple en localStorage */
function _favs() { try { return JSON.parse(localStorage.getItem('hc_favs') || '[]'); } catch (_) { return []; } }
function _toggleFav(id) {
  const f = _favs(); const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  try { localStorage.setItem('hc_favs', JSON.stringify(f)); } catch (_) {}
}

/* -------- Detalle (modal emergente premium) -------- */
async function abrirDetalle(id, el) {
  document.querySelectorAll('.pmatch').forEach(x => x.classList.toggle('sel', x === el));
  // 1) Mostrar YA el modal con los datos que la lista ya tiene (instantáneo).
  const base = _partidos.find(x => x.id === id) || null;
  abrirModalDetalle(detalle(base, { bloquear: false, cargando: true }), id);
  partidoSel = id;   // IMPORTANTE: después de abrirModalDetalle (que resetea partidoSel)
  actualizarCuenta();
  // 2) Enriquecer en segundo plano y actualizar el contenido cuando llegue.
  try {
    const p = await detallePartido(id);
    if (!p || partidoSel !== id) return;        // el usuario ya cerró/cambió
    // El número de AFUERA manda: el detalle muestra EXACTAMENTE la misma
    // probabilidad que la tarjeta de la lista (no un recálculo distinto).
    if (base && base.mercado) {
      p.mercado = base.mercado;
      if (base.confianza != null) p.confianza = base.confianza;
      if (base.factores != null) p.factores = base.factores;
      if (base.sinDatos != null) p.sinDatos = base.sinDatos;
    }
    await aplicarAnalista(p);
    if (partidoSel !== id) return;
    const cuerpo = document.querySelector('#det-modal-bg .det-modal-cuerpo');
    if (cuerpo) { cuerpo.innerHTML = detalle(p, { bloquear: false }); _reengancharModal(); }
  } catch (_) {}
}

function abrirModalDetalle(html, id) {
  cerrarModalDetalle();
  const bg = document.createElement('div');
  bg.className = 'det-modal-bg';
  bg.id = 'det-modal-bg';
  bg.innerHTML = `
    <div class="det-modal" role="dialog" aria-modal="true">
      <div class="det-modal-cuerpo panel">${html}</div>
    </div>`;
  document.body.appendChild(bg);
  document.body.classList.add('det-abierto');
  bg.onclick = (e) => { if (e.target === bg) cerrarModalDetalle(); };
  document.addEventListener('keydown', _escDetalle);
  _reengancharModal();
}

/* (Re)engancha los eventos del modal — se llama al abrir y tras enriquecer. */
function _reengancharModal() {
  const bg = $('det-modal-bg');
  if (!bg) return;
  bg.querySelector('[data-cerrar]')?.addEventListener('click', cerrarModalDetalle);
  // Pestañas del panel (cambian el centro)
  bg.querySelectorAll('.hd-tab[data-tab]').forEach(tab => tab.addEventListener('click', () => {
    const id = tab.dataset.tab;
    bg.querySelectorAll('.hd-tab[data-tab]').forEach(t2 => t2.classList.toggle('on', t2 === tab));
    bg.querySelectorAll('.hd-pane-c[data-pane]').forEach(pane => {
      pane.style.display = (pane.dataset.pane === id) ? 'block' : 'none';
    });
  }));
  bg.querySelectorAll('[data-compartir]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const pp = await detallePartido(b.dataset.compartir);
    if (pp) { await aplicarAnalista(pp); compartirPartido(pp); }
  });
  // Menú móvil de secciones (junto a Compartir): reusa el cambio de pestaña
  const menuBtn = bg.querySelector('#hd-menu-btn');
  const menuPop = bg.querySelector('#hd-menu-pop');
  const menuLbl = bg.querySelector('#hd-menu-lbl');
  if (menuBtn && menuPop) {
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); const o = menuPop.classList.toggle('open'); menuBtn.classList.toggle('open', o); });
    bg.querySelectorAll('.hd-menu-item[data-goto]').forEach(it => it.addEventListener('click', () => {
      const tab = bg.querySelector(`.hd-tab[data-tab="${it.dataset.goto}"]`);
      if (tab) tab.click();
      bg.querySelectorAll('.hd-menu-item').forEach(x => x.classList.toggle('on', x === it));
      if (menuLbl) menuLbl.textContent = it.textContent;
      menuPop.classList.remove('open'); menuBtn.classList.remove('open');
    }));
    bg.addEventListener('click', (e) => { if (!e.target.closest('.hd-menu')) { menuPop.classList.remove('open'); menuBtn.classList.remove('open'); } });
  }
  // Seleccionar un jugador en Equipos: su foto/nombre aparece en la tarjeta de su lado.
  const seleccionarJugador = (row) => {
    const side = row.dataset.side; // 'l' | 'r'
    const card = bg.querySelector(`.hd-pit.${side}`);
    if (!card) return;
    const nm = row.dataset.nm || '';
    const partes = nm.trim().split(/\s+/);
    const fn = partes.length > 1 ? partes.slice(0, -1).join(' ') : '';
    const ln = partes.length > 1 ? partes.slice(-1)[0] : nm;
    const foto = row.dataset.foto || '';
    const img = card.querySelector('.hd-pit-photo');
    if (img && foto) { img.classList.remove('is-figura'); img.onerror = null; img.src = foto; }
    const fnEl = card.querySelector('.hd-pit-fn'); if (fnEl) fnEl.textContent = fn;
    const lnEl = card.querySelector('.hd-pit-ln'); if (lnEl) lnEl.textContent = ln;
    const subEl = card.querySelector('.hd-pit-sub'); if (subEl) subEl.textContent = row.dataset.pos || '';
    bg.querySelectorAll('.hd-rp.sel').forEach(x => x.classList.remove('sel'));
    row.classList.add('sel');
  };
  bg.querySelectorAll('.hd-rp[data-nm]').forEach(row => {
    row.addEventListener('click', () => seleccionarJugador(row));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionarJugador(row); } });
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
    { ic: 'diana', k: 'tab.partidos', v: 'partidos' }, { ic: 'vivo', k: 'tab.vivo', v: 'vivo' },
    { ic: 'estrella', k: 'tab.analisis', v: 'analisis' }, { ic: 'perfil', k: 'tab.perfil', v: 'perfil' },
  ];
  bar.innerHTML = tabs.map((tb, i) => `
    <button class="t ${i===0?'on':''}" data-vista="${tb.v}"><span class="ic">${IC[tb.ic]}</span>${t(tb.k)}${tb.v === 'analisis' ? '<span class="t-dot" id="tab-dot"></span>' : ''}</button>`).join('');
  bar.querySelectorAll('.t').forEach(b => b.onclick = () => {
    bar.querySelectorAll('.t').forEach(x => x.classList.toggle('on', x === b));
    cerrarHoja(); window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarVista(b.dataset.vista);
  });
  actualizarPuntoSenales();
}

/* Cambia la vista del contenedor principal (#lista). */
function mostrarVista(v) {
  const cont = $('lista');
  if (!cont) return;
  try { if (v) localStorage.setItem('se-vista', v); } catch (_) {}
  if (v === 'analisis') {
    pintarSenales(cont, { esPremium: _esAdmin || planActual() === 'premium', nivel: _esAdmin ? 'admin' : planActual(), abrirPlanes: () => mostrarPantalla('pricing') });
  } else if (v === 'partidos' || v === 'vivo') {
    proyActiva = null; cargarLista();
  } else if (v === 'perfil') {
    pintarPerfil(cont);
  }
  // 'perfil': se maneja aparte; no cambia el contenido aquí.
}

/* -------- Vista Perfil: feed de analistas seguidos + notificaciones -------- */
function pintarPerfil(cont) {
  const ES = idiomaActual() === 'es';
  const Lp = (en, es) => ES ? es : en;
  const esPrem = _esAdmin || planActual() === 'premium';

  if (!esPrem) {
    cont.innerHTML = `<div class="pf"><div class="pf-lock">
      <div class="pf-lock-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
      <h2>${Lp('Signals inbox', 'Buzón de señales')}</h2>
      <p>${Lp('Upgrade to Premium to follow analysts and get their signals in your inbox, with notifications.', 'Pasa a Premium para seguir analistas y recibir sus señales en tu buzón, con notificaciones.')}</p>
      <button class="pf-cta" id="pf-cta">${Lp('See Premium plan', 'Ver plan Premium')}</button>
    </div></div>`;
    cont.querySelector('#pf-cta')?.addEventListener('click', () => mostrarPantalla('pricing'));
    return;
  }

  let notif; try { notif = JSON.parse(localStorage.getItem('se_notif') || '{}'); } catch (_) { notif = {}; }
  notif = { push: notif.push !== false, nuevas: notif.nuevas !== false, resultados: !!notif.resultados };

  const sw = (k, txt, sub) => `<label class="pf-sw"><div><b>${txt}</b><em>${sub}</em></div><input type="checkbox" data-n="${k}" ${notif[k] ? 'checked' : ''}><span class="pf-sw-t"></span></label>`;

  cont.innerHTML = `<div class="pf">
    <div class="pf-head"><h2>${(IC && IC.buzon) || ''}${Lp('Signals inbox', 'Buzón de señales')}</h2><p>${Lp('Picks from the analysts you follow arrive here as they publish.', 'Los picks de los analistas que sigues llegan aquí en cuanto publican.')}</p></div>
    <div class="pf-card pf-notif">
      <div class="pf-card-h"><span class="pf-card-ic">${(IC && IC.campana) || '🔔'}</span><h3>${Lp('Notifications', 'Notificaciones')}</h3></div>
      ${sw('push', Lp('Push notifications', 'Notificaciones push'), Lp('Alerts on this device', 'Avisos en este dispositivo'))}
      ${sw('nuevas', Lp('New signals', 'Nuevas señales'), Lp('When a followed analyst posts', 'Cuando un analista que sigues publica'))}
      ${sw('resultados', Lp('Results & outcomes', 'Resultados'), Lp('How previous signals landed', 'Cómo salieron las señales anteriores'))}
    </div>
    <div class="pf-card">
      <div class="pf-card-h"><span class="pf-card-ic">${(IC && IC.estrella) || '★'}</span><h3>${Lp('From analysts you follow', 'De los analistas que sigues')}</h3></div>
      <div id="pf-signals"><div class="pf-empty"><div class="sn-spin"></div></div></div>
    </div>
  </div>`;

  cont.querySelectorAll('[data-n]').forEach(chk => chk.onchange = () => {
    notif[chk.dataset.n] = chk.checked;
    try { localStorage.setItem('se_notif', JSON.stringify(notif)); } catch (_) {}
  });

  // Cargar el feed real: señales de los analistas que sigo
  (async () => {
    const cSig = cont.querySelector('#pf-signals');
    if (!cSig) return;
    try {
      const { feedSeguidosHTML } = await import('./ui/senales.js');
      const r = await feedSeguidosHTML();
      cSig.innerHTML = r.total
        ? `<div class="sn-grid">${r.html}</div>`
        : `<div class="pf-empty">${Lp("You're not following anyone yet. Follow an analyst from the Signals tab and their picks will appear here.", 'Aún no sigues a nadie. Sigue a un analista desde la sección de Señales y sus picks aparecerán aquí.')}</div>`;
    } catch (_) {
      cSig.innerHTML = `<div class="pf-empty">${Lp('Could not load your feed. Try again.', 'No se pudo cargar tu feed. Inténtalo de nuevo.')}</div>`;
    }
  })();
}

/* Punto verde en "Análisis" (móvil y escritorio) cuando hay señales publicadas. */
function actualizarPuntoSenales() {
  const has = contarSenales() > 0;
  $('tab-dot')?.classList.toggle('on', has);
  $('premium-btn-dot')?.classList.toggle('on', has);
  $('premium-an-dot')?.classList.toggle('on', has);
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

/* -------- Proyecciones premium (barra superior) -------- */
function actualizarBotonNivel() {
  const pb = document.getElementById('premium-btn');
  if (!pb) return;
  const plan = planActual();
  pb.classList.remove('nivel-pro', 'nivel-premium');
  pb.classList.add(plan === 'pro' ? 'nivel-pro' : 'nivel-premium');
}
function marcarProyeccion() {
  document.querySelectorAll('.proj-b').forEach(b => b.classList.toggle('on', proyActiva === b.dataset.proj));
  document.querySelectorAll('.premium-item').forEach(it => it.classList.toggle('on', proyActiva === it.dataset.projgoto));
  const pb = document.getElementById('premium-btn'); if (pb) pb.classList.toggle('activo', !!proyActiva);
}
function initProyeccion() {
  document.querySelectorAll('.proj-b').forEach(b => b.addEventListener('click', () => {
    proyActiva = b.dataset.proj;
    ligaActiva = null;
    marcarProyeccion(); pintarLigas(); pintarPestanas();
    cargarLista();
  }));
  // Botón Premium (móvil): despliega las proyecciones reusando los handlers de arriba
  const pBtn = document.getElementById('premium-btn');
  const proBtn = document.getElementById('pro-btn');
  const sigBtn = document.getElementById('signals-btn');
  if (sigBtn) sigBtn.addEventListener('click', (e) => { e.stopPropagation(); abrirDirectorioSenales(); });
  const pPop = document.getElementById('premium-pop');
  if (pBtn && pPop) {
    pBtn.addEventListener('click', (e) => { e.stopPropagation(); proyModo = 'premium'; const o = pPop.classList.toggle('open'); pBtn.classList.toggle('open', o); });
    if (proBtn) proBtn.addEventListener('click', (e) => { e.stopPropagation(); proyModo = 'pro'; const o = pPop.classList.toggle('open'); pBtn.classList.toggle('open', o); proBtn.classList.toggle('open', o); });
    const pAn = document.getElementById('premium-analisis');
    if (pAn) pAn.addEventListener('click', () => {
      pPop.classList.remove('open'); pBtn.classList.remove('open');
      document.querySelectorAll('#tabbar .t').forEach(x => x.classList.toggle('on', x.dataset.vista === 'analisis'));
      mostrarVista('analisis');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.querySelectorAll('.premium-item[data-projgoto]').forEach(it => it.addEventListener('click', () => {
      const b = document.querySelector(`.proj-b[data-proj="${it.dataset.projgoto}"]`);
      if (b) b.click();
      pPop.classList.remove('open'); pBtn.classList.remove('open');
    }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.premium-menu')) { pPop.classList.remove('open'); pBtn.classList.remove('open'); } });
  }
}

/* -------- Arranque -------- */
function init() {
  initTema();
  initIdioma();
  aplicarTextos();
  initTabbar();
  initBotonIdioma();
  initProyeccion();

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

  window.addEventListener('resize', actualizarLogo);
  document.addEventListener('idioma-cambio', repintarTodo);

  // Entrada de "Analyst signals" en la barra lateral (escritorio)
  $('side-analisis')?.addEventListener('click', () => {
    document.querySelectorAll('#tabbar .t').forEach(x => x.classList.toggle('on', x.dataset.vista === 'analisis'));
    mostrarVista('analisis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  // Cargar señales una vez para el punto indicador (verde) en móvil y escritorio
  cargarSenales().then(actualizarPuntoSenales).catch(() => {});

  // Autenticación (Firebase). Si no está configurado, queda en modo invitado.
  initAuthUI({ registrar: registrarCorreo, entrar: entrarCorreo, google: entrarGoogle, salir, mensajeError });
  $('cuenta-btn')?.addEventListener('click', onCuentaClick);

  // Router de pantallas (landing / planes / plataforma)
  initNavegacion({
    abrirAuth: (modo) => abrirAuth(modo),
    salir: async () => { try { localStorage.removeItem('se-en-app'); localStorage.removeItem('se-vista'); } catch (_) {} limpiarVistaPrevia(); await salir(); },
    alEntrarApp: () => entrarPlataforma(),
  });

  iniciarAuth(onSesion);
}

let _appArrancada = false;

/* Decide la pantalla según sesión + acceso */
let _esAdmin = false;
let _esAnalista = false;

/* Publica las señales de los bots una vez al día (lo dispara el admin al entrar). */
/* Resuelve las predicciones terminadas y asigna prestigio (throttle 30 min). */
async function resolverPrestigioSiToca() {
  try { const ult = Number(localStorage.getItem('prest-ts') || 0); if (Date.now() - ult < 30 * 60 * 1000) return; } catch (_) {}
  try {
    const [pm, api] = await Promise.all([import('./datos/prestigio.js'), import('./datos/proveedor-api.js')]);
    await pm.resolverPredicciones(api.resultadoPartido);
    try { localStorage.setItem('prest-ts', String(Date.now())); } catch (_) {}
  } catch (_) {}
}

async function publicarBotsSiEsNuevoDia() {
  // Se re-publica el mismo día. Solo throttle de 45 min entre corridas EXITOSAS (evita spam de API).
  // Si una corrida publica 0 (aún no hay oportunidades), NO se marca el throttle -> reintenta al próximo login.
  try { const ult = Number(localStorage.getItem('bots-ts') || 0); if (Date.now() - ult < 45 * 60 * 1000) return; } catch (_) {}
  try {
    const [botMod, datosMod] = await Promise.all([
      import('./datos/bots-senales.js'),
      import('./mesa/mesa-datos.js'),
    ]);
    const r = await botMod.publicarTodosLosBots(datosMod.guardarAnalisis);
    if (r && r.ok && r.publicadas > 0) { try { localStorage.setItem('bots-ts', String(Date.now())); } catch (_) {} }
  } catch (_) {}
}

/* -------- Directorio de analistas (botón "Signals") -------- */
async function abrirDirectorioSenales() {
  const ES = idiomaActual() === 'es';
  const Lp = (en, es) => ES ? es : en;
  const DEP = { futbol: Lp('Soccer','Fútbol'), beisbol: Lp('Baseball','Béisbol'), basket: Lp('Basketball','Básquet'), hockey: Lp('Ice hockey','Hockey'), americano: Lp('American football','Fútbol americano') };
  const ov = document.createElement('div');
  ov.className = 'sd-ov';
  ov.innerHTML = `<div class="sd-modal">
    <button class="sd-x" id="sd-x" aria-label="Close">✕</button>
    <div class="sd-head sd-head-sm"><p>${Lp('Follow an analyst to get their picks in your inbox.', 'Sigue a un analista para recibir sus picks en tu buzón.')}</p></div>
    <div class="sd-tools">
      <div class="sd-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="sd-q" type="text" placeholder="${Lp('Search analysts…', 'Buscar analistas…')}"></div>
      <div class="sd-filter">
        <button class="sd-filter-btn" id="sd-filter-btn" aria-label="${Lp('Filter','Filtrar')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M7 12h10M10 19h4"/></svg></button>
        <div class="sd-filter-pop" id="sd-chips" hidden>
          <button class="sd-fitem on" data-cat="">${Lp('All sports','Todos los deportes')}</button>
          <button class="sd-fitem" data-cat="futbol">${Lp('Soccer','Fútbol')}</button>
          <button class="sd-fitem" data-cat="basket">${Lp('Basketball','Básquet')}</button>
          <button class="sd-fitem" data-cat="hockey">${Lp('Ice hockey','Hockey')}</button>
          <button class="sd-fitem" data-cat="beisbol">${Lp('Baseball','Béisbol')}</button>
          <button class="sd-fitem" data-cat="americano">${Lp('Am. football','F. americano')}</button>
        </div>
      </div>
    </div>
    <div id="sd-list"><div class="sd-loading"><div class="sn-spin"></div></div></div>
  </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#sd-x').onclick = cerrar;
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });

  let datos, bots, analistas, sigo;
  try {
    datos = await import('./mesa/mesa-datos.js');
    bots = await import('./datos/bots.js');
    const [an, sg] = await Promise.all([datos.listarAnalistas().catch(() => []), datos.misSeguidos().catch(() => [])]);
    analistas = an.filter(a => a.activo !== false && a.deporte); sigo = new Set(sg);
  } catch (_) { ov.querySelector('#sd-list').innerHTML = `<div class="sd-loading">${Lp('Could not load.', 'No se pudo cargar.')}</div>`; return; }

  const rows = await Promise.all(analistas.map(async a => {
    let f = 0; try { f = await datos.contarSeguidores(a.uid); } catch (_) {}
    f = bots.seguidoresBot(a, f);
    const likes = bots.likesDe(a);
    const bot = bots.botPorUid(a.uid);
    const prom = bot ? (a.deporte === 'futbol' || a.deporte === 'beisbol' ? '1–2' : '1') : '—';
    return { a, f, likes, prom };
  }));
  rows.sort((x, y) => y.f - x.f);

  const iPer = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.4 2.9-5.3 6.5-5.3s6.5 1.9 6.5 5.3"/></svg>`;
  const foto = (id) => id ? `<img src="assets/imagenes/analistas/${String(id).toLowerCase()}.webp" alt="" loading="lazy">` : `<span class="sd-ini">${iPer}</span>`;
  const cardHTML = ({ a, f, likes, prom }) => {
    const sig = sigo.has(a.uid);
    return `<div class="sd-card" style="--acc:${(a.estilo && a.estilo.color) || '#e8b84b'}">
      <div class="sd-ava">${foto(a.foto)}</div>
      <b class="sd-nom">${esc(a.firma || a.nombre || '')}</b>
      <span class="sd-sport">${esc(DEP[a.deporte] || a.deporte || '')}</span>
      <div class="sd-stats">
        <div><b>${f.toLocaleString()}</b><em>${Lp('Followers','Seguidores')}</em></div>
        <div><b class="sd-prest ${(Number(a.prestigio)||0) < 0 ? 'neg' : ''}">${(Number(a.prestigio)||0) > 0 ? '+' : ''}${Number(a.prestigio)||0}</b><em>${Lp('Prestige','Prestigio')}</em></div>
      </div>
      <button class="sd-follow ${sig ? 'on' : ''}" data-sdfollow="${esc(a.uid)}" data-sdfirma="${esc(a.firma || '')}">${sig ? Lp('Following','Siguiendo') : Lp('Follow','Seguir')}</button>
    </div>`;
  };

  const wireFollow = () => ov.querySelectorAll('[data-sdfollow]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.sdfollow, firma = b.dataset.sdfirma || null;
    const seguir = !sigo.has(uid);
    const aplicar = async (activar) => {
      b.disabled = true;
      try {
        if (activar) { await datos.seguirAnalista(uid, firma); try { await datos.apoyarAnalista(uid, firma); } catch (_) {} sigo.add(uid); b.classList.add('on'); b.textContent = Lp('Following','Siguiendo'); }
        else { await datos.dejarDeSeguir(uid); try { await datos.cancelarApoyo(uid); } catch (_) {} sigo.delete(uid); b.classList.remove('on'); b.textContent = Lp('Follow','Seguir'); }
      } catch (_) {}
      b.disabled = false;
    };
    if (!seguir) return aplicar(false);
    if (_esAdmin) return aplicar(true);
    abrirPagoAnalista(firma, () => aplicar(true));
  });

  let cat = '', q = '';
  const render = () => {
    const filt = rows.filter(r => (!cat || r.a.deporte === cat) && (!q || String(r.a.firma || r.a.nombre || '').toLowerCase().includes(q)));
    ov.querySelector('#sd-list').innerHTML = filt.length ? `<div class="sd-grid">${filt.map(cardHTML).join('')}</div>` : `<div class="sd-loading">${Lp('No analysts found.','No se encontraron analistas.')}</div>`;
    wireFollow();
  };
  render();
  const inp = ov.querySelector('#sd-q'); if (inp) inp.oninput = () => { q = inp.value.trim().toLowerCase(); render(); };
  const _pop = ov.querySelector('#sd-chips'), _fbtn = ov.querySelector('#sd-filter-btn');
  _fbtn && (_fbtn.onclick = (e) => { e.stopPropagation(); _pop.hidden = !_pop.hidden; _fbtn.classList.toggle('on', !_pop.hidden); });
  ov.addEventListener('click', (e) => { if (_pop && !_pop.hidden && !e.target.closest('.sd-filter')) { _pop.hidden = true; _fbtn.classList.remove('on'); } });
  ov.querySelectorAll('.sd-fitem').forEach(c => c.onclick = () => { cat = c.dataset.cat; ov.querySelectorAll('.sd-fitem').forEach(x => x.classList.toggle('on', x === c)); if (_fbtn) { _fbtn.classList.toggle('activo', !!cat); _fbtn.classList.remove('on'); } if (_pop) _pop.hidden = true; render(); });
}

/* Ventana de cobro (para vincular con Stripe). Requiere aceptar los términos. */
function abrirPagoAnalista(firma, onPagar) {
  const ES = idiomaActual() === 'es';
  const Lp = (en, es) => ES ? es : en;
  const ov = document.createElement('div');
  ov.className = 'pay-ov';
  ov.innerHTML = `<div class="pay-modal">
    <button class="pay-x" id="pay-x" aria-label="Close">✕</button>
    <div class="pay-price">$2<span>/${Lp('mo','mes')}</span></div>
    <h3>${Lp('Follow', 'Seguir a')} ${esc(firma || '')}</h3>
    <p>${Lp('You will get this analyst\\u2019s signals in your inbox, with notifications.', 'Recibirás las señales de este analista en tu buzón, con notificaciones.')}</p>
    <div class="pay-note">${Lp('Analysts publish only when they see a high probability opportunity. They are not required to post every day.', 'Los analistas publican solo cuando ven una oportunidad de alta probabilidad. No están obligados a publicar todos los días.')}</div>
    <label class="pay-agree"><input type="checkbox" id="pay-ok"><span>${Lp('I understand and agree.', 'Entiendo y estoy de acuerdo.')}</span></label>
    <button class="pay-btn" id="pay-btn" disabled>${Lp('Pay $2/mo and follow', 'Pagar $2/mes y seguir')}</button>
  </div>`;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#pay-x').onclick = cerrar;
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
  const chk = ov.querySelector('#pay-ok'), btn = ov.querySelector('#pay-btn');
  chk.onchange = () => { btn.disabled = !chk.checked; };
  btn.onclick = async () => { btn.disabled = true; try { await onPagar(); } catch (_) {} cerrar(); };
}

async function onSesion(usuario, extra) {  pintarCuenta(usuario);
  fijarSuscripcion(usuario?.suscripcion || null);
  actualizarBotonNivel();
  if (extra && extra.bloqueado) { mostrarPantalla('landing'); avisarBloqueo(); return; }
  if (!usuario) { _esAdmin = false; _esAnalista = false; mostrarPantalla('landing'); return; }
  // ¿Es administrador? (se comprueba en Firestore; la seguridad real está ahí)
  _esAdmin = false; _esAnalista = false;
  try { const { esAdmin, esAnalista } = await import('./mesa/mesa-datos.js'); _esAdmin = await esAdmin(); if (!_esAdmin) { const a = await esAnalista(); _esAnalista = !!a; } } catch (_) {}
  pintarCuenta(usuario);   // repinta para mostrar la opción de panel si es admin
  if ((location.hash || '').toLowerCase() === '#mesa') { try { history.replaceState(null, '', location.pathname); } catch (_) {} }
  if (_esAdmin) marcarVistaPrevia('premium');   // el admin tiene acceso total cuando entre
  if (_esAdmin) publicarBotsSiEsNuevoDia();     // señales de bots automáticas (1 vez al día)
  if (_esAdmin) resolverPrestigioSiToca();      // resuelve predicciones terminadas -> prestigio
  // Foto de perfil (de la ficha de analista) en el avatar de la esquina superior derecha
  try {
    const { leerFichaAnalista } = await import('./mesa/mesa-datos.js');
    const ficha = await leerFichaAnalista();
    if (ficha && ficha.foto) {
      const btn = $('cuenta-btn');
      if (btn) { btn.classList.add('logueado'); btn.innerHTML = `<img class="av-img" src="assets/imagenes/analistas/${String(ficha.foto).toLowerCase()}.webp" alt="">`; }
    }
  } catch (_) {}
  // NO entramos automáticamente al cargar: el usuario llega al lobby y entra por su elección.
  // Solo entramos directo si el login fue una acción intencional (tocó "Entrar"/"Registrarse").
  if (extra && extra.intencional) { entrarSegunAcceso(); return; }
  // Refresco: si el usuario estaba DENTRO de la app, devolverlo ahí (a su misma vista)
  let _restaurar = false; try { _restaurar = localStorage.getItem('se-en-app') === '1'; } catch (_) {}
  if (_restaurar && (_esAdmin || tieneAcceso())) {
    let _v = null; try { _v = localStorage.getItem('se-vista'); } catch (_) {}   // leer ANTES
    entrarPlataforma();
    if (_v && _v !== 'partidos') setTimeout(() => { const tb = document.querySelector(`#tabbar .t[data-vista="${_v}"]`); if (tb) tb.click(); }, 90);
    return;
  }
  mostrarPantalla('landing');
}

/* Decide a dónde va el usuario cuando ELIGE entrar (login intencional o CTA del lobby) */
function entrarSegunAcceso() {
  if (_esAdmin || tieneAcceso()) entrarPlataforma();
  else mostrarPantalla('pricing');
}
/* El lobby llama a esto cuando el usuario ya tiene sesión y toca "Entrar" */
if (typeof window !== 'undefined') window.__handiEntrar = () => { if (_sesion) { entrarSegunAcceso(); return true; } return false; };

/* -------- Configuración obligatoria del analista (una sola vez) -------- */
async function abrirConfigAnalista() {
  const ES = idiomaActual() === 'es';
  const Lc = (en, es) => ES ? es : en;
  let mods;
  try {
    mods = {
      fotos: await import('./datos/fotos-analistas.js'),
      datos: await import('./mesa/mesa-datos.js'),
    };
  } catch (_) { abrirPanelMesa(); return; }
  const { FOTOS_HOMBRE, FOTOS_MUJER, rutaFotoAnalista } = mods.fotos;
  const [ficha, ocupadas] = await Promise.all([
    mods.datos.leerFichaAnalista().catch(() => null),
    mods.datos.fotosOcupadas().catch(() => ({})),
  ]);
  const miUid = _sesion && _sesion.uid;
  let fotoSel = (ficha && ficha.foto) || null;

  const celda = (id) => {
    const dueno = ocupadas[id];
    const bloq = dueno && dueno !== miUid;
    return `<button type="button" class="ca-foto${fotoSel === id ? ' sel' : ''}${bloq ? ' bloq' : ''}" data-foto="${id}" ${bloq ? 'disabled' : ''}>
      <img src="${rutaFotoAnalista(id)}" alt="" loading="lazy">
      ${bloq ? '<span class="ca-lock">🔒</span>' : ''}
      <span class="ca-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
    </button>`;
  };

  const ov = document.createElement('div');
  ov.className = 'ca-ov';
  ov.innerHTML = `<div class="ca-modal">
    <div class="ca-head">
      <h2>${Lc('Set up your analyst profile', 'Configura tu perfil de analista')}</h2>
      <p>${Lc('Do this once to start publishing signals. Both fields are required.', 'Hazlo una vez para empezar a publicar señales. Ambos campos son obligatorios.')}</p>
    </div>
    <label class="ca-field">
      <span>${Lc('Analyst name', 'Nombre de analista')}</span>
      <input id="ca-nombre" type="text" maxlength="28" placeholder="${Lc('e.g. Carlos M.', 'ej. Carlos M.')}" value="${esc((ficha && (ficha.firma || ficha.nombre)) || '')}">
    </label>
    <div class="ca-pick">
      <div class="ca-pick-h">${Lc('Choose your photo', 'Elige tu foto')} <em id="ca-elegida"></em></div>
      <div class="ca-sec-t">${Lc('Men', 'Hombres')}</div>
      <div class="ca-grid">${FOTOS_HOMBRE.map(celda).join('')}</div>
      <div class="ca-sec-t">${Lc('Women', 'Mujeres')}</div>
      <div class="ca-grid">${FOTOS_MUJER.map(celda).join('')}</div>
    </div>
    <div class="ca-foot">
      <button type="button" class="ca-cancel" id="ca-cancel">${Lc('Cancel', 'Cancelar')}</button>
      <button type="button" class="ca-save" id="ca-save" disabled>${Lc('Save & continue', 'Guardar y continuar')}</button>
    </div>
    <div class="ca-err" id="ca-err"></div>
  </div>`;
  document.body.appendChild(ov);

  const inp = ov.querySelector('#ca-nombre');
  const btn = ov.querySelector('#ca-save');
  const err = ov.querySelector('#ca-err');
  const eleg = ov.querySelector('#ca-elegida');

  const revisar = () => {
    const nombreOk = inp.value.trim().length >= 2;
    btn.disabled = !(nombreOk && fotoSel);
    eleg.textContent = fotoSel ? '· ' + fotoSel : '';
  };
  inp.addEventListener('input', revisar);

  ov.querySelectorAll('.ca-foto').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('bloq')) return;
    ov.querySelectorAll('.ca-foto.sel').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); fotoSel = b.dataset.foto; revisar();
  }));

  const cerrar = () => ov.remove();
  ov.querySelector('#ca-cancel').addEventListener('click', cerrar);
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });

  btn.addEventListener('click', async () => {
    const nombre = inp.value.trim();
    if (nombre.length < 2 || !fotoSel) return;
    btn.disabled = true; err.textContent = '';
    const ok = await mods.datos.reclamarFoto(fotoSel, nombre);
    if (!ok) { err.textContent = Lc('That photo was just taken. Pick another.', 'Esa foto se acaba de ocupar. Elige otra.'); btn.disabled = false; return; }
    await mods.datos.guardarPerfilAnalista({ nombre, firma: nombre, foto: fotoSel });
    cerrar();
    abrirPanelMesa();
  });

  revisar();
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
  try { localStorage.setItem('se-en-app', '1'); localStorage.setItem('se-vista', 'partidos'); } catch (_) {}
  mostrarPantalla('app');
  if (!_appArrancada) {
    _appArrancada = true;
    actualizarLogo(); pintarLigas(); pintarPestanas(); pintarDrawer(); cargarLista();
    setTimeout(_actualizarPuntoSenal, 1500); setInterval(_actualizarPuntoSenal, 120000);
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
      ? `<img class="av-img" src="${usuario.foto}" alt="">`
      : `<span class="av-ini">${inicial}</span>`;
  } else {
    btn.classList.remove('logueado');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
  }
  cerrarCuentaMenu();
}

/* Confirmar y eliminar la cuenta (Firestore + Auth). */
function _confirmarEliminarCuenta() {
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  if (document.getElementById('dc-ov')) return;
  const ov = document.createElement('div'); ov.id = 'dc-ov'; ov.className = 'pmf-ov';
  ov.innerHTML = `<div class="pmf-modal">
    <div class="pmf-ic" style="color:#ff6b72;background:rgba(240,82,90,.14);border-color:rgba(240,82,90,.35)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></div>
    <h3>${L('Are you sure?', '¿Estás seguro?')}</h3>
    <p>${L('Do you want to delete your account? This action is irreversible.', '¿Deseas eliminar tu cuenta? Esta opción es irreversible.')}</p>
    <div class="pmf-btns"><button class="pmf-cancel">${L('Cancel', 'Cancelar')}</button><button class="pmf-go" id="dc-yes" style="background:linear-gradient(135deg,#f0525a,#c0333a);color:#fff">${L('Yes, delete my account', 'Sí, eliminar mi cuenta')}</button></div>
  </div>`;
  document.body.appendChild(ov);
  const q = () => ov.remove();
  ov.querySelector('.pmf-cancel').onclick = q;
  ov.onclick = (e) => { if (e.target === ov) q(); };
  ov.querySelector('#dc-yes').onclick = async () => {
    const btn = ov.querySelector('#dc-yes'); btn.disabled = true; btn.textContent = L('Deleting…', 'Eliminando…');
    try {
      const { eliminarCuenta } = await import('./auth/auth.js');
      await eliminarCuenta();
      try { localStorage.clear(); } catch (_) {}
      q(); const pp = document.getElementById('pp-ov'); if (pp) pp.remove(); document.body.style.overflow = '';
      mostrarPantalla('landing'); avisoToast(L('Account deleted', 'Cuenta eliminada'));
    } catch (e) {
      btn.disabled = false; btn.textContent = L('Delete', 'Eliminar');
      if (e && e.code === 'auth/requires-recent-login') avisoToast(L('Please log in again, then delete your account.', 'Vuelve a iniciar sesión y luego elimina la cuenta.'));
      else avisoToast(L('Error deleting account.', 'Error al eliminar la cuenta.'));
    }
  };
}

/* Modal: se necesita Premium para poner foto de perfil. */
function _modalPremiumFoto() {
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  if (document.getElementById('pmf-ov')) return;
  const ov = document.createElement('div'); ov.id = 'pmf-ov'; ov.className = 'pmf-ov';
  ov.innerHTML = `<div class="pmf-modal">
    <div class="pmf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
    <h3>${L('Premium feature', 'Función Premium')}</h3>
    <p>${L('You need the Premium plan to set a profile photo. It lets you share your stats showing they come from you.', 'Debes tener el plan Premium para poner una foto de perfil. Te permite compartir tus estadísticas mostrando que provienen de ti.')}</p>
    <div class="pmf-btns"><button class="pmf-cancel">${L('Close', 'Cerrar')}</button><button class="pmf-go">${L('See Premium', 'Ver Premium')}</button></div>
  </div>`;
  document.body.appendChild(ov);
  const q = () => ov.remove();
  ov.querySelector('.pmf-cancel').onclick = q;
  ov.onclick = (e) => { if (e.target === ov) q(); };
  ov.querySelector('.pmf-go').onclick = () => { q(); document.getElementById('pp-ov') && document.getElementById('pp-ov').remove(); document.body.style.overflow = ''; mostrarPantalla('pricing'); };
}

/* Fase 3 — carga el buzón + notificaciones con las señales reales de los analistas que sigue el Premium. */
async function _cargarBuzonPerfil(ov, esPrem) {
  if (!esPrem || !ov) return;
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  let signals = [];
  try { const { senalesSeguidas } = await import('./ui/senales.js'); signals = await senalesSeguidas(); } catch (_) {}
  const buzon = ov.querySelector('#pp-buzon-list'), notis = ov.querySelector('#pp-notis-list');
  const bB = ov.querySelector('#pp-buzon-badge'), nB = ov.querySelector('#pp-noti-badge');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const tiempo = (a) => { try { const t = a.actualizado, d = t && t.toDate ? t.toDate() : new Date(t); const m = Math.round((Date.now() - d.getTime()) / 60000); if (m < 60) return m + 'm'; const h = Math.round(m / 60); return h < 24 ? h + 'h' : Math.round(h / 24) + 'd'; } catch (_) { return ''; } };
  const notiItem = (a) => `<div class="pp-r-item"><span class="pp-r-ic azul">${arrow}</span><div><b>${L('New signal', 'Nueva señal')}: ${esc(a.firma || a.autor || '')}</b><span>${esc(a.equipos || '')}</span></div><em>${tiempo(a)}</em></div>`;
  // BUZÓN: siempre un botón "Acceder al buzón" que abre el modal aparte.
  if (buzon) {
    buzon.innerHTML = `<button class="pp-buzon-btn" id="pp-buzon-open">${L('Access inbox', 'Acceder al buzón')} ${arrow}</button>`;
    const ob = buzon.querySelector('#pp-buzon-open'); if (ob) ob.onclick = () => _abrirBuzonModal(signals);
  }
  if (bB) { bB.textContent = signals.length; bB.hidden = signals.length === 0; }
  // NOTIFICACIONES: las señales recientes como avisos.
  if (notis) notis.innerHTML = signals.length ? signals.slice(0, 3).map(notiItem).join('') : `<div class="pp-empty-sm">${L('No new notifications.', 'Sin notificaciones nuevas.')}</div>`;
  if (nB) { nB.textContent = Math.min(signals.length, 9); nB.hidden = signals.length === 0; }
  _notificarNuevas(signals);
}

/* Modal grande con los 3 planes (se abre desde el trofeo). Estilo Hostinger:
   todos muestran las MISMAS filas, con ✓ lo que traen y ✗ lo que no. */
async function _abrirPlanesModal() {
  if (document.getElementById('pl-ov')) return;
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  let PLANES = [];
  try { const m = await import('./datos/planes.js'); PLANES = m.PLANES || []; } catch (_) {}
  const nivelAct = _esAdmin ? 'premium' : planActual();
  // Matriz de características: cada fila dice qué tiene cada plan (true / false / texto corto)
  const F = [
    { t: L('All leagues & categories', 'Todas las ligas y categorías'), b: true, p: true, pr: true },
    { t: L('Advanced team & player comparison', 'Comparación avanzada de equipos y jugadores'), b: true, p: true, pr: true },
    { t: L('Hire specialized analyst signals', 'Contratar señales de analistas'), b: true, p: true, pr: true },
    { t: L('Hits, Goals, Points & Shots', 'Hits, Goals, Points y Shots'), b: false, p: L('Limited', 'Limitado'), pr: L('Full', 'Completo') },
    { t: 'Fútbol Rubio', b: false, p: L('Limited', 'Limitado'), pr: L('Full', 'Completo') },
    { t: L('Analyst signals access', 'Acceso a señales de analistas'), b: false, p: L('Limited', 'Limitado'), pr: '~50%' },
    { t: L('Push notifications', 'Notificaciones push'), b: false, p: false, pr: true },
    { t: L('Profile photo', 'Foto de perfil'), b: false, p: false, pr: true },
  ];
  const chk = '<svg class="pl-yes" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  const cross = '<svg class="pl-no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const celda = (v) => v === true ? chk : (v === false || v == null) ? cross : `${chk}<i>${esc(v)}</i>`;
  const key = (p) => p.id === 'basic' ? 'b' : p.id === 'pro' ? 'p' : 'pr';
  const card = (p) => {
    const k = key(p);
    const filas = F.map(f => `<li class="${(f[k] === false || f[k] == null) ? 'off' : ''}">${celda(f[k])}<span>${esc(f.t)}</span></li>`).join('');
    const actual = p.id === nivelAct;
    return `<div class="pl-m-card pl-m-${p.id} ${p.destacado ? 'feat' : ''} ${actual ? 'actual' : ''}">
      <div class="pl-m-top">
        ${p.etiqueta ? `<span class="pl-m-tag">${esc(ES ? p.etiqueta.es : p.etiqueta.en)}</span>` : '<span class="pl-m-tag ghost"></span>'}
        <div class="pl-m-name">${esc(p.nombre)}</div>
        <div class="pl-m-price">$${p.mensual}<span>/${L('mo', 'mes')}</span></div>
      </div>
      <ul class="pl-m-list">${filas}</ul>
      <button class="pl-m-btn ${actual ? 'on' : ''}" ${actual ? 'disabled' : ''}>${actual ? L('Your current plan', 'Tu plan actual') : L('Choose plan', 'Elegir plan')}</button>
    </div>`;
  };
  const ov = document.createElement('div'); ov.id = 'pl-ov'; ov.className = 'bz-ov';
  ov.innerHTML = `<div class="bz-modal pl-modal"><button class="bz-x" aria-label="close">✕</button>
    <div class="bz-head"><h3>${L('Plans & pricing', 'Planes y precios')}</h3><p>${L('Choose the plan that fits you best.', 'Elige el plan que mejor se adapta a ti.')}</p></div>
    <div class="bz-body"><div class="pl-m-grid">${PLANES.map(card).join('')}</div></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.bz-x').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  ov.querySelectorAll('.pl-m-btn:not([disabled])').forEach(b => b.onclick = () => { ov.remove(); const pp = document.getElementById('pp-ov'); if (pp) pp.remove(); document.body.style.overflow = ''; mostrarPantalla('pricing'); });
}

/* Modal grande del Buzón de señales (Fase 4). Las caducadas ya vienen filtradas por cargarSenales. */
function _abrirBuzonModal(signals) {
  if (document.getElementById('bz-ov')) return;
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const inbox = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 6h13l3.5 6v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"/></svg>';
  const tiempo = (a) => { try { const t = a.actualizado, d = t && t.toDate ? t.toDate() : new Date(t); const m = Math.round((Date.now() - d.getTime()) / 60000); if (m < 60) return m + 'm'; const h = Math.round(m / 60); return h < 24 ? h + 'h' : Math.round(h / 24) + 'd'; } catch (_) { return ''; } };
  const item = (a) => `<div class="bz-item"><span class="bz-ic">${arrow}</span><div class="bz-tx"><b>${esc(a.favorito || (a.veredicto || '').replace(/ (to win|gana)$/i, ''))} <em>${a.prob != null ? a.prob + '%' : ''}</em></b><span>${esc(a.equipos || '')}</span><small>${esc(a.firma || a.autor || '')} · ${tiempo(a)}</small></div></div>`;
  const cuerpo = (signals && signals.length) ? signals.map(item).join('') : `<div class="bz-empty">${inbox}<p>${L('Follow analysts to receive their signals here.', 'Sigue analistas para recibir tus señales aquí.')}</p></div>`;
  const ov = document.createElement('div'); ov.id = 'bz-ov'; ov.className = 'bz-ov';
  ov.innerHTML = `<div class="bz-modal"><button class="bz-x" aria-label="close">✕</button>
    <div class="bz-head"><h3>${L('Signals inbox', 'Buzón de señales')}</h3><p>${L('Your most recent signals. Resolved matches disappear automatically.', 'Tus señales más recientes. Las que ya se resolvieron desaparecen solas.')}</p></div>
    <div class="bz-body">${cuerpo}</div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('.bz-x').onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
}
function _notificarNuevas(signals) {
  try {
    if (localStorage.getItem('pp-push') !== '1' || !('Notification' in window) || Notification.permission !== 'granted') { localStorage.setItem('pp-vistos', JSON.stringify(signals.map(a => a.matchId || a.id).slice(0, 60))); return; }
    const vistos = JSON.parse(localStorage.getItem('pp-vistos') || '[]');
    const nuevos = signals.filter(a => !vistos.includes(a.matchId || a.id));
    nuevos.slice(0, 3).forEach(a => { try { new Notification('Sports Expectations', { body: (a.firma || a.autor || '') + ': ' + (a.favorito || a.equipos || ''), icon: 'assets/imagenes/logo-h-oscuro.png' }); } catch (_) {} });
    localStorage.setItem('pp-vistos', JSON.stringify(signals.map(a => a.matchId || a.id).slice(0, 60)));
  } catch (_) {}
}

/* Eliminar la foto de perfil (vuelve a la inicial). */
async function _eliminarFotoPerfil(ov) {
  const ES = idiomaActual() === 'es';
  const nom = (_sesion && (_sesion.nombre || (_sesion.email || '').split('@')[0])) || '?';
  const ini = String(nom).charAt(0).toUpperCase();
  const cur = _sesion && _sesion.foto;
  if (!cur) { avisoToast(ES ? 'No tienes una foto puesta.' : 'You have no photo set.'); return; }
  try {
    const { guardarFotoUsuario } = await import('./auth/auth.js');
    await guardarFotoUsuario(null);
    if (_sesion) _sesion.foto = null;
    const av = ov && ov.querySelector('.pp-av'); if (av) av.textContent = ini;
    const cb = document.getElementById('cuenta-btn'); if (cb) cb.innerHTML = `<span class="av-ini">${ini}</span>`;
    avisoToast(ES ? 'Foto eliminada \u2713' : 'Photo removed \u2713');
  } catch (e) { avisoToast(ES ? 'Error al eliminar.' : 'Error removing.'); }
}

/* Modal de opciones de foto de perfil: seleccionar o eliminar. */
function _modalOpcionesFoto(ov) {
  const ES = idiomaActual() === 'es', L = (en, es) => ES ? es : en;
  if (document.getElementById('of-ov')) return;
  const tieneFoto = !!(_sesion && _sesion.foto);
  const o = document.createElement('div'); o.id = 'of-ov'; o.className = 'pmf-ov';
  o.innerHTML = `<div class="pmf-modal">
    <div class="pmf-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
    <h3>${L('Profile photo', 'Foto de perfil')}</h3>
    <p>${L('Pick any photo. It is auto-optimized to a light size before saving.', 'Selecciona la foto de tu preferencia. Se optimiza sola a un tamaño ligero antes de guardarse.')}</p>
    <div class="pmf-btns" style="flex-direction:column">
      <button class="pmf-go" id="of-sel" style="width:100%">${L('Choose a photo', 'Seleccionar foto')}</button>
      ${tieneFoto ? `<button class="pmf-cancel" id="of-del" style="width:100%;color:#ff6b72;border-color:rgba(240,82,90,.45)">${L('Remove photo', 'Eliminar foto')}</button>` : ''}
    </div>
    <button class="of-close" id="of-close">${L('Cancel', 'Cancelar')}</button>
  </div>`;
  document.body.appendChild(o);
  const q = () => o.remove();
  o.querySelector('#of-close').onclick = q;
  o.onclick = (e) => { if (e.target === o) q(); };
  o.querySelector('#of-sel').onclick = () => { q(); _fotoPerfilFlujo(ov); };
  const del = o.querySelector('#of-del'); if (del) del.onclick = () => { q(); _eliminarFotoPerfil(ov); };
}

/* Subir foto de perfil (solo Premium): redimensiona + comprime para no llenar Firebase. */
function _fotoPerfilFlujo(ov) {
  const ES = idiomaActual() === 'es';
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { avisoToast(ES ? 'Debe ser una imagen.' : 'Must be an image.'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const max = 400; let w = img.width, h = img.height;
        if (w >= h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > w && h > max) { w = Math.round(w * max / h); h = max; }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        let q = 0.82, data = cv.toDataURL('image/jpeg', q);
        while (data.length * 0.73 > 150 * 1024 && q > 0.4) { q -= 0.1; data = cv.toDataURL('image/jpeg', q); }
        if (data.length * 0.73 > 150 * 1024) { avisoToast(ES ? 'La imagen es demasiado grande. Prueba otra.' : 'Image too large. Try another.'); return; }
        const av = ov && ov.querySelector('.pp-av'); const prev = av ? av.innerHTML : '';
        if (av) av.innerHTML = `<img src="${data}" alt="">`;
        try {
          const { guardarFotoUsuario } = await import('./auth/auth.js');
          await guardarFotoUsuario(data);
          if (_sesion) _sesion.foto = data;
          const cb = document.getElementById('cuenta-btn'); if (cb) { cb.classList.add('logueado'); cb.innerHTML = `<img class="av-img" src="${data}" alt="">`; }
          avisoToast(ES ? 'Foto actualizada \u2713' : 'Photo updated \u2713');
        } catch (e) { if (av) av.innerHTML = prev; avisoToast(ES ? 'Error al guardar la foto.' : 'Error saving photo.'); }
      };
      img.onerror = () => avisoToast(ES ? 'No se pudo leer la imagen.' : 'Could not read image.');
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  inp.click();
}

/* ============================================================
   PANEL DE PERFIL — pantalla grande de 3 columnas (Fase 1: estructura)
   ============================================================ */
function abrirPanelPerfil() {
  if (document.getElementById('pp-ov')) return;
  const ES = idiomaActual() === 'es';
  const L = (en, es) => ES ? es : en;
  const u = _sesion || {};
  const nombre = u.nombre || (u.email || '').split('@')[0] || (ES ? 'Usuario' : 'User');
  const email = u.email || '';
  const usuario = (u.email || '').split('@')[0] || '';
  let nivel, badge;
  if (_esAdmin) { nivel = 'admin'; badge = 'Admin'; }
  else if (_esAnalista) { nivel = 'analista'; badge = ES ? 'Analista' : 'Analyst'; }
  else { nivel = planActual(); badge = nivel === 'premium' ? 'Premium' : nivel === 'pro' ? 'Pro' : (ES ? 'Básico' : 'Basic'); }
  const esPrem = _esAdmin || nivel === 'premium';
  const ini = (nombre || '?').charAt(0).toUpperCase();

  const I = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.4 2.9-5.3 6.5-5.3s6.5 1.9 6.5 5.3"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 6h13l3.5 6v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l5-9 4 5 3-7 6 11z"/></svg>',
    salir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    trofeo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3"/></svg>',
  };
  const item = (id, ic, txt, badge2, extra) => `<button class="pp-item ${extra || ''}" data-pp="${id}">${ic}<span>${txt}</span>${badge2 ? `<em class="pp-badge">${badge2}</em>` : ''}</button>`;

  const banderaES = `<svg viewBox="0 0 30 20" width="21" height="14" style="border-radius:3px;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.4)"><rect width="30" height="20" fill="#fff"/><rect width="30" height="4" fill="#002a8f"/><rect width="30" height="4" y="8" fill="#002a8f"/><rect width="30" height="4" y="16" fill="#002a8f"/><path d="M0 0L13 10 0 20Z" fill="#cb1515"/><path d="M4.3 7.2 5.2 9.5 7.6 9.5 5.7 11 6.4 13.3 4.3 11.9 2.2 13.3 2.9 11 1 9.5 3.4 9.5Z" fill="#fff"/></svg>`;
  const banderaEN = `<svg viewBox="0 0 30 20" width="21" height="14" style="border-radius:3px;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.4)"><rect width="30" height="20" fill="#fff"/><rect width="30" height="1.54" y="0.00" fill="#b22234"/><rect width="30" height="1.54" y="3.08" fill="#b22234"/><rect width="30" height="1.54" y="6.15" fill="#b22234"/><rect width="30" height="1.54" y="9.23" fill="#b22234"/><rect width="30" height="1.54" y="12.31" fill="#b22234"/><rect width="30" height="1.54" y="15.38" fill="#b22234"/><rect width="30" height="1.54" y="18.46" fill="#b22234"/><rect width="13" height="10.77" fill="#3c3b6e"/></svg>`;
  const flag = idiomaActual() === 'es' ? banderaES : banderaEN;
  const menu = `
    <button class="pp-item" data-pp="idioma">${flag}<span>${L('Language', 'Idioma')} · ${idiomaActual().toUpperCase()}</span></button>
    ${(window.__pwaPrompt || window.matchMedia('(display-mode: browser)').matches) ? `<button class="pp-item pp-install" data-install><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"/></svg><span>${L('Install app', 'Instalar app')}</span></button>` : ''}
    ${_esAdmin ? item('panel', I.panel, L('Admin panel', 'Panel administrativo'), '', 'pp-admin') : ''}
    ${item('salir', I.salir, L('Log out', 'Cerrar sesión'), '', 'pp-out')}`;

  const notiEj = `
    <div class="pp-r-item"><span class="pp-r-ic azul">${I.bell}</span><div><b>${L('New analysis available', 'Nuevo análisis disponible')}</b><span>NBA · Lakers vs Warriors</span></div><em>10m</em></div>
    <div class="pp-r-item"><span class="pp-r-ic">${I.panel}</span><div><b>${L('Stats updated', 'Actualización de estadísticas')}</b><span>LaLiga · ${L('Matchday', 'Jornada')} 38</span></div><em>1h</em></div>`;
  const buzonEj = esPrem ? `
    <div class="pp-r-item"><span class="pp-r-ic verde">${I.arrow}</span><div><b>${L('Trend signal', 'Señal de tendencia')}</b><span>NFL · ${L('Today', 'Hoy')} 2:30 PM</span></div><em>09:15</em></div>
    <div class="pp-r-item"><span class="pp-r-ic azul">${I.arrow}</span><div><b>${L('High probability', 'Alta probabilidad')}</b><span>NBA · ${L('Today', 'Hoy')} 7:00 PM</span></div><em>08:45</em></div>`
    : `<div class="pp-lock">${I.inbox}<p>${L('Signal inbox is a Premium feature.', 'El buzón de señales es una función Premium.')}</p><button class="pp-up" data-pp="planes">${L('See Premium', 'Ver Premium')}</button></div>`;

  const ov = document.createElement('div');
  ov.className = 'pp-ov'; ov.id = 'pp-ov';
  ov.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true">
      <button class="pp-x" id="pp-x" aria-label="close">✕</button>
      <div class="pp-grid">
        <aside class="pp-side">
          <div class="pp-logo"><img src="assets/imagenes/logo-nombre-oscuro.png" alt="Sports Expectations"></div>
          <div class="pp-avwrap">
            <div class="pp-av">${u.foto ? `<img src="${u.foto}" alt="">` : ini}</div>
            <button class="pp-cam" data-pp="foto" title="${L('Change photo', 'Cambiar foto')}">${I.cam}</button>
          </div>
          <div class="pp-nombre">${esc(nombre)}</div>
          <span class="pp-plan pp-plan-${nivel}">${badge}</span>

          <nav class="pp-menu">${menu}</nav>
          <button class="pp-trofeo" data-pp="trofeo">
            <span class="pp-tr-ic pp-tr-img"><img src="assets/imagenes/trofeo.webp" alt="trofeo"></span>
            <div class="pp-tr-txt"><b>${L('Upgrade plan', 'Mejora tu plan')}</b></div>
            <span class="pp-tr-arrow">${I.arrow}</span>
          </button>
        </aside>

        <main class="pp-main">
          <h2 class="pp-h2">${L('Profile settings', 'Ajustes de perfil')}</h2>
          <div class="pp-field"><label>${I.user}${L('Name', 'Nombre')}</label><input id="pp-f-nombre" type="text" value="${esc(nombre)}" maxlength="40"></div>
          <div class="pp-field"><label>${I.user}${L('Username', 'Nombre de usuario')}</label><input id="pp-f-usuario" type="text" value="${esc(usuario)}" maxlength="24"></div>
          <div class="pp-field"><label>${I.inbox}${L('Email', 'Correo electrónico')}</label><input id="pp-f-email" type="email" value="${esc(email)}" readonly><small>${L('Your email cannot be changed, for account security.', 'El correo no se puede cambiar, por seguridad de la cuenta.')}</small></div>
          <div class="pp-field"><label>${I.shield}${L('New password', 'Nueva contraseña')}</label><div class="pp-pass"><input id="pp-f-pass" type="password" placeholder="••••••••" autocomplete="new-password"><button class="pp-eye">${I.eye}</button></div><small>${L('Leave blank to keep your current password.', 'Deja en blanco si no deseas cambiar la contraseña.')}</small></div>
          <div class="pp-actions">
            <button class="pp-danger" data-pp="del-cuenta">${L('Delete account', 'Eliminar cuenta')}</button>
            <div class="pp-actions-right"><button class="pp-cancel" id="pp-cancel">${L('Cancel', 'Cancelar')}</button><button class="pp-apply">${L('Apply changes', 'Aplicar cambios')} ${I.arrow}</button></div>
          </div>
        </main>

        <aside class="pp-right">
          <div class="pp-card">
            <div class="pp-card-h">${I.bell}<b>${L('Notifications', 'Notificaciones')}</b><em class="pp-badge rojo" id="pp-noti-badge" hidden>0</em></div>
            ${esPrem ? `<div class="pp-push"><div><b>${L('Push notifications', 'Notificaciones push')}</b><span>${L('Alerts for new signals', 'Avisos de nuevas señales')}</span></div><label class="pp-switch"><input type="checkbox" id="pp-push-chk"><span></span></label></div>` : ''}
            <div id="pp-notis-list"><div class="pp-empty-sm">${L('Loading…', 'Cargando…')}</div></div>
          </div>
          <div class="pp-card">
            <div class="pp-card-h">${I.inbox}<b>${L('Signals inbox', 'Buzón de señales')}</b></div>
            <div id="pp-buzon-list">${esPrem ? `<div class="pp-empty-sm">${L('Loading…', 'Cargando…')}</div>` : `<div class="pp-lock">${I.inbox}<p>${L('Signal inbox is a Premium feature.', 'El buzón de señales es una función Premium.')}</p><button class="pp-up" data-pp="planes">${L('See Premium', 'Ver Premium')}</button></div>`}</div>
          </div>
        </aside>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  _cargarBuzonPerfil(ov, esPrem);
  // Foto: si el usuario no tiene foto propia pero sí ficha de analista/admin, mostrarla
  if (!u.foto) { (async () => {
    try {
      const { leerFichaAnalista } = await import('./mesa/mesa-datos.js');
      const { rutaFotoAnalista } = await import('./datos/fotos-analistas.js');
      const f = await leerFichaAnalista();
      if (f && f.foto) { const av = ov.querySelector('.pp-av'); if (av) av.innerHTML = `<img src="${rutaFotoAnalista(f.foto)}" alt="">`; }
    } catch (_) {}
  })(); }
  // Toggle de notificaciones push (solo Premium)
  const pchk = ov.querySelector('#pp-push-chk');
  if (pchk) {
    try { pchk.checked = localStorage.getItem('pp-push') === '1' && (window.Notification && Notification.permission === 'granted'); } catch (_) {}
    pchk.addEventListener('change', async () => {
      if (pchk.checked) {
        if (!('Notification' in window)) { pchk.checked = false; avisoToast(ES ? 'Tu navegador no soporta notificaciones.' : 'Notifications not supported.'); return; }
        let perm = Notification.permission;
        if (perm !== 'granted') { try { perm = await Notification.requestPermission(); } catch (_) {} }
        if (perm === 'granted') { try { localStorage.setItem('pp-push', '1'); } catch (_) {} avisoToast(ES ? 'Notificaciones push activadas \u2713' : 'Push notifications on \u2713'); }
        else { pchk.checked = false; avisoToast(ES ? 'Permiso denegado. Actívalo en el navegador.' : 'Permission denied.'); }
      } else { try { localStorage.setItem('pp-push', '0'); } catch (_) {} }
    });
  }

  const cerrar = () => { ov.remove(); document.body.style.overflow = ''; setTimeout(_actualizarPuntoSenal, 300); };
  ov.querySelector('#pp-x').onclick = cerrar;
  ov.querySelector('#pp-cancel').onclick = cerrar;
  ov.onclick = (e) => { if (e.target === ov) cerrar(); };
  ov.querySelector('.pp-eye').onclick = (e) => { const i = e.currentTarget.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; };

  const apply = ov.querySelector('.pp-apply');
  if (apply) apply.onclick = async () => {
    const nombreN = (ov.querySelector('#pp-f-nombre') || {}).value || '';
    const usuarioN = (ov.querySelector('#pp-f-usuario') || {}).value || '';
    const emailN = ((ov.querySelector('#pp-f-email') || {}).value || '').trim();
    const passN = ((ov.querySelector('#pp-f-pass') || {}).value || '').trim();
    if (!nombreN.trim()) { avisoToast(ES ? 'El nombre no puede estar vacío.' : 'Name cannot be empty.'); return; }
    apply.disabled = true;
    try {
      const auth = await import('./auth/auth.js');
      const patch = { nombre: nombreN.trim(), usuario: usuarioN.trim() };
      if (emailN && emailN !== (u.email || '')) patch.email = emailN;
      if (passN) patch.password = passN;
      await auth.actualizarPerfil(patch);
      if (_sesion) { _sesion.nombre = patch.nombre; _sesion.usuario = patch.usuario; if (patch.email) _sesion.email = emailN; }
      const nm = ov.querySelector('.pp-nombre'); if (nm) nm.textContent = patch.nombre;
      const passI = ov.querySelector('#pp-f-pass'); if (passI) passI.value = '';
      avisoToast(ES ? 'Cambios guardados \u2713' : 'Changes saved \u2713');
    } catch (e) {
      let msg = ES ? 'Error al guardar.' : 'Error saving.';
      try { const { mensajeError } = await import('./auth/auth.js'); msg = mensajeError(e, ES ? 'es' : 'en'); } catch (_) {}
      avisoToast(msg);
    }
    apply.disabled = false;
  };

  ov.querySelectorAll('[data-pp]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.pp;
    if (k === 'idioma') { fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en'); cerrar(); setTimeout(abrirPanelPerfil, 60); }
    else if (k === 'salir') { try { localStorage.removeItem('se-en-app'); localStorage.removeItem('se-vista'); } catch (_) {} cerrar(); limpiarVistaPrevia(); salir(); }
    else if (k === 'panel') { cerrar(); abrirPanelMesa(); }
    else if (k === 'planes') { cerrar(); mostrarPantalla('pricing'); }
    else if (k === 'trofeo') { _abrirPlanesModal(); }
    else if (k === 'foto') { if (esPrem) _modalOpcionesFoto(ov); else _modalPremiumFoto(); }
    else if (k === 'foto-del') { _eliminarFotoPerfil(ov); }
    else if (k === 'del-cuenta') { _confirmarEliminarCuenta(); }
    else if (['ajustes', 'notis', 'buzon'].includes(k)) {
      ov.querySelectorAll('.pp-menu .pp-item').forEach(x => x.classList.toggle('on', x.dataset.pp === k));
      // Fases 3-4: aquí irá el contenido real de cada sección.
    }
  }));
}

function onCuentaClick(e) {
  if (e) { e.stopPropagation(); }
  if (!_sesion) {
    if (!estaConfigurado()) { avisoFirebase(); return; }
    abrirAuth();
  } else {
    abrirPanelPerfil();
  }
}

async function _actualizarPuntoSenal() {
  const cb = document.getElementById('cuenta-btn');
  if (!cb || !_sesion) return;
  const esPrem = _esAdmin || planActual() === 'premium';
  const quitar = () => { const d = cb.querySelector('.cuenta-dot'); if (d) d.remove(); };
  if (!esPrem) { quitar(); return; }
  let signals = [];
  try { const { senalesSeguidas } = await import('./ui/senales.js'); signals = await senalesSeguidas(); } catch (_) {}
  let vistos = []; try { vistos = JSON.parse(localStorage.getItem('pp-vistos') || '[]'); } catch (_) {}
  const nuevos = signals.filter(a => !vistos.includes(a.matchId || a.id)).length;
  if (nuevos > 0) {
    let d = cb.querySelector('.cuenta-dot');
    if (!d) { d = document.createElement('span'); d.className = 'cuenta-dot'; cb.appendChild(d); }
    d.textContent = nuevos > 9 ? '9+' : String(nuevos);
  } else { quitar(); }
}
function avisoToast(msg) {
  let t = document.getElementById('pp-toast');
  if (!t) { t = document.createElement('div'); t.id = 'pp-toast'; t.className = 'pp-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function avisoFirebase() { abrirAuth(); }

function toggleCuentaMenu() {
  const existe = $('cuenta-menu');
  if (existe) { existe.remove(); document.removeEventListener('click', cerrarSiFuera); return; }
  const menu = document.createElement('div');
  menu.id = 'cuenta-menu';
  menu.className = 'cuenta-menu abierto';
  const botonPanel = (_esAdmin || _esAnalista)
    ? `<button id="cm-panel">${IC.grafico || ''} ${_esAnalista && !_esAdmin ? (idiomaActual() === 'es' ? 'Panel de analista' : 'Analyst panel') : (idiomaActual() === 'es' ? 'Panel administrativo' : 'Admin panel')}</button>` : '';
  const ES = idiomaActual() === 'es';
  const icAjustes = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/></svg>`;
  const icIdioma = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>`;
  menu.innerHTML = `
    <div class="quien"><b>${esc(_sesion.nombre || '')}</b><span>${esc(_sesion.email || '')}</span></div>
    ${botonPanel}
    <button id="cm-perfil">${icAjustes} ${ES ? 'Ajustes de perfil' : 'Profile settings'}</button>
    <button id="cm-idioma">${icIdioma} ${ES ? 'Idioma' : 'Language'} · ${idiomaActual().toUpperCase()}</button>
    <button id="cm-salir">${IC.salir || ''} ${t('auth.salir')}</button>`;
  document.body.appendChild(menu);
  menu.querySelector('#cm-panel')?.addEventListener('click', async () => {
    cerrarCuentaMenu();
    if (_esAnalista && !_esAdmin) {
      try {
        const { leerFichaAnalista } = await import('./mesa/mesa-datos.js');
        const ficha = await leerFichaAnalista();
        if (!ficha || !ficha.configurado) { abrirConfigAnalista(); return; }
      } catch (_) {}
    }
    abrirPanelMesa();
  });
  menu.querySelector('#cm-perfil')?.addEventListener('click', () => { cerrarCuentaMenu(); abrirAjustesPerfil(); });
  menu.querySelector('#cm-idioma')?.addEventListener('click', () => { fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en'); cerrarCuentaMenu(); });
  menu.querySelector('#cm-salir').addEventListener('click', async () => { try { localStorage.removeItem('se-en-app'); localStorage.removeItem('se-vista'); } catch (_) {} limpiarVistaPrevia(); await salir(); cerrarCuentaMenu(); });
  setTimeout(() => document.addEventListener('click', cerrarSiFuera), 0);
}
function cerrarCuentaMenu() { $('cuenta-menu')?.remove(); document.removeEventListener('click', cerrarSiFuera); }
function cerrarSiFuera(e) {
  if (!e.target.closest('#cuenta-menu') && !e.target.closest('#cuenta-btn')) cerrarCuentaMenu();
}
function esc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* -------- Modal: Ajustes de perfil -------- */
function _errPerfil(e, ES) {
  const L = (en, es) => ES ? es : en;
  const c = (e && e.code) || '';
  if (c === 'reauth-needed' || c === 'auth/requires-recent-login') return L('Enter your current password to change email or password.', 'Escribe tu contraseña actual para cambiar el correo o la contraseña.');
  if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') return L('Current password is incorrect.', 'La contraseña actual es incorrecta.');
  if (c === 'auth/email-already-in-use') return L('That email is already in use.', 'Ese correo ya está en uso.');
  if (c === 'auth/invalid-email') return L('The email is not valid.', 'El correo no es válido.');
  if (c === 'auth/weak-password') return L('The password is too weak.', 'La contraseña es muy débil.');
  if (c === 'google-no-pass') return L('Your Google account manages email and password.', 'Tu cuenta de Google gestiona el correo y la contraseña.');
  return L('Could not save changes. Try again.', 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
}
function abrirAjustesPerfil() {
  const ES = idiomaActual() === 'es';
  const L = (en, es) => ES ? es : en;
  const esGoogle = esCuentaGoogle();
  const s = _sesion || {};
  document.getElementById('ap-bg')?.remove();
  const bg = document.createElement('div'); bg.id = 'ap-bg'; bg.className = 'ap-bg abierto';
  const esc2 = (e) => { if (e.key === 'Escape') cerrar(); };
  const cerrar = () => { bg.remove(); document.removeEventListener('keydown', esc2); };
  bg.innerHTML = `<div class="ap-card" role="dialog" aria-modal="true">
    <button class="ap-x" aria-label="close">✕</button>
    <h3 class="ap-title">${L('Profile settings', 'Ajustes de perfil')}</h3>
    <div class="ap-body">
      <label class="ap-lbl">${L('Name', 'Nombre')}</label>
      <input class="ap-in" id="ap-nombre" type="text" value="${esc(s.nombre || '')}" autocomplete="name">
      <label class="ap-lbl">${L('Username', 'Nombre de usuario')}</label>
      <input class="ap-in" id="ap-usuario" type="text" value="${esc(s.usuario || '')}" placeholder="@usuario">
      <label class="ap-lbl">${L('Email', 'Correo')}</label>
      <input class="ap-in" id="ap-email" type="email" value="${esc(s.email || '')}" ${esGoogle ? 'disabled' : ''} autocomplete="email">
      <label class="ap-lbl">${L('New password', 'Nueva contraseña')}</label>
      <input class="ap-in" id="ap-pass" type="password" placeholder="${L('Leave blank to keep it', 'Déjalo vacío para no cambiarla')}" ${esGoogle ? 'disabled' : ''} autocomplete="new-password">
      <div class="ap-reauth" id="ap-reauth" hidden>
        <label class="ap-lbl">${L('Current password', 'Contraseña actual')}</label>
        <input class="ap-in" id="ap-passact" type="password" placeholder="${L('Needed to change email or password', 'Necesaria para cambiar correo o contraseña')}" autocomplete="current-password">
      </div>
      ${esGoogle ? `<div class="ap-note">${L('Your account uses Google. Email and password are managed by Google.', 'Tu cuenta usa Google. El correo y la contraseña se gestionan en Google.')}</div>` : ''}
      <div class="ap-msg" id="ap-msg"></div>
    </div>
    <div class="ap-foot"><button class="ap-cancel">${L('Cancel', 'Cancelar')}</button><button class="ap-apply">${L('Apply', 'Aplicar')}</button></div>
  </div>`;
  document.body.appendChild(bg);
  document.addEventListener('keydown', esc2);
  bg.querySelector('.ap-x').onclick = cerrar; bg.querySelector('.ap-cancel').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  const emailIn = bg.querySelector('#ap-email'), passIn = bg.querySelector('#ap-pass'), reauth = bg.querySelector('#ap-reauth');
  const chkReauth = () => { const need = !esGoogle && ((emailIn.value.trim() && emailIn.value.trim() !== (s.email || '')) || passIn.value); reauth.hidden = !need; };
  emailIn.addEventListener('input', chkReauth); passIn.addEventListener('input', chkReauth);
  bg.querySelector('.ap-apply').onclick = async () => {
    const msg = bg.querySelector('#ap-msg'); msg.className = 'ap-msg';
    const nombre = bg.querySelector('#ap-nombre').value.trim();
    const usuario = bg.querySelector('#ap-usuario').value.trim().replace(/^@+/, '');
    const email = esGoogle ? '' : emailIn.value.trim();
    const password = esGoogle ? '' : passIn.value;
    const passwordActual = bg.querySelector('#ap-passact')?.value || '';
    if (!nombre) { msg.classList.add('err'); msg.textContent = L('Name cannot be empty.', 'El nombre no puede estar vacío.'); return; }
    if (password && password.length < 6) { msg.classList.add('err'); msg.textContent = L('Password must be at least 6 characters.', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    const apply = bg.querySelector('.ap-apply'); apply.disabled = true; const orig = apply.textContent; apply.textContent = '…';
    try {
      await actualizarPerfil({ nombre, usuario, email, password, passwordActual });
      pintarCuenta(_sesion);
      msg.classList.add('ok'); msg.textContent = L('Changes saved.', 'Cambios guardados.');
      setTimeout(cerrar, 900);
    } catch (e) {
      apply.disabled = false; apply.textContent = orig;
      if ((e && e.code) === 'reauth-needed') reauth.hidden = false;
      msg.classList.add('err'); msg.textContent = _errPerfil(e, ES);
    }
  };
}

/* Bisel adaptativo para la foto del jugador destacado:
   detecta (con una imagen-sonda CORS) si la foto tiene fondo. Si tiene fondo → bisel;
   si es recorte transparente o no se puede leer → sin bisel. Nunca rompe la imagen mostrada. */
window.__bevelFoto = function (img) {
  try {
    if (!img || img.classList.contains('is-figura') || img.dataset.bevelChecked === img.src) return;
    img.dataset.bevelChecked = img.src;
    img.classList.remove('con-fondo', 'sin-fondo');
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = function () {
      try {
        const w = Math.min(probe.naturalWidth, 48), h = Math.min(probe.naturalHeight, 48);
        if (!w || !h) return;
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d'); ctx.drawImage(probe, 0, 0, w, h);
        let data;
        try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { return; } // tainted → sin bisel
        let transp = 0, tot = 0;
        const chk = (x, y) => { const i = (y * w + x) * 4; tot++; if (data[i + 3] < 25) transp++; };
        for (let x = 0; x < w; x++) { chk(x, 0); chk(x, h - 1); }
        for (let y = 0; y < h; y++) { chk(0, y); chk(w - 1, y); }
        img.classList.add((transp / tot) > 0.22 ? 'sin-fondo' : 'con-fondo');
      } catch (e) {}
    };
    probe.onerror = function () {}; // no CORS → no se puede leer → sin bisel (seguro)
    probe.src = img.src;
  } catch (e) {}
};

document.addEventListener('DOMContentLoaded', init);
