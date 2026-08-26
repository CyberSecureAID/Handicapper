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

/* ---- Detalle de un partido: DASHBOARD 16:9 (local | comparación | visita) ---- */

function silueta(cls) {
  return `<svg class="fig ${cls}" viewBox="0 0 160 380" aria-hidden="true">
    <ellipse cx="80" cy="28" rx="18" ry="22"/>
    <path d="M73 47 h14 v10 h-14 z"/>
    <path d="M80 55 C66 55 57 60 52 69 C48 77 47 88 45 99 C36 106 29 124 24 150 C22 162 21 174 23 182 C25 189 33 189 35 181 C39 165 45 149 52 138 C51 156 51 176 54 193 L60 206 C62 250 64 295 66 336 C67 349 78 349 78 336 C78 300 77 258 75 218 C76 214 78 213 80 213 C82 213 84 214 85 218 C83 258 82 300 82 336 C82 349 94 349 94 336 C96 295 98 250 100 206 L106 193 C109 176 109 156 108 138 C115 149 121 165 125 181 C127 189 135 189 137 182 C139 174 138 162 136 150 C131 124 124 106 115 99 C113 88 112 77 108 69 C103 60 94 55 80 55 Z"/>
    <path class="def" d="M80 62 V150"/>
    <path class="def" d="M63 84 C70 92 90 92 97 84"/>
    <path class="def" d="M66 108 h28 M67 126 h26 M69 144 h22"/>
    <path class="def" d="M60 206 C70 201 90 201 100 206"/>
    <path class="def" d="M69 262 h8 M83 262 h8"/>
  </svg>`;
}

function numDe(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/-?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : null;
}

