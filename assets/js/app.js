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
  else       archivo = oscuro ? 'logo-nombre-oscuro.png' : 'logo-nombre-claro.png';
  img.onload = () => { img.classList.add('visible'); cont.classList.add('tiene-img'); };
  img.onerror = () => { img.classList.remove('visible'); cont.classList.remove('tiene-img'); };
  img.src = 'assets/imagenes/' + archivo;
}

/* -------- Sidebar de ligas -------- */
function pintarLigas() {
  const cont = $('lista-ligas');
  if (!cont) return;
  const items = [{ id: null, nombre: t('liga.todos'), icono: 'diana' }, ...LIGAS];
  cont.innerHTML = items.map(l => `
    <button class="liga ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">
      <span class="ic">${IC[l.icono] || ''}</span>${l.nombre}
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
async function cargarLista() {
  const cont = $('lista');
  if (!cont) return;
  cont.innerHTML = `<div class="seccion-t">${t('cargando')}</div>`;
  const partidos = await listarPartidos(ligaActiva);
  if (!partidos.length) {
    cont.innerHTML = `<div class="vacio" style="padding:50px;text-align:center">${t('vacio.lista')}</div>`;
    return;
  }
  const titulo = ligaActiva ? t('seccion.partidos') : t('seccion.destacados');
  cont.innerHTML = `<div class="seccion-t">${titulo}</div>` + partidos.map(tarjetaPartido).join('');
  cont.querySelectorAll('.pmatch').forEach(el => el.onclick = () => abrirDetalle(el.dataset.id, el));
}

/* -------- Detalle -------- */
async function abrirDetalle(id, el) {
  partidoSel = id;
  document.querySelectorAll('.pmatch').forEach(x => x.classList.toggle('sel', x === el));
  const p = await detallePartido(id);
  const html = detalle(p, { bloquear: false });
  const panel = $('panel'), hoja = $('hoja');
  if (panel) panel.innerHTML = html;
  if (hoja) { hoja.querySelector('.hoja-cuerpo').innerHTML = html; hoja.classList.add('abierta'); }
  // Conectar botón compartir (puede estar en panel o en hoja)
  document.querySelectorAll('[data-compartir]').forEach(b => b.onclick = async () => {
    const pp = await detallePartido(b.dataset.compartir);
    if (pp) compartirPartido(pp);
  });
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
  aplicarTextos(); pintarLigas(); pintarPestanas(); initTabbar(); cargarLista();
  const panel = $('panel');
  if (panel && !partidoSel) panel.innerHTML = `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
}

/* -------- Arranque -------- */
function init() {
  initTema();
  initIdioma();
  actualizarLogo();
  aplicarTextos();
  pintarLigas();
  pintarPestanas();
  cargarLista();
  initTabbar();
  initBotonIdioma();

  // Reaccionar a cambios de tema/tamaño para el logo
  const btnTema = $('tema-btn');
  if (btnTema) btnTema.addEventListener('click', () => setTimeout(actualizarLogo, 0));
  window.addEventListener('resize', actualizarLogo);
  document.addEventListener('idioma-cambio', repintarTodo);
}

document.addEventListener('DOMContentLoaded', init);
