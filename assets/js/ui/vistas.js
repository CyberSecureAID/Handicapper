/* ============================================================
   VISTAS — HTML de la lista de partidos y del detalle.
   Renderiza los logos reales con respaldo (abreviatura) si falla la carga.
   ============================================================ */
import { IC } from './iconos.js';
import { t, Lg, idiomaActual } from './idioma.js';
import { figuraLado, fondoLado } from './figuras.js';
import { fotoJugador } from '../datos/fotos-jugadores.js';

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

/* ============================================================
   DASHBOARD 16:9 (local | comparación | visita)
   - Figuras doradas por deporte a cada lado, sobre fondo rojo/azul.
   - Tarjeta de abridor "Anunciado para hoy" con foto real (ESPN CDN).
   - Mejores bateadores (AVG) por equipo.
   - Comparación central con barras enfrentadas (estilo referencia).
   ============================================================ */

function numDe(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/-?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : null;
}

/* Avatar circular con foto real (headshot gratis) y respaldo por inicial */
function avatar(jug, ligaId, cls) {
  if (!jug) return '';
  const url = fotoJugador(jug, ligaId);
  const ini = esc((jug.nombre || '?').trim().charAt(0).toUpperCase());
  if (url) {
    return `<span class="hd-av ${cls}"><img src="${esc(url)}" alt="" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="hd-av-i" style="display:none">${ini}</span></span>`;
  }
  return `<span class="hd-av ${cls}"><span class="hd-av-i" style="display:flex">${ini}</span></span>`;
}