export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
  const L = (x) => esc(Lg(x));
  const ES = idiomaActual() === 'es';
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null && m.empate > 0;

  const confMap = {
    'alta': { es: 'Confianza alta', en: 'High confidence', c: 'alta' },
    'media': { es: 'Confianza media', en: 'Medium confidence', c: 'media' },
    'baja': { es: 'Confianza baja', en: 'Low confidence', c: 'baja' },
    'muy baja': { es: 'Confianza muy baja', en: 'Very low confidence', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const badge = cf ? `<span class="conf ${cf.c}">${ES ? cf.es : cf.en}</span>` : '';

  function donut(pct, cls) {
    const r = 30, c = 2 * Math.PI * r, dash = (c * (pct || 0) / 100).toFixed(2);
    return `<svg class="pd ${cls}" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r="${r}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="8"/>
      <circle cx="38" cy="38" r="${r}" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"
        stroke-dasharray="${dash} ${(c - dash).toFixed(2)}" transform="rotate(-90 38 38)"/>
      <text x="38" y="44" text-anchor="middle" class="pd-t">${pct || 0}%</text>
    </svg>`;
  }
  const manoTxt = (mn) => mn === 'L' ? t('det.lhp') : (mn === 'R' ? t('det.rhp') : '');

  function estrella(lado) {
    const plant = (p.plantilla && p.plantilla[lado]) || [];
    const conStats = plant.filter(j => j.stats && Object.keys(j.stats).length >= 2);
    if (conStats.length) {
      const j = conStats[0];
      const stats = Object.keys(j.stats).slice(0, 5).map(k => ({ k, v: j.stats[k] }));
      return { nombre: j.nombre, pos: j.pos, stats };
    }
    const lid = (p.jugadores && p.jugadores[lado]) || [];
    if (!lid.length) return null;
    const nombre = lid[0].nombre;
    let stats = lid.filter(j => j.nombre === nombre).map(j => ({ k: j.etiqueta, v: j.dato }));
    if (stats.length < 2) stats = lid.slice(0, 4).map(j => ({ k: j.etiqueta, v: j.dato }));
    return { nombre, pos: lid[0].pos, stats: stats.slice(0, 5) };
  }
  function fichaEstrella(lado) {
    const j = estrella(lado);
    if (!j) return `<div class="ds-star"><div class="ds-fig">${silueta(lado)}</div><div class="ds-nd">${t('det.nodata')}</div></div>`;
    const nums = j.stats.map(s => numDe(s.v)).filter(n => n != null);
    const max = nums.length ? Math.max(...nums) : 1;
    const barras = j.stats.map(s => {
      const n = numDe(s.v), w = n != null && max > 0 ? Math.max(14, Math.round(n / max * 100)) : 45;
      return `<div class="dss-row"><span class="dss-k">${esc(s.k)}</span><span class="dss-v">${esc(s.v)}</span><div class="dss-bar"><i style="width:${w}%"></i></div></div>`;
    }).join('');
    return `<div class="ds-star">
      <div class="ds-name"><b>${esc(j.nombre)}</b><span>${esc(j.pos || '')}</span></div>
      <div class="ds-fig">${silueta(lado)}</div>
      <div class="ds-stats">${barras}</div>
    </div>`;
  }

  function abridor(lado) {
    const a = p[lado].abridor;
    if (!a || !a.nombre) return '';
    const cls = a.mano === 'L' ? 'lhp' : (a.mano === 'R' ? 'rhp' : '');
    const mano = a.mano ? `<span class="ds-mano ${cls}">${manoTxt(a.mano)}</span>` : '';
    const st = [a.era ? `<span><b>${esc(a.era)}</b> ERA</span>` : '', a.wl ? `<span><b>${esc(a.wl)}</b> W-L</span>` : ''].filter(Boolean).join('');
    return `<div class="ds-sec"><div class="ds-sec-t">${t('det.abridor')}</div>
      <div class="ds-abr"><b>${esc(a.nombre)}</b> ${mano}<div class="ds-abr-st">${st}</div></div></div>`;
  }

  function listaJug(lado) {
    const plant = (p.plantilla && p.plantilla[lado]) || [];
    let items = '';
    if (plant.length) {
      items = plant.slice(0, 7).map(j => {
        const sk = j.stats && Object.keys(j.stats)[0];
        const dato = sk ? `${esc(String(j.stats[sk]))} <small>${esc(sk)}</small>` : '';
        return `<div class="dj-row"><span>${esc(j.nombre)} ${j.pos ? `<em>${esc(j.pos)}</em>` : ''}</span><b>${dato}</b></div>`;
      }).join('');
    } else {
      const lid = (p.jugadores && p.jugadores[lado]) || [];
      items = lid.slice(0, 7).map(j => `<div class="dj-row"><span>${esc(j.nombre)} ${j.pos ? `<em>${esc(j.pos)}</em>` : ''}</span><b>${esc(j.dato)} <small>${esc(j.etiqueta)}</small></b></div>`).join('');
    }
    if (!items) return '';
    return `<div class="ds-sec"><div class="ds-sec-t">${ES ? 'Jugadores' : 'Players'}</div><div class="dj-list">${items}</div></div>`;
  }

  function lesion(lado) {
    const arr = (p.lesionados && p.lesionados[lado]) || [];
    if (!arr.length) return '';
    const items = arr.slice(0, 4).map(x => `<div class="dj-row les"><span>${esc(x.nombre)} ${x.pos ? `<em>${esc(x.pos)}</em>` : ''}</span><b class="out">${esc(x.estado)}</b></div>`).join('');
    return `<div class="ds-sec"><div class="ds-sec-t alert">${IC.alerta || ''} ${t('det.lesionados')}</div><div class="dj-list">${items}</div></div>`;
  }

  function lado(l) { return `${fichaEstrella(l)}${abridor(l)}${listaJug(l)}${lesion(l)}`; }

  function comparacion() {
    const cats = {};
    ((p.jugadores && p.jugadores.local) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).l = j; });
    ((p.jugadores && p.jugadores.visita) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).r = j; });
    const filas = Object.keys(cats).map(k => {
      const c = cats[k]; if (!c.l || !c.r) return '';
      const a = numDe(c.l.dato), b = numDe(c.r.dato);
      if (a == null || b == null || (a + b) === 0) return '';
      const lp = a / (a + b) * 100;
      return `<div class="cc-row"><span class="cc-l">${esc(c.l.dato)}</span><div class="cc-mid"><div class="cc-bar"><i class="bl" style="width:${lp.toFixed(1)}%"></i><i class="br" style="width:${(100 - lp).toFixed(1)}%"></i></div><span class="cc-k">${esc(k)}</span></div><span class="cc-r">${esc(c.r.dato)}</span></div>`;
    }).filter(Boolean).join('');
    const pw = (r) => { const mm = String(r || '').match(/(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], ll = +mm[2]; return (w + ll) ? w / (w + ll) : null; };
    const rl = pw(p.local.record), rv = pw(p.visita.record);
    let rec = '';
    if (rl != null && rv != null && rl + rv > 0) {
      const lp = rl / (rl + rv) * 100;
      rec = `<div class="cc-row"><span class="cc-l">${esc(p.local.record)}</span><div class="cc-mid"><div class="cc-bar"><i class="bl" style="width:${lp.toFixed(1)}%"></i><i class="br" style="width:${(100 - lp).toFixed(1)}%"></i></div><span class="cc-k">${t('det.winpct')}</span></div><span class="cc-r">${esc(p.visita.record)}</span></div>`;
    }
    const cuerpo = rec + filas;
    return cuerpo || `<div class="cc-nd">${ES ? 'Sin estadísticas comparables todavía.' : 'No comparable stats yet.'}</div>`;
  }

  let analista = '';
  if (p.analista) {
    const a = p.analista, bl = !!opciones.bloquear;
    analista = `<div class="cc-analista ${bl ? 'bloqueado' : ''}">
      <div class="cc-an-t">${IC.estrella} ${t('analista.titulo')}</div>
      <div class="cc-an-v"><span>${esc(Lg(a.veredicto))}</span><b>${a.probabilidad}%</b></div>
      <div class="cc-an-txt">${esc(Lg(a.texto))}</div>
      ${bl ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}
    </div>`;
  }

  let cuenta = '';
  if (p.cuando) {
    const d = new Date(p.cuando);
    if (!isNaN(d) && p.estado === 'proximo') cuenta = `<span class="cc-when cuenta" data-cuando="${esc(p.cuando)}">—</span>`;
  }
  const favLocal = (m.local || 0) >= (m.visita || 0);

  return `
  <div class="dash16">
    <div class="d16-top">
      <div class="d16-team local">${escudoMini(p.local)}<div class="d16-tinfo"><b>${esc(p.local.nombre)}</b><span>${esc(p.local.record || '')}</span></div></div>
      <div class="d16-prob">
        <div class="d16-donut ${favLocal ? 'fav' : ''}">${donut(m.local || 0, 'oro')}<span>${esc(p.local.abrev)}</span></div>
        ${tieneEmpate ? `<div class="d16-draw"><b>${m.empate}%</b><span>${t('prob.empate')}</span></div>` : `<div class="d16-badge">${badge}</div>`}
        <div class="d16-donut ${!favLocal ? 'fav' : ''}">${donut(m.visita || 0, 'azul')}<span>${esc(p.visita.abrev)}</span></div>
      </div>
      <div class="d16-team visita"><div class="d16-tinfo r"><b>${esc(p.visita.nombre)}</b><span>${esc(p.visita.record || '')}</span></div>${escudoMini(p.visita)}</div>
    </div>

    <div class="d16-body">
      <div class="d16-side local">${lado('local')}</div>
      <div class="d16-center">
        <div class="cc-t">${t('det.compjug') || (ES ? 'Comparación' : 'Comparison')} ${cuenta}</div>
        <div class="cc-list">${comparacion()}</div>
        ${p.sede ? `<div class="cc-venue">${IC.info || ''} ${L(p.sede)}</div>` : ''}
        ${analista}
      </div>
      <div class="d16-side visita">${lado('visita')}</div>
    </div>
  </div>`;
}
