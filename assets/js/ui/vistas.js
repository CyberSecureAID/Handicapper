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
   PANEL DE COMPARACIÓN — réplica del panel deportivo de referencia.
   ============================================================ */

function numDe(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/-?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : null;
}

/* Avatar circular con foto oficial y respaldo por inicial */
function avatar(jug, ligaId) {
  if (!jug) return '';
  const url = fotoJugador(jug, ligaId);
  const ini = esc((jug.nombre || '?').trim().charAt(0).toUpperCase());
  if (url) {
    return `<span class="hd-av"><img src="${esc(url)}" alt="" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="hd-av-i" style="display:none">${ini}</span></span>`;
  }
  return `<span class="hd-av"><span class="hd-av-i" style="display:flex">${ini}</span></span>`;
}

/* Categorías donde MENOR es mejor (invierte la barra) */
const INV = /era|whip|error|contra|against|goals against|ponches recibidos/i;

export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
  const ES = idiomaActual() === 'es';
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null && m.empate > 0;
  const favLocal = (m.local || 0) >= (m.visita || 0);
  const manoTxt = (mn) => mn === 'L' ? (ES ? 'LHP' : 'LHP') : (mn === 'R' ? 'RHP' : '');
  const anio = new Date().getFullYear();

  const confMap = {
    'alta': { es: 'Confianza alta', en: 'High confidence', c: 'alta' },
    'media': { es: 'Confianza media', en: 'Medium confidence', c: 'media' },
    'baja': { es: 'Confianza baja', en: 'Low confidence', c: 'baja' },
    'muy baja': { es: 'Confianza muy baja', en: 'Very low confidence', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const badge = cf ? `<span class="conf ${cf.c}">${ES ? cf.es : cf.en}</span>` : '';

  function donut(pct, lado) {
    const r = 24, c = 2 * Math.PI * r, dash = (c * (pct || 0) / 100).toFixed(2);
    return `<svg class="pd" viewBox="0 0 62 62">
      <circle cx="31" cy="31" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="6"/>
      <circle cx="31" cy="31" r="${r}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${dash} ${(c - dash).toFixed(2)}" transform="rotate(-90 31 31)"/>
      <text x="31" y="37" text-anchor="middle" class="pd-t">${pct || 0}%</text>
    </svg>`;
  }

  const divTxt = (eq) => eq.division || '';

  /* Cabecera de un equipo */
  function headTeam(eq, lado) {
    const parts = String(eq.nombre || '').trim().split(/\s+/);
    const ciudad = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    const nombre = parts.length > 1 ? parts.slice(-1)[0] : eq.nombre;
    const rec = eq.record ? `${esc(eq.record)}${divTxt(eq) ? ` <em>· ${esc(divTxt(eq))}</em>` : ''}` : '';
    return `<div class="hd-hd-team ${lado}">
      <img class="hd-hd-logo" src="${esc(eq.logo || '')}" alt="" onerror="this.style.visibility='hidden'">
      <div class="hd-hd-tx">
        ${ciudad ? `<span class="hd-hd-city">${esc(ciudad)}</span>` : ''}
        <span class="hd-hd-name">${esc(nombre)}</span>
        ${rec ? `<span class="hd-hd-rec">${rec}</span>` : ''}
      </div>
    </div>`;
  }

  /* Tarjeta del abridor (o jugador destacado) con foto grande */
  function pitcher(lado) {
    const eq = p[lado];
    const a = eq.abridor;
    const esMLB = p.ligaId === 'mlb';
    let jug, badgeT, fn = '', ln, meta = [], stats = [];
    if (a && a.nombre) {
      jug = a;
      badgeT = ES ? 'Pitcher abridor' : 'Starting pitcher';
      const parts = String(a.nombre).trim().split(/\s+/);
      fn = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
      ln = parts.length > 1 ? parts.slice(-1)[0] : a.nombre;
      if (a.mano) meta.push(manoTxt(a.mano));
      if (a.edad) meta.push(`${a.edad} ${ES ? 'AÑOS' : 'YRS'}`);
      if (a.altura) meta.push(esc(a.altura));
      if (a.peso) meta.push(`${a.peso} LBS`);
      if (a.wl) stats.push({ v: a.wl, k: ES ? 'G-P' : 'W-L' });
      if (a.era) stats.push({ v: a.era, k: 'ERA' });
      if (a.so != null) stats.push({ v: a.so, k: 'SO' });
      if (a.whip != null) stats.push({ v: a.whip, k: 'WHIP' });
    } else {
      const lid = (p.jugadores && p.jugadores[lado]) || [];
      if (!lid.length) { jug = null; badgeT = ES ? 'Jugador destacado' : 'Featured player'; ln = ES ? 'Por confirmar' : 'TBD'; }
      else {
        const j0 = lid[0];
        jug = j0; badgeT = ES ? 'Jugador destacado' : 'Featured player';
        const parts = String(j0.nombre).trim().split(/\s+/);
        fn = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        ln = parts.length > 1 ? parts.slice(-1)[0] : j0.nombre;
        if (j0.pos) meta.push(esc(j0.pos));
        stats = lid.filter(x => x.nombre === j0.nombre).slice(0, 4).map(x => ({ v: x.dato, k: x.etiqueta }));
        if (stats.length < 2) stats = lid.slice(0, 4).map(x => ({ v: x.dato, k: x.etiqueta }));
      }
    }
    const foto = jug ? fotoJugador(jug, p.ligaId) : null;
    const figFallback = figuraLado(p.ligaId, lado);
    const num = (a && a.num) ? `<em>#${esc(a.num)}</em>` : '';
    const photoTag = foto
      ? `<img class="hd-pit-photo" src="${esc(foto)}" alt="" loading="lazy"
           onerror="this.onerror=null;this.src='${esc(figFallback)}';this.classList.add('fallback')">`
      : `<img class="hd-pit-photo fallback" src="${esc(figFallback)}" alt="">`;
    const statsHTML = stats.length ? `<div class="hd-pit-st">${stats.map(s => `<div><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join('')}</div>` : '';
    return `<div class="hd-pit ${lado}">
      ${photoTag}
      <div class="hd-pit-info">
        <span class="hd-pit-badge">${IC.estrella || ''} ${badgeT}</span>
        <div class="hd-pit-sub">${ES ? 'Anunciado para hoy' : 'Announced for today'}</div>
        ${fn ? `<span class="hd-pit-fn">${esc(fn)}</span>` : ''}
        <span class="hd-pit-ln">${esc(ln)} ${num}</span>
        ${meta.length ? `<div class="hd-pit-meta">${meta.join(' · ')}</div>` : ''}
        ${stats.length ? `<div class="hd-pit-temp">${ES ? 'Temporada' : 'Season'} ${anio}</div>` : ''}
        ${statsHTML}
      </div>
    </div>`;
  }

  /* Mejores bateadores (AVG) */
  function batters(lado) {
    let arr = (p.bateadores && p.bateadores[lado]) || [];
    let titulo = ES ? 'Mejores bateadores (AVG)' : 'Top batters (AVG)';
    if (!arr.length) {
      const lid = (p.jugadores && p.jugadores[lado]) || [];
      const vistos = new Set();
      arr = lid.filter(x => { if (vistos.has(x.nombre)) return false; vistos.add(x.nombre); return true; })
        .slice(0, 3).map(x => ({ nombre: x.nombre, pos: x.pos, avg: x.dato, id: x.id, foto: x.foto, et: x.etiqueta }));
      titulo = ES ? 'Líderes del equipo' : 'Team leaders';
    }
    if (!arr.length) return '';
    const rows = arr.slice(0, 3).map((j, i) => `<div class="hd-bat">
      <span class="hd-bat-n">${i + 1}</span>${avatar(j, p.ligaId)}
      <span class="hd-bat-nm">${esc(j.nombre)}</span>
      ${j.pos ? `<span class="hd-bat-pos">${esc(j.pos)}</span>` : ''}
      <b class="hd-bat-avg">${esc(j.avg || j.et || '')}</b>
    </div>`).join('');
    return `<div class="hd-blk"><div class="hd-blk-t">${titulo}</div>${rows}</div>`;
  }

  /* Rendimiento reciente: chips de últimos resultados o récord casa/fuera */
  function form(lado) {
    const eq = p[lado];
    const ult = eq.ultimos || [];
    if (ult.length) {
      const chips = ult.slice(0, 5).map(u => `<div class="hd-fm ${u.w ? 'w' : 'l'}">
        <span class="hd-fm-b">${u.w ? 'W' : 'L'}</span>
        <span class="hd-fm-x">${esc(u.rival || '')}</span>
        <span class="hd-fm-s">${esc(u.marcador || '')}</span></div>`).join('');
      return `<div class="hd-blk"><div class="hd-blk-t">${ES ? 'Rendimiento reciente' : 'Recent form'}</div><div class="hd-form">${chips}</div></div>`;
    }
    const casa = eq.recordCasa, fuera = eq.recordFuera;
    if (!casa && !fuera) return '';
    const chip = (etq, val) => val ? `<div class="hd-fm"><span class="hd-fm-b" style="background:var(--tinta-3)">${etq.charAt(0)}</span><span class="hd-fm-x">${etq}</span><span class="hd-fm-s">${esc(val)}</span></div>` : '';
    return `<div class="hd-blk"><div class="hd-blk-t">${ES ? 'Rendimiento' : 'Form'}</div>
      <div class="hd-form" style="grid-template-columns:1fr 1fr">${chip(ES ? 'Casa' : 'Home', casa)}${chip(ES ? 'Fuera' : 'Away', fuera)}</div></div>`;
  }

  /* Comparación central: barras enfrentadas por categoría */
  function comparacion() {
    const filas = [];
    const pw = (r, fut) => {
      if (fut) { const mm = String(r || '').match(/(\d+)\D+(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], d = +mm[2], l = +mm[3], t2 = w + d + l; return t2 ? (w + d * 0.5) / t2 : null; }
      const mm = String(r || '').match(/(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], l = +mm[2]; return (w + l) ? w / (w + l) : null;
    };
    const rl = pw(p.local.record, p.futbol), rv = pw(p.visita.record, p.futbol);
    if (rl != null && rv != null && rl + rv > 0) filas.push(fila(p.local.record, p.visita.record, ES ? '% Victorias' : 'Win %', rl / (rl + rv) * 100));
    const cats = {};
    ((p.jugadores && p.jugadores.local) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).l = j; });
    ((p.jugadores && p.jugadores.visita) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).r = j; });
    Object.keys(cats).forEach(k => {
      const c = cats[k]; if (!c.l || !c.r) return;
      const a = numDe(c.l.dato), b = numDe(c.r.dato);
      if (a == null || b == null || (a + b) === 0) return;
      let lp = a / (a + b) * 100;
      if (INV.test(k)) lp = 100 - lp;               // menor es mejor -> barra invertida
      filas.push(fila(c.l.dato, c.r.dato, k, lp));
    });
    return filas.length ? filas.join('') : `<div class="hd-cmp-nd">${ES ? 'Sin estadísticas comparables todavía.' : 'No comparable stats yet.'}</div>`;
  }
  function fila(vl, vr, k, lp) {
    const l = Math.max(3, Math.min(97, lp));
    return `<div class="hd-cmp-row">
      <span class="hd-cmp-v l">${esc(vl)}</span>
      <div class="hd-cmp-mid"><span class="hd-cmp-k">${esc(k)}</span>
        <div class="hd-cmp-bar"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="r" style="width:${(100 - l).toFixed(1)}%"></i></div></div>
      <span class="hd-cmp-v r">${esc(vr)}</span>
    </div>`;
  }

  /* Enfrentamientos directos (si hay datos) */
  function h2h() {
    const s = p.serie; if (!s || (s.local == null && s.visita == null)) return '';
    const jug = (s.local || 0) + (s.visita || 0) + (s.empates || 0);
    return `<div class="hd-h2h"><div class="hd-h2h-t">${ES ? 'Enfrentamientos' : 'Head to head'} ${s.temporada || ''}</div>
      <div class="hd-h2h-row">
        <div class="hd-h2h-side l"><img src="${esc(p.local.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-h2h-n">${s.local || 0}</span><span class="hd-h2h-lbl">${ES ? 'Ganados' : 'Won'}</span></div>
        <div class="hd-h2h-side m"><span class="hd-h2h-n">${jug}</span><span class="hd-h2h-lbl">${ES ? 'Jugados' : 'Played'}</span></div>
        <div class="hd-h2h-side r"><img src="${esc(p.visita.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-h2h-n">${s.visita || 0}</span><span class="hd-h2h-lbl">${ES ? 'Ganados' : 'Won'}</span></div>
      </div>
      ${s.ultimo ? `<div class="hd-h2h-last">${ES ? 'Último' : 'Last'}: ${esc(s.ultimo)}</div>` : ''}</div>`;
  }

  let analista = '';
  if (p.analista) {
    const a = p.analista, bl = !!opciones.bloquear;
    analista = `<div class="hd-analista ${bl ? 'bloqueado' : ''}">
      <div class="hd-an-t">${IC.estrella} ${t('analista.titulo')}</div>
      <div class="hd-an-v"><span>${esc(Lg(a.veredicto))}</span><b>${a.probabilidad}%</b></div>
      <div class="hd-an-txt">${esc(Lg(a.texto))}</div>
      ${bl ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}</div>`;
  }

  const tabs = (ES
    ? ['Resumen', 'Comparación', 'Equipos', 'Estadísticas', 'Enfrentamientos', 'Noticias']
    : ['Overview', 'Comparison', 'Teams', 'Stats', 'Head to head', 'News'])
    .map((tb, i) => `<div class="hd-tab ${i === 1 ? 'on' : ''}">${esc(tb)}</div>`).join('');

  const venueSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

  return `
  <div class="hd" data-liga="${esc(p.ligaId)}">
    <div class="hd-hd">
      ${headTeam(p.local, 'l')}
      <div class="hd-hd-c">
        <div class="hd-hd-day">${esc(Lg(p.inicio))}</div>
        ${p.sede ? `<div class="hd-hd-venue">${venueSVG} ${esc(Lg(p.sede))}</div>` : ''}
      </div>
      ${headTeam(p.visita, 'r')}
    </div>
    <div class="hd-tabs">${tabs}</div>
    <div class="hd-body">
      <aside class="hd-col l">${pitcher('local')}${batters('local')}${form('local')}</aside>
      <section class="hd-center">
        <div class="hd-c-head"><img src="${esc(p.local.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-c-title">${ES ? 'Comparación de equipos' : 'Team comparison'}</span><img src="${esc(p.visita.logo || '')}" onerror="this.style.visibility='hidden'"></div>
        <div class="hd-donuts">
          <div class="hd-donut l">${donut(m.local || 0, 'l')}<span>${esc(p.local.abrev)}</span></div>
          ${tieneEmpate ? `<div class="hd-conf"><div class="hd-h2h-n" style="color:#fff;font-size:16px">${m.empate}%</div><span class="hd-h2h-lbl">${t('prob.empate')}</span></div>` : `<div class="hd-conf">${badge}</div>`}
          <div class="hd-donut r">${donut(m.visita || 0, 'r')}<span>${esc(p.visita.abrev)}</span></div>
        </div>
        <div class="hd-cmp">${comparacion()}</div>
        ${h2h()}
        ${analista}
      </section>
      <aside class="hd-col r">${pitcher('visita')}${batters('visita')}${form('visita')}</aside>
    </div>
  </div>`;
}
