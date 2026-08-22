/* ============================================================
   VISTAS — construye el HTML de la lista de partidos y del detalle.
   No sabe de dónde vienen los datos (los recibe ya listos).
   ============================================================ */

import { IC } from './iconos.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ---- Tarjeta de un partido (lista central) ---- */
export function tarjetaPartido(p) {
  const vivo = p.estado === 'vivo';
  const marcador = p.marcador
    ? `<span class="marc">${p.marcador.local}</span>` : '';
  const marcadorV = p.marcador
    ? `<span class="marc">${p.marcador.visita}</span>` : '';

  const m = p.mercado || {};
  const tieneEmpate = m.empate != null;
  const barra = `
    <div class="prob">
      <div class="barras">
        <i class="b-local" style="width:${m.local||0}%"></i>
        ${tieneEmpate ? `<i class="b-empate" style="width:${m.empate}%"></i>` : ''}
        <i class="b-visita" style="width:${m.visita||0}%"></i>
      </div>
      <div class="leyenda">
        <span><b>${m.local||0}%</b> ${esc(p.local.abrev)}</span>
        ${tieneEmpate ? `<span><b>${m.empate}%</b> X</span>` : ''}
        <span>${esc(p.visita.abrev)} <b>${m.visita||0}%</b></span>
      </div>
    </div>`;

  const chip = p.analista
    ? `<div class="tiene-analisis">${IC.estrella} Análisis del experto disponible</div>` : '';

  return `
  <div class="pmatch" data-id="${esc(p.id)}">
    <div class="cab">
      <span class="liga-tag">${esc(p.liga)}</span>
      <span class="hora ${vivo?'vivo':''}">${esc(p.inicio)}</span>
    </div>
    <div class="equipos">
      <div class="eq">
        <span class="escudo">${esc(p.local.abrev)}</span>
        <span class="nom">${esc(p.local.nombre)}</span>
        <span class="rec">${esc(p.local.record||'')}</span>
        ${marcador}
      </div>
      <div class="eq">
        <span class="escudo">${esc(p.visita.abrev)}</span>
        <span class="nom">${esc(p.visita.nombre)}</span>
        <span class="rec">${esc(p.visita.record||'')}</span>
        ${marcadorV}
      </div>
    </div>
    ${barra}
    ${chip}
  </div>`;
}

/* ---- Detalle de un partido (panel derecho / hoja móvil) ---- */
export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>Elige un partido para ver su análisis completo.</div>`;

  const filas = (p.datos || []).map(d => `
    <div class="drow">
      <span class="l">${esc(d.local)}</span>
      <span class="k">${esc(d.etiqueta)}</span>
      <span class="r">${esc(d.visita)}</span>
    </div>`).join('');

  const a = p.analista;
  let bloqueAnalista = '';
  if (a) {
    const bloqueado = !!opciones.bloquear;   // si el usuario no ha pagado
    bloqueAnalista = `
      <div class="analista ${bloqueado?'bloqueado':''}">
        <div class="cab">
          <span class="tt">${IC.estrella} Veredicto del Analista</span>
          <span class="autor">${esc(a.autor||'')}</span>
        </div>
        <div class="veredicto">
          <span class="fav">${esc(a.veredicto)}</span>
          <span class="pct">${a.probabilidad}%</span>
        </div>
        <div class="medidor"><i style="width:${a.probabilidad}%"></i></div>
        <div class="texto">${esc(a.texto)}</div>
        ${bloqueado ? `<div class="candado">${IC.candado} Suscríbete para leer el análisis completo</div>` : ''}
      </div>`;
  }

  return `
    <div class="det-cab"><span class="det-liga">${esc(p.liga)}</span><span class="det-liga">${esc(p.inicio)}</span></div>
    <div class="det-vs">
      <div class="col">
        <div class="escudo">${esc(p.local.abrev)}</div>
        <div class="nom">${esc(p.local.nombre)}</div>
        <div class="rec">${esc(p.local.record||'')}</div>
      </div>
      <div class="mid">VS</div>
      <div class="col">
        <div class="escudo">${esc(p.visita.abrev)}</div>
        <div class="nom">${esc(p.visita.nombre)}</div>
        <div class="rec">${esc(p.visita.record||'')}</div>
      </div>
    </div>
    <div class="datos-t">Comparativa de datos</div>
    ${filas || '<div class="vacio" style="padding:20px">Sin datos detallados.</div>'}
    ${bloqueAnalista}
  `;
}
