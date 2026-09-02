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
    ligaActiva = b.dataset.liga || null; proyActiva = null; marcarProyeccion();
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
    ligaActiva = b.dataset.liga || null; proyActiva = null; marcarProyeccion(); pintarLigas(); pintarPestanas(); cargarLista();
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
    ligaActiva = b.dataset.liga || null; proyActiva = null; marcarProyeccion(); pintarLigas(); pintarPestanas(); cargarLista();
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
      modo: (_esAdmin || planActual() === 'premium') ? 'premium' : 'pro',
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
  if (v === 'analisis') {
    pintarSenales(cont, { esPremium: _esAdmin || planActual() === 'premium', nivel: _esAdmin ? 'premium' : planActual(), abrirPlanes: () => mostrarPantalla('pricing') });
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
      <h2>${Lp('Your analyst feed', 'Tu feed de analistas')}</h2>
      <p>${Lp('Upgrade to Premium to follow analysts and get their signals — with notifications — right here.', 'Pasa a Premium para seguir analistas y recibir sus señales — con notificaciones — aquí mismo.')}</p>
      <button class="pf-cta" id="pf-cta">${Lp('See Premium plan', 'Ver plan Premium')}</button>
    </div></div>`;
    cont.querySelector('#pf-cta')?.addEventListener('click', () => mostrarPantalla('pricing'));
    return;
  }

  let notif; try { notif = JSON.parse(localStorage.getItem('se_notif') || '{}'); } catch (_) { notif = {}; }
  notif = { push: notif.push !== false, nuevas: notif.nuevas !== false, resultados: !!notif.resultados };

  const sw = (k, txt, sub) => `<label class="pf-sw"><div><b>${txt}</b><em>${sub}</em></div><input type="checkbox" data-n="${k}" ${notif[k] ? 'checked' : ''}><span class="pf-sw-t"></span></label>`;

  cont.innerHTML = `<div class="pf">
    <div class="pf-head"><h2>${Lp('Your feed', 'Tu feed')}</h2><p>${Lp('Signals from the analysts you follow, all in one place.', 'Las señales de los analistas que sigues, todas en un lugar.')}</p></div>
    <div class="pf-card pf-notif">
      <div class="pf-card-h"><span class="pf-card-ic">${(IC && IC.campana) || '🔔'}</span><h3>${Lp('Notifications', 'Notificaciones')}</h3></div>
      ${sw('push', Lp('Push notifications', 'Notificaciones push'), Lp('Alerts on this device', 'Avisos en este dispositivo'))}
      ${sw('nuevas', Lp('New signals', 'Nuevas señales'), Lp('When a followed analyst posts', 'Cuando un analista que sigues publica'))}
      ${sw('resultados', Lp('Results & outcomes', 'Resultados'), Lp('How previous signals landed', 'Cómo salieron las señales anteriores'))}
    </div>
    <div class="pf-card">
      <div class="pf-card-h"><span class="pf-card-ic">${(IC && IC.estrella) || '★'}</span><h3>${Lp('Followed analysts', 'Analistas seguidos')}</h3></div>
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
  const lbl = pb.querySelector('span:not(.premium-btn-dot)');
  const nivel = plan === 'pro' ? 'pro' : (plan === 'premium' ? 'premium' : 'premium');
  pb.classList.remove('nivel-pro', 'nivel-premium');
  pb.classList.add('nivel-' + nivel);
  if (lbl) lbl.textContent = nivel === 'pro' ? 'Pro' : 'Premium';
  const head = document.querySelector('.premium-pop-h');
  if (head) head.textContent = nivel === 'pro' ? 'Pro projections' : 'Premium projections';
  document.querySelectorAll('.premium-pop .pi-pro').forEach(t => t.textContent = nivel === 'pro' ? 'PRO' : 'PREMIUM');
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
  const pPop = document.getElementById('premium-pop');
  if (pBtn && pPop) {
    pBtn.addEventListener('click', (e) => { e.stopPropagation(); const o = pPop.classList.toggle('open'); pBtn.classList.toggle('open', o); });
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
    salir: async () => { limpiarVistaPrevia(); await salir(); },
    alEntrarApp: () => entrarPlataforma(),
  });

  iniciarAuth(onSesion);
}

let _appArrancada = false;

/* Decide la pantalla según sesión + acceso */
let _esAdmin = false;
let _esAnalista = false;

async function onSesion(usuario, extra) {
  pintarCuenta(usuario);
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
  menu.querySelector('#cm-panel')?.addEventListener('click', () => { cerrarCuentaMenu(); abrirPanelMesa(); });
  menu.querySelector('#cm-perfil')?.addEventListener('click', () => { cerrarCuentaMenu(); abrirAjustesPerfil(); });
  menu.querySelector('#cm-idioma')?.addEventListener('click', () => { fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en'); cerrarCuentaMenu(); });
  menu.querySelector('#cm-salir').addEventListener('click', async () => { limpiarVistaPrevia(); await salir(); cerrarCuentaMenu(); });
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
