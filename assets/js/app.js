/* ============================================================
   APP — arranca todo y conecta los módulos.
   Datos (proveedor) -> Vistas (HTML) -> eventos de navegación.
   ============================================================ */
import { LIGAS, listarPartidos, detallePartido } from './datos/proveedor.js';
import { tarjetaPartido, detalle } from './ui/vistas.js';
import { IC } from './ui/iconos.js';
import { initTema } from './ui/tema.js';

const $ = (id) => document.getElementById(id);

let ligaActiva = null;          // null = todas
let partidoSel = null;

/* -------- Sidebar de ligas (web) -------- */
function pintarLigas() {
  const cont = $('lista-ligas');
  if (!cont) return;
  const items = [{ id: null, nombre: 'Todos los deportes', icono: 'diana' }, ...LIGAS];
  cont.innerHTML = items.map(l => `
    <button class="liga ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">
      <span class="ic">${IC[l.icono] || ''}</span>${l.nombre}
    </button>`).join('');
  cont.querySelectorAll('.liga').forEach(b => b.onclick = () => {
    ligaActiva = b.dataset.liga || null;
    pintarLigas(); pintarPestanas(); cargarLista();
  });
}

/* -------- Pestañas de ligas (móvil) -------- */
function pintarPestanas() {
  const cont = $('pestanas');
  if (!cont) return;
  const items = [{ id: null, nombre: 'Todos' }, ...LIGAS.map(l => ({ id: l.id, nombre: l.nombre }))];
  cont.innerHTML = items.map(l => `
    <button class="pestana ${ (l.id===ligaActiva) ? 'on':'' }" data-liga="${l.id ?? ''}">${l.nombre}</button>`).join('');
  cont.querySelectorAll('.pestana').forEach(b => b.onclick = () => {
    ligaActiva = b.dataset.liga || null;
    pintarLigas(); pintarPestanas(); cargarLista();
  });
}

/* -------- Lista central de partidos -------- */
async function cargarLista() {
  const cont = $('lista');
  if (!cont) return;
  cont.innerHTML = `<div class="seccion-t">Cargando partidos…</div>`;
  const partidos = await listarPartidos(ligaActiva);
  if (!partidos.length) {
    cont.innerHTML = `<div class="vacio" style="padding:50px;text-align:center;color:var(--tinta-3)">No hay partidos para esta selección ahora mismo.</div>`;
    return;
  }
  cont.innerHTML = `<div class="seccion-t">Partidos${ligaActiva?'':' destacados'}</div>` +
    partidos.map(tarjetaPartido).join('');
  cont.querySelectorAll('.pmatch').forEach(el => el.onclick = () => abrirDetalle(el.dataset.id, el));
}

/* -------- Abrir detalle (panel en web, hoja en móvil) -------- */
async function abrirDetalle(id, el) {
  partidoSel = id;
  document.querySelectorAll('.pmatch').forEach(x => x.classList.toggle('sel', x === el));
  const p = await detallePartido(id);
  // De momento el análisis se muestra desbloqueado (aún no hay pagos).
  const html = detalle(p, { bloquear: false });

  const panel = $('panel');        // web
  const hoja = $('hoja');          // móvil
  if (panel) panel.innerHTML = html;
  if (hoja) {
    hoja.querySelector('.hoja-cuerpo').innerHTML = html;
    hoja.classList.add('abierta');
  }
}

function cerrarHoja() {
  const hoja = $('hoja');
  if (hoja) hoja.classList.remove('abierta');
}

/* -------- Barra inferior móvil (navegación básica) -------- */
function initTabbar() {
  const bar = $('tabbar');
  if (!bar) return;
  const tabs = [
    { ic: 'diana',    txt: 'Partidos' },
    { ic: 'vivo',     txt: 'En vivo' },
    { ic: 'estrella', txt: 'Análisis' },
    { ic: 'perfil',   txt: 'Perfil' },
  ];
  bar.innerHTML = tabs.map((t, i) => `
    <button class="t ${i===0?'on':''}"><span class="ic">${IC[t.ic]}</span>${t.txt}</button>`).join('');
  bar.querySelectorAll('.t').forEach(b => b.onclick = () => {
    bar.querySelectorAll('.t').forEach(x => x.classList.toggle('on', x === b));
    // Por ahora todas las pestañas muestran los partidos; se ampliará por fases.
    cerrarHoja();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* -------- Arranque -------- */
function init() {
  initTema();
  pintarLigas();
  pintarPestanas();
  cargarLista();
  initTabbar();
  const cerrar = document.querySelector('#hoja .cerrar');
  if (cerrar) cerrar.onclick = cerrarHoja;
}

document.addEventListener('DOMContentLoaded', init);
