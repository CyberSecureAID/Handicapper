/* ============================================================
   VISTAS — HTML de la lista de partidos y del detalle.
   Renderiza los logos reales con respaldo (abreviatura) si falla la carga.
   ============================================================ */
import { IC } from './iconos.js';
import { t } from './idioma.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* Escudo con logo + respaldo: si la imagen no carga, muestra la abreviatura */
function escudo(eq) {
  const ab = esc(eq.abrev || '');
  if (eq.logo) {
    return `<span class="escudo">
      <img src="${esc(eq.logo)}" alt="${ab}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="fallback" style="display:none">${ab}</span>
    </span>`;
  }
  return `<span class="escudo"><span class="fallback" style="display:flex">${ab}</span></span>`;
}

/* ---- Tarjeta de un partido ---- */
export function tarjetaPartido(p) {
  const vivo = p.estado === 'vivo';
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null;
  const ganaLocal = (m.local || 0) >= (m.visita || 0);

  const barra = `
    <div class="vs-prob">
      <div class="titu">${t('prob.titulo')}</div>
      <div class="cifras">
        <div class="lado izq ${ganaLocal?'gana':''}">
          <span class="ab">${esc(p.local.abrev)}</span>
          <span class="num">${m.local||0}%</span>
        </div>
        ${tieneEmpate ? `<div class="empate-mid"><div class="e-num">${m.empate}%</div><div class="e-lb">${t('prob.empate')}</div></div>` : ''}
        <div class="lado der ${!ganaLocal?'gana':''}">
          <span class="ab">${esc(p.visita.abrev)}</span>
          <span class="num">${m.visita||0}%</span>
        </div>
      </div>
      <div class="barra">
        <i class="s-local" style="width:${m.local||0}%"></i>
        ${tieneEmpate ? `<i class="s-empate" style="width:${m.empate}%"></i>` : ''}
        <i class="s-visita" style="width:${m.visita||0}%"></i>
      </div>
    </div>`;

  const chip = p.analista ? `<div class="tiene-analisis">${IC.estrella} ${t('match.analisis')}</div>` : '';

  return `
  <div class="pmatch" data-id="${esc(p.id)}">
    <div class="cab">
      <span class="liga-tag">${esc(p.liga)}</span>
      <span class="hora ${vivo?'vivo':''}">${esc(p.inicio)}</span>
    </div>
    <div class="equipos">
      <div class="eq">${escudo(p.local)}
        <span class="nom">${esc(p.local.nombre)}</span>
        <span class="rec">${esc(p.local.record||'')}</span>
        ${p.marcador ? `<span class="marc">${p.marcador.local}</span>` : ''}
      </div>
      <div class="eq">${escudo(p.visita)}
        <span class="nom">${esc(p.visita.nombre)}</span>
        <span class="rec">${esc(p.visita.record||'')}</span>
        ${p.marcador ? `<span class="marc">${p.marcador.visita}</span>` : ''}
      </div>
    </div>
    ${barra}
    ${chip}
  </div>`;
}

/* ---- Detalle de un partido ---- */
export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;

  const filas = (p.datos || []).map(d => `
    <div class="drow">
      <span class="l">${esc(d.local)}</span>
      <span class="k">${esc(d.etiqueta)}</span>
      <span class="r">${esc(d.visita)}</span>
    </div>`).join('');

  const a = p.analista;
  let bloqueAnalista = '';
  if (a) {
    const bloqueado = !!opciones.bloquear;
    bloqueAnalista = `
      <div class="analista ${bloqueado?'bloqueado':''}">
        <div class="cab">
          <span class="tt">${IC.estrella} ${t('analista.titulo')}</span>
          <span class="autor">${esc(a.autor||'')}</span>
        </div>
        <div class="veredicto">
          <span class="fav">${esc(a.veredicto)}</span>
          <span class="pct">${a.probabilidad}%</span>
        </div>
        <div class="medidor"><i style="width:${a.probabilidad}%"></i></div>
        <div class="texto">${esc(a.texto)}</div>
        ${bloqueado ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}
      </div>`;
  }

  return `
    <div class="det-cab">
      <span class="det-liga">${esc(p.liga)}</span>
      <button class="compartir" data-compartir="${esc(p.id)}">${IC.compartir} ${t('compartir')}</button>
    </div>
    <div class="det-vs">
      <div class="col">${escudo(p.local)}<div class="nom">${esc(p.local.nombre)}</div><div class="rec">${esc(p.local.record||'')}</div></div>
      <div class="mid"><img class="vs-img" src="assets/imagenes/vs.png" alt="VS" onerror="this.replaceWith(document.createTextNode('VS'))"></div>
      <div class="col">${escudo(p.visita)}<div class="nom">${esc(p.visita.nombre)}</div><div class="rec">${esc(p.visita.record||'')}</div></div>
    </div>
    <div class="det-hora">${esc(p.inicio)}</div>
    <div class="datos-t">${t('det.comparativa')}</div>
    ${filas || `<div class="vacio" style="padding:20px">${t('det.sindatos')}</div>`}
    ${bloqueAnalista}
  `;
}
