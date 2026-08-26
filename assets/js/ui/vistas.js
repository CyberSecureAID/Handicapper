/* ============================================================
   VISTAS — HTML de la lista de partidos y del detalle.
   Renderiza los logos reales con respaldo (abreviatura) si falla la carga.
   ============================================================ */
import { IC } from './iconos.js';
import { t, Lg, idiomaActual } from './idioma.js';

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
      <span class="hora ${vivo?'vivo':''}">${esc(Lg(p.inicio))}</span>
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
  const L = (x) => esc(Lg(x));

  // Cuenta atrás / hora local + sede
  let infoJuego = '';
  {
    const partes = [];
    if (p.cuando) {
      const d = new Date(p.cuando);
      if (!isNaN(d)) {
        const hora = d.toLocaleString(undefined, { weekday:'short', hour:'numeric', minute:'2-digit' });
        partes.push(`<div class="ij"><span class="ij-k">${t('det.horario')}</span><span class="ij-v">${esc(hora)}</span></div>`);
        if (p.estado === 'proximo') partes.push(`<div class="ij"><span class="ij-k">${t('det.faltan')}</span><span class="ij-v cuenta" data-cuando="${esc(p.cuando)}">—</span></div>`);
      }
    }
    if (p.sede) partes.push(`<div class="ij"><span class="ij-k">${t('det.sede')}</span><span class="ij-v">${L(p.sede)}</span></div>`);
    if (partes.length) infoJuego = `<div class="det-info">${partes.join('')}</div>`;
  }

  // Probabilidad (barra) + confianza + explicación
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null;
  const confMap = {
    'alta':     { en: 'High confidence', es: 'Confianza alta', c: 'alta' },
    'media':    { en: 'Medium confidence', es: 'Confianza media', c: 'media' },
    'baja':     { en: 'Low confidence', es: 'Confianza baja', c: 'baja' },
    'muy baja': { en: 'Very low confidence', es: 'Confianza muy baja', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const badge = cf ? `<span class="conf ${cf.c}">${idiomaActual()==='es'?cf.es:cf.en}</span>` : '';
  const factoresTxt = p.factores ? `<div class="det-factores">${esc(Lg(p.factores))}</div>` : '';
  const prob = `
    <div class="det-sec-t">${t('prob.titulo')} ${badge}</div>
    <div class="det-prob">
      <div class="dp-lado"><span class="dp-ab">${esc(p.local.abrev)}</span><span class="dp-num oro">${m.local||0}%</span></div>
      ${tieneEmpate ? `<div class="dp-mid"><span class="dp-num2">${m.empate}%</span><span class="dp-lb">${t('prob.empate')}</span></div>` : ''}
      <div class="dp-lado der"><span class="dp-ab">${esc(p.visita.abrev)}</span><span class="dp-num azul">${m.visita||0}%</span></div>
    </div>
    <div class="det-barra">
      <i class="s-local" style="width:${m.local||0}%"></i>
      ${tieneEmpate ? `<i class="s-empate" style="width:${m.empate}%"></i>` : ''}
      <i class="s-visita" style="width:${m.visita||0}%"></i>
    </div>
    ${factoresTxt}`;

  // Abridor anunciado (con mano LHP/RHP) + líderes reales del equipo
  function manoTxt(m) {
    if (m === 'L') return t('det.lhp');
    if (m === 'R') return t('det.rhp');
    return '';
  }
  function listaJugadores(lado, eq) {
    const arr = (p.jugadores && p.jugadores[lado]) || [];
    let html = '';
    if (eq && eq.abridor && eq.abridor.nombre) {
      const a = eq.abridor;
      const mano = a.mano ? `<span class="pj-mano ${a.mano === 'L' ? 'zurdo' : 'derecho'}">${manoTxt(a.mano)}</span>` : '';
      const stats = [a.wl ? a.wl : null, a.era ? 'ERA ' + a.era : null].filter(Boolean).join(' · ');
      html += `<div class="pj abridor">
        <span class="pj-rol">${t('det.abridor')}</span>
        <span class="pj-n">${esc(a.nombre)} ${mano}</span>
        ${stats ? `<span class="pj-d">${esc(stats)}</span>` : ''}
      </div>`;
    }
    html += arr.slice(0, 4).map(j => `<div class="pj"><span class="pj-n">${esc(j.nombre)} ${j.pos ? `<em>${esc(j.pos)}</em>` : ''}</span><span class="pj-d">${esc(j.dato)} <small>${esc(j.etiqueta)}</small></span></div>`).join('');
    return html;
  }
  const hayJug = (p.jugadores && (p.jugadores.local.length || p.jugadores.visita.length)) || p.local.abridor || p.visita.abridor;
  // Nota de tendencia si algún abridor es zurdo (dato real: los zurdos son minoría)
  const hayZurdo = (p.local.abridor && p.local.abridor.mano === 'L') || (p.visita.abridor && p.visita.abridor.mano === 'L');
  const notaZurdo = hayZurdo ? `<div class="det-nota">${t('det.notazurdo')}</div>` : '';
  const jugadores = hayJug ? `
    <div class="det-sec-t">${t('det.jugadores')}</div>
    <div class="det-jug">
      <div class="dj-col"><div class="dj-cab">${esc(p.local.abrev)}</div>${listaJugadores('local', p.local) || `<div class="pj vacia">${t('det.nodata')}</div>`}</div>
      <div class="dj-col"><div class="dj-cab">${esc(p.visita.abrev)}</div>${listaJugadores('visita', p.visita) || `<div class="pj vacia">${t('det.nodata')}</div>`}</div>
    </div>
    ${notaZurdo}` : '';

  // Lesionados
  function listaLes(lado) {
    const arr = (p.lesionados && p.lesionados[lado]) || [];
    if (!arr.length) return `<div class="pj vacia">${t('det.sinlesiones')}</div>`;
    return arr.slice(0,5).map(x => `<div class="pj les"><span class="pj-n">${esc(x.nombre)} ${x.pos?`<em>${esc(x.pos)}</em>`:''}</span><span class="pj-est">${esc(x.estado)}</span></div>`).join('');
  }
  const hayLes = p.lesionados && (p.lesionados.local.length || p.lesionados.visita.length);
  const lesionados = hayLes ? `
    <div class="det-sec-t">${t('det.lesionados')}</div>
    <div class="det-jug">
      <div class="dj-col"><div class="dj-cab">${esc(p.local.abrev)}</div>${listaLes('local')}</div>
      <div class="dj-col"><div class="dj-cab">${esc(p.visita.abrev)}</div>${listaLes('visita')}</div>
    </div>` : '';

  // Comparativa de datos (sin repetir el récord)
  const filas = (p.datos || []).map(d => `
    <div class="drow">
      <span class="l">${L(d.local)}</span>
      <span class="k">${L(d.etiqueta)}</span>
      <span class="r">${L(d.visita)}</span>
    </div>`).join('');
  const comparativa = filas ? `
    <div class="datos-head"><span class="h-l">${esc(p.local.abrev)}</span><span class="h-k">${t('det.comparativa')}</span><span class="h-r">${esc(p.visita.abrev)}</span></div>
    ${filas}` : '';

  // Analista
  const a = p.analista;
  let bloqueAnalista = '';
  if (a) {
    const bloqueado = !!opciones.bloquear;
    bloqueAnalista = `
      <div class="analista ${bloqueado?'bloqueado':''}">
        <div class="cab"><span class="tt">${IC.estrella} ${t('analista.titulo')}</span><span class="autor">${esc(Lg(a.autor)||'')}</span></div>
        <div class="veredicto"><span class="fav">${esc(Lg(a.veredicto))}</span><span class="pct">${a.probabilidad}%</span></div>
        <div class="medidor"><i style="width:${a.probabilidad}%"></i></div>
        <div class="texto">${esc(Lg(a.texto))}</div>
        ${bloqueado ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}
      </div>`;
  }

  const cuno = ligaCuno(p);
  return `
    <div class="det-cab">
      ${cuno}
      <button class="compartir" data-compartir="${esc(p.id)}">${IC.compartir} ${t('compartir')}</button>
    </div>
    <div class="det-vs">
      <div class="col">${escudo(p.local)}<div class="nom">${esc(p.local.nombre)}</div><div class="rec">${esc(p.local.record||'')}</div></div>
      <div class="mid"><img class="vs-img" src="assets/imagenes/vs.png" alt="VS" onerror="this.replaceWith(document.createTextNode('VS'))"></div>
      <div class="col">${escudo(p.visita)}<div class="nom">${esc(p.visita.nombre)}</div><div class="rec">${esc(p.visita.record||'')}</div></div>
    </div>
    ${infoJuego}
    ${prob}
    ${jugadores}
    ${lesionados}
    ${comparativa}
    ${bloqueAnalista}
  `;
}
