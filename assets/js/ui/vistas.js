/* ============================================================
   VISTAS — HTML de la lista de partidos y del detalle.
   Renderiza los logos reales con respaldo (abreviatura) si falla la carga.
   ============================================================ */
import { IC } from './iconos.js';
import { t } from './idioma.js';

/* Icono (cuño) de cada liga para la esquina de la tarjeta */
const LIGA_ICONO = {
  mlb: 'dep-mlb', nba: 'dep-nba', nfl: 'dep-nfl', nhl: 'dep-nhl',
  epl: 'dep-premier', laliga: 'dep-laliga', ucl: 'dep-champions',
  seriea: 'dep-seriea', bundes: 'dep-bundesliga',
};
function ligaCuno(p) {
  const k = LIGA_ICONO[p.ligaId];
  if (k) return `<img class="liga-cuno" src="assets/imagenes/${k}.png" alt="${esc(p.liga)}"
    onerror="this.replaceWith(document.createTextNode('${esc(p.liga)}'))">`;
  return `<span class="liga-tag">${esc(p.liga)}</span>`;
}

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
  const localGana = (m.local || 0) >= (m.visita || 0);

  const ladoEq = (eq, pct, clase, gana) => `
    <div class="lado-eq">
      ${escudo(eq)}
      <div class="nom">${esc(eq.nombre)}</div>
      <div class="rec">${esc(eq.record || '')}</div>
      <div class="pct ${clase} ${gana ? 'gana' : ''}">${pct || 0}%</div>
    </div>`;

  const chip = p.analista ? `<div class="tiene-analisis">${IC.estrella} ${t('match.analisis')}</div>` : '';

  return `
  <div class="pmatch" data-id="${esc(p.id)}">
    <div class="cab">
      ${ligaCuno(p)}
      <span class="hora ${vivo?'vivo':''}">${esc(p.inicio)}</span>
    </div>
    <div class="duelo">
      ${ladoEq(p.local, m.local, 'oro', localGana)}
      <div class="vs-col">
        <img class="vs-mini" src="assets/imagenes/vs.png" alt="VS" onerror="this.replaceWith(document.createTextNode('VS'))">
        ${m.empate != null ? `<div class="empate">${t('prob.empate')} ${m.empate}%</div>` : ''}
      </div>
      ${ladoEq(p.visita, m.visita, 'azul', !localGana)}
    </div>
    <div class="barra">
      <i class="s-local" style="width:${m.local||0}%"></i>
      ${m.empate != null ? `<i class="s-empate" style="width:${m.empate}%"></i>` : ''}
      <i class="s-visita" style="width:${m.visita||0}%"></i>
    </div>
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

  const cab = `
    <div class="datos-head">
      <span class="h-l">${esc(p.local.abrev)}</span>
      <span class="h-k">${t('det.comparativa')}</span>
      <span class="h-r">${esc(p.visita.abrev)}</span>
    </div>`;

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
    ${cab}
    ${filas || `<div class="vacio" style="padding:20px">${t('det.sindatos')}</div>`}
    ${bloqueAnalista}
  `;
}
