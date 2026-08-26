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
function escudoMini(eq) {
  if (eq && eq.logo) return `<img class="mini-logo" src="${esc(eq.logo)}" alt="" onerror="this.style.display='none'">`;
  return '';
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

  // ===== ABRIDORES anunciados (BLOQUE PROTAGONISTA) =====
  function manoTxt(mn) {
    if (mn === 'L') return t('det.lhp');
    if (mn === 'R') return t('det.rhp');
    return '';
  }
  function abridorCard(lado, eq) {
    const a = eq && eq.abridor;
    if (!a || !a.nombre) return `<div class="abr-card sin">
      <div class="abr-eq">${escudoMini(eq)}<span>${esc(eq.abrev)}</span></div>
      <div class="abr-nd">${t('det.sinabridor')}</div></div>`;
    const manoCls = a.mano === 'L' ? 'lhp' : (a.mano === 'R' ? 'rhp' : '');
    const mano = a.mano ? `<span class="abr-mano ${manoCls}">${manoTxt(a.mano)}</span>` : '';
    const stats = [];
    if (a.era) stats.push(`<span class="abr-st"><b>${esc(a.era)}</b><small>ERA</small></span>`);
    if (a.wl) stats.push(`<span class="abr-st"><b>${esc(a.wl)}</b><small>W-L</small></span>`);
    const ini = (a.nombre||'?').trim().charAt(0).toUpperCase();
    return `<div class="abr-card ${lado}">
      <div class="abr-eq">${escudoMini(eq)}<span>${esc(eq.abrev)}</span></div>
      <div class="abr-avatar">${ini}</div>
      <div class="abr-nom">${esc(a.nombre)}</div>
      ${mano}
      ${stats.length ? `<div class="abr-stats">${stats.join('')}</div>` : ''}
    </div>`;
  }
  const hayAbr = (p.local.abridor && p.local.abridor.nombre) || (p.visita.abridor && p.visita.abridor.nombre);
  const hayZurdo = (p.local.abridor && p.local.abridor.mano === 'L') || (p.visita.abridor && p.visita.abridor.mano === 'L');
  const notaZurdo = hayZurdo ? `<div class="det-nota">${IC.info || ''} ${t('det.notazurdo')}</div>` : '';
  const abridores = hayAbr ? `
    <div class="det-block">
      <div class="det-sec-t big">${t('det.abridores')}</div>
      <div class="duelo-abr">
        ${abridorCard('local', p.local)}
        <div class="abr-vs">VS</div>
        ${abridorCard('visita', p.visita)}
      </div>
      ${notaZurdo}
    </div>` : '';

  // ===== LÍDERES del equipo (top jugadores por categoría) =====
  function lideres(lado) {
    const arr = ((p.jugadores && p.jugadores[lado]) || []).slice(0, 4);
    if (!arr.length) return '';
    return arr.map(j => `<div class="lid-row">
      <span class="lid-n">${esc(j.nombre)} ${j.pos ? `<em>${esc(j.pos)}</em>` : ''}</span>
      <span class="lid-d"><b>${esc(j.dato)}</b> <small>${esc(j.etiqueta)}</small></span>
    </div>`).join('');
  }
  const hayLid = (p.jugadores && (p.jugadores.local.length || p.jugadores.visita.length));
  const bloqueLideres = hayLid ? `
    <div class="det-block">
      <div class="det-sec-t big">${t('det.lideres')}</div>
      <div class="det-duo">
        <div class="duo-col"><div class="duo-cab">${escudoMini(p.local)}${esc(p.local.abrev)}</div>${lideres('local') || `<div class="duo-nd">${t('det.nodata')}</div>`}</div>
        <div class="duo-col"><div class="duo-cab">${escudoMini(p.visita)}${esc(p.visita.abrev)}</div>${lideres('visita') || `<div class="duo-nd">${t('det.nodata')}</div>`}</div>
      </div>
    </div>` : '';

  // ===== LESIONADOS (con alerta: por qué no juega) =====
  function lesiones(lado) {
    const arr = (p.lesionados && p.lesionados[lado]) || [];
    if (!arr.length) return `<div class="duo-nd ok">${t('det.sinlesiones')}</div>`;
    return arr.slice(0, 6).map(x => `<div class="les-row">
      <span class="les-n">${esc(x.nombre)} ${x.pos ? `<em>${esc(x.pos)}</em>` : ''}</span>
      <span class="les-est">${esc(x.estado)}</span>
    </div>`).join('');
  }
  const hayLes = p.lesionados && (p.lesionados.local.length || p.lesionados.visita.length);
  const lesionados = hayLes ? `
    <div class="det-block">
      <div class="det-sec-t big alert">${IC.alerta || ''} ${t('det.lesionados')}</div>
      <div class="det-duo">
        <div class="duo-col"><div class="duo-cab">${escudoMini(p.local)}${esc(p.local.abrev)}</div>${lesiones('local')}</div>
        <div class="duo-col"><div class="duo-cab">${escudoMini(p.visita)}${esc(p.visita.abrev)}</div>${lesiones('visita')}</div>
      </div>
    </div>` : '';

  // ===== COMPARATIVA visual (barras enfrentadas cuando hay récord) =====
  function barraRecord() {
    const pw = (r) => { const m2 = String(r||'').match(/(\d+)\D+(\d+)/); if (!m2) return null; const w=+m2[1], l=+m2[2]; return (w+l) ? w/(w+l) : null; };
    const a = pw(p.local.record), b = pw(p.visita.record);
    if (a == null || b == null) return '';
    const la = Math.round(a*100), lb = Math.round(b*100);
    return `<div class="cmp-row">
      <span class="cmp-l">${esc(p.local.record)}</span>
      <div class="cmp-bar"><i class="cl" style="width:${a/(a+b)*100}%"></i><i class="cr" style="width:${b/(a+b)*100}%"></i></div>
      <span class="cmp-r">${esc(p.visita.record)}</span>
      <span class="cmp-k">${t('det.winpct')}</span>
    </div>`;
  }
  const filas = (p.datos || []).map(d => `
    <div class="drow">
      <span class="l">${esc(Lg(d.local))}</span>
      <span class="k">${esc(Lg(d.etiqueta))}</span>
      <span class="r">${esc(Lg(d.visita))}</span>
    </div>`).join('');
  const barRec = barraRecord();
  const comparativa = (filas || barRec) ? `
    <div class="det-block">
      <div class="det-sec-t big">${t('det.comparativa')}</div>
      ${barRec}
      ${filas ? `<div class="datos-head"><span class="h-l">${esc(p.local.abrev)}</span><span class="h-k"></span><span class="h-r">${esc(p.visita.abrev)}</span></div>${filas}` : ''}
    </div>` : '';

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

  // Info de franquicia (TheSportsDB): fundación y estadio con capacidad
  function infoEq(lado, eq) {
    const info = p.infoEquipos && p.infoEquipos[lado];
    if (!info) return '';
    const filas = [];
    if (info.fundado) filas.push(`<span class="fe-k">${t('det.fundado')}</span><span class="fe-v">${info.fundado}</span>`);
    if (info.estadio) filas.push(`<span class="fe-k">${t('det.estadio')}</span><span class="fe-v">${esc(info.estadio)}</span>`);
    if (info.capacidad) filas.push(`<span class="fe-k">${t('det.capacidad')}</span><span class="fe-v">${info.capacidad.toLocaleString()}</span>`);
    if (!filas.length) return '';
    return `<div class="fe-col"><div class="fe-cab">${esc(eq.abrev)}</div>${filas.map((f,i)=>`<div class="fe-row">${f}</div>`).join('')}</div>`;
  }
  const hayInfo = p.infoEquipos && (p.infoEquipos.local || p.infoEquipos.visita);
  const franquicia = hayInfo ? `
    <div class="det-sec-t">${t('det.franquicia')}</div>
    <div class="det-fe">${infoEq('local', p.local)}${infoEq('visita', p.visita)}</div>` : '';

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
    ${abridores}
    ${bloqueLideres}
    ${lesionados}
    ${comparativa}
    ${franquicia}
    ${bloqueAnalista}
  `;
}