export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
  const L = (x) => esc(Lg(x));
  const ES = idiomaActual() === 'es';
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null && m.empate > 0;
  const favLocal = (m.local || 0) >= (m.visita || 0);
  const manoTxt = (mn) => mn === 'L' ? t('det.lhp') : (mn === 'R' ? t('det.rhp') : '');

  const confMap = {
    'alta': { es: 'Confianza alta', en: 'High confidence', c: 'alta' },
    'media': { es: 'Confianza media', en: 'Medium confidence', c: 'media' },
    'baja': { es: 'Confianza baja', en: 'Low confidence', c: 'baja' },
    'muy baja': { es: 'Confianza muy baja', en: 'Very low confidence', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const badge = cf ? `<span class="conf ${cf.c}">${ES ? cf.es : cf.en}</span>` : '';

  function donut(pct, cls) {
    const r = 26, c = 2 * Math.PI * r, dash = (c * (pct || 0) / 100).toFixed(2);
    return `<svg class="pd ${cls}" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="7"/>
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${dash} ${(c - dash).toFixed(2)}" transform="rotate(-90 34 34)"/>
      <text x="34" y="40" text-anchor="middle" class="pd-t">${pct || 0}%</text>
    </svg>`;
  }

  /* HERO: figura dorada del deporte sobre el fondo rojo/azul del lado */
  function hero(lado) {
    const eq = p[lado];
    const fig = figuraLado(p.ligaId, lado);
    const fondo = fondoLado(lado);
    const pct = lado === 'local' ? (m.local || 0) : (m.visita || 0);
    const cls = lado === 'local' ? 'oro' : 'azul';
    return `<div class="hd-hero ${lado}" style="--hd-bg:url('${fondo}')">
      <div class="hd-hero-badge ${cls}">${escudoMini(eq)}<b>${esc(eq.abrev)}</b><span>${pct}%</span></div>
      <img class="hd-hero-fig" src="${esc(fig)}" alt="" onerror="this.style.display='none'">
    </div>`;
  }

  /* Jugador estrella (cuando no hay abridor, p. ej. NBA/fútbol) */
  function estrella(lado) {
    const plant = (p.plantilla && p.plantilla[lado]) || [];
    const conStats = plant.filter(j => j.stats && Object.keys(j.stats).length >= 2);
    if (conStats.length) {
      const j = conStats[0];
      const stats = Object.keys(j.stats).slice(0, 4).map(k => ({ k, v: j.stats[k] }));
      return { nombre: j.nombre, pos: j.pos, id: j.id, foto: j.foto, stats };
    }
    const lid = (p.jugadores && p.jugadores[lado]) || [];
    if (!lid.length) return null;
    const nombre = lid[0].nombre;
    let stats = lid.filter(j => j.nombre === nombre).map(j => ({ k: j.etiqueta, v: j.dato }));
    if (stats.length < 2) stats = lid.slice(0, 4).map(j => ({ k: j.etiqueta, v: j.dato }));
    return { nombre, pos: lid[0].pos, id: lid[0].id, foto: lid[0].foto, stats: stats.slice(0, 4) };
  }

  /* Tarjeta del jugador destacado: abridor "Anunciado para hoy" o estrella */
  function starterCard(lado) {
    const a = p[lado].abridor;
    let jug, badge2, sub, mano = '', statsArr = [];
    if (a && a.nombre) {
      jug = a;
      badge2 = ES ? 'Pitcher abridor' : 'Starting pitcher';
      sub = ES ? 'Anunciado para hoy' : 'Announced for today';
      if (a.mano) mano = `<span class="hd-mano ${a.mano === 'L' ? 'lhp' : 'rhp'}">${manoTxt(a.mano)}</span>`;
      if (a.wl) statsArr.push({ v: a.wl, k: 'W-L' });
      if (a.era) statsArr.push({ v: a.era, k: 'ERA' });
    } else {
      const st = estrella(lado);
      if (!st) return '';
      jug = st;
      badge2 = ES ? 'Jugador destacado' : 'Featured player';
      sub = ES ? 'Anunciado para hoy' : 'Announced for today';
      statsArr = st.stats.slice(0, 4);
    }
    const stats = statsArr.map(s => `<span><b>${esc(s.v)}</b>${esc(s.k)}</span>`).join('');
    return `<div class="hd-sc ${lado}">
      <div class="hd-sc-head"><span class="hd-sc-badge">${badge2}</span></div>
      <div class="hd-sc-row">
        ${avatar(jug, p.ligaId, 'big')}
        <div class="hd-sc-id">
          <span class="hd-sc-sub">${sub}</span>
          <b class="hd-sc-name">${esc(jug.nombre)}</b>
          <span class="hd-sc-meta">${jug.pos ? `<em>${esc(jug.pos)}</em>` : ''}${mano}</span>
        </div>
      </div>
      ${stats ? `<div class="hd-sc-stats">${stats}</div>` : ''}
    </div>`;
  }

  /* Mejores bateadores (AVG) o líderes del equipo */
  function topBlock(lado) {
    let arr = (p.bateadores && p.bateadores[lado]) || [];
    let titulo = ES ? 'Mejores bateadores (AVG)' : 'Top batters (AVG)';
    if (!arr.length) {
      const lid = (p.jugadores && p.jugadores[lado]) || [];
      const vistos = new Set();
      arr = lid.filter(j => { if (vistos.has(j.nombre)) return false; vistos.add(j.nombre); return true; })
        .slice(0, 3).map(j => ({ nombre: j.nombre, pos: j.pos, avg: j.dato, id: j.id, foto: j.foto, et: j.etiqueta }));
      titulo = ES ? 'Líderes del equipo' : 'Team leaders';
    }
    if (!arr.length) return '';
    const rows = arr.slice(0, 3).map((j, i) => `<div class="hd-bt-row">
      <span class="hd-bt-n">${i + 1}</span>
      ${avatar(j, p.ligaId, 'sm')}
      <span class="hd-bt-name">${esc(j.nombre)}${j.et ? `<em>${esc(j.et)}</em>` : ''}</span>
      ${j.pos ? `<span class="hd-bt-pos">${esc(j.pos)}</span>` : ''}
      <b class="hd-bt-avg">${esc(j.avg || '')}</b>
    </div>`).join('');
    return `<div class="hd-block"><div class="hd-block-t">${titulo}</div>${rows}</div>`;
  }

  /* Récord casa/fuera como "rendimiento" */
  function formBlock(lado) {
    const eq = p[lado];
    const casa = eq.recordCasa, fuera = eq.recordFuera;
    if (!casa && !fuera) return '';
    const chip = (etq, val) => val ? `<div class="hd-form-chip"><span>${etq}</span><b>${esc(val)}</b></div>` : '';
    return `<div class="hd-block"><div class="hd-block-t">${ES ? 'Rendimiento' : 'Form'}</div>
      <div class="hd-form">${chip(ES ? 'Casa' : 'Home', casa)}${chip(ES ? 'Fuera' : 'Away', fuera)}</div></div>`;
  }

  function lesion(lado) {
    const arr = (p.lesionados && p.lesionados[lado]) || [];
    if (!arr.length) return '';
    const items = arr.slice(0, 3).map(x => `<div class="hd-inj-row"><span>${esc(x.nombre)} ${x.pos ? `<em>${esc(x.pos)}</em>` : ''}</span><b>${esc(x.estado)}</b></div>`).join('');
    return `<div class="hd-block"><div class="hd-block-t alert">${IC.alerta || ''} ${t('det.lesionados')}</div>${items}</div>`;
  }

  function ladoPanel(lado) {
    return `<aside class="hd-side ${lado}">
      ${hero(lado)}
      ${starterCard(lado)}
      ${topBlock(lado)}
      ${formBlock(lado)}
      ${lesion(lado)}
    </aside>`;
  }

  /* Comparación central: barras enfrentadas por categoría */
  function comparacion() {
    const filas = [];
    const pw = (r, fut) => {
      if (fut) { const mm = String(r || '').match(/(\d+)\D+(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], d = +mm[2], l = +mm[3], t2 = w + d + l; return t2 ? (w + d * 0.5) / t2 : null; }
      const mm = String(r || '').match(/(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], l = +mm[2]; return (w + l) ? w / (w + l) : null;
    };
    const rl = pw(p.local.record, p.futbol), rv = pw(p.visita.record, p.futbol);
    if (rl != null && rv != null && rl + rv > 0) {
      filas.push(fila(p.local.record, p.visita.record, t('det.winpct'), rl / (rl + rv) * 100));
    }
    const cats = {};
    ((p.jugadores && p.jugadores.local) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).l = j; });
    ((p.jugadores && p.jugadores.visita) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).r = j; });
    Object.keys(cats).forEach(k => {
      const c = cats[k]; if (!c.l || !c.r) return;
      const a = numDe(c.l.dato), b = numDe(c.r.dato);
      if (a == null || b == null || (a + b) === 0) return;
      filas.push(fila(c.l.dato, c.r.dato, k, a / (a + b) * 100));
    });
    return filas.length ? filas.join('') : `<div class="hd-cmp-nd">${ES ? 'Sin estadísticas comparables todavía.' : 'No comparable stats yet.'}</div>`;
  }
  function fila(vl, vr, k, lp) {
    const l = Math.max(2, Math.min(98, lp));
    return `<div class="hd-cmp-row">
      <span class="hd-cmp-v l">${esc(vl)}</span>
      <div class="hd-cmp-mid"><span class="hd-cmp-k">${esc(k)}</span>
        <div class="hd-cmp-bar"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="r" style="width:${(100 - l).toFixed(1)}%"></i></div></div>
      <span class="hd-cmp-v r">${esc(vr)}</span>
    </div>`;
  }

  let analista = '';
  if (p.analista) {
    const a = p.analista, bl = !!opciones.bloquear;
    analista = `<div class="hd-analista ${bl ? 'bloqueado' : ''}">
      <div class="hd-an-t">${IC.estrella} ${t('analista.titulo')}</div>
      <div class="hd-an-v"><span>${esc(Lg(a.veredicto))}</span><b>${a.probabilidad}%</b></div>
      <div class="hd-an-txt">${esc(Lg(a.texto))}</div>
      ${bl ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}
    </div>`;
  }

  let cuenta = '';
  if (p.cuando) {
    const d = new Date(p.cuando);
    if (!isNaN(d) && p.estado === 'proximo') cuenta = `<span class="hd-when-live cuenta" data-cuando="${esc(p.cuando)}">—</span>`;
  }

  return `
  <div class="hd" data-liga="${esc(p.ligaId)}">
    <div class="hd-top">
      <div class="hd-team local">${escudoMini(p.local)}<div class="hd-tinfo"><b>${esc(p.local.nombre)}</b><span>${esc(p.local.record || '')}</span></div></div>
      <div class="hd-top-c"><span class="hd-liga">${esc(p.liga)}</span><span class="hd-hora">${esc(Lg(p.inicio))} ${cuenta}</span>${p.sede ? `<span class="hd-sede">${L(p.sede)}</span>` : ''}</div>
      <div class="hd-team visita"><div class="hd-tinfo r"><b>${esc(p.visita.nombre)}</b><span>${esc(p.visita.record || '')}</span></div>${escudoMini(p.visita)}</div>
    </div>

    <div class="hd-body">
      ${ladoPanel('local')}
      <section class="hd-center">
        <div class="hd-c-t">${ES ? 'Comparación de equipos' : 'Team comparison'}</div>
        <div class="hd-donuts">
          <div class="hd-donut ${favLocal ? 'fav' : ''}">${donut(m.local || 0, 'oro')}<span>${esc(p.local.abrev)}</span></div>
          ${tieneEmpate ? `<div class="hd-draw"><b>${m.empate}%</b><span>${t('prob.empate')}</span></div>` : `<div class="hd-badge">${badge}</div>`}
          <div class="hd-donut ${!favLocal ? 'fav' : ''}">${donut(m.visita || 0, 'azul')}<span>${esc(p.visita.abrev)}</span></div>
        </div>
        <div class="hd-cmp">${comparacion()}</div>
        ${analista}
      </section>
      ${ladoPanel('visita')}
    </div>
  </div>`;
}
