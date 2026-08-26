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

/* ---- Detalle de un partido: DASHBOARD horizontal de estadísticas ---- */

/* Silueta humana (SVG) para las fichas de jugador */
function silueta(cls) {
  return `<svg class="fig ${cls}" viewBox="0 0 120 250" aria-hidden="true">
    <circle cx="60" cy="30" r="20"/>
    <path d="M60 52c-13 0-22 6-25 17l-9 46c-2 9 11 12 14 3l7-30 2 1-2 44-9 66c-2 10 13 13 16 3l9-58 9 58c3 10 18 7 16-3l-9-66-2-44 2-1 7 30c3 9 16 6 14-3l-9-46c-3-11-12-17-25-17z"/>
  </svg>`;
}

/* Convierte un valor tipo ".322", "38", "3.12", "14-6" a número comparable */
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

  // ---------- Confianza ----------
  const confMap = {
    'alta':     { en: 'High confidence', es: 'Confianza alta', c: 'alta' },
    'media':    { en: 'Medium confidence', es: 'Confianza media', c: 'media' },
    'baja':     { en: 'Low confidence', es: 'Confianza baja', c: 'baja' },
    'muy baja': { en: 'Very low confidence', es: 'Confianza muy baja', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const badge = cf ? `<span class="conf ${cf.c}">${ES ? cf.es : cf.en}</span>` : '';
  const factoresTxt = p.factores ? `<div class="dash-factores">${esc(Lg(p.factores))}</div>` : '';

  // ---------- Donut de probabilidad ----------
  function donut(pct, cls) {
    const r = 34, c = 2 * Math.PI * r;
    const dash = (c * (pct || 0) / 100).toFixed(2);
    return `<svg class="pd ${cls}" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/>
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${dash} ${(c - dash).toFixed(2)}" transform="rotate(-90 42 42)"/>
      <text x="42" y="48" text-anchor="middle" class="pd-t">${pct || 0}%</text>
    </svg>`;
  }

  // ---------- Mano del abridor ----------
  const manoTxt = (mn) => mn === 'L' ? t('det.lhp') : (mn === 'R' ? t('det.rhp') : '');

  // ---------- Ficha de jugador (silueta + barras de sus stats) ----------
  function jugadorDestacado(lado) {
    const arr = (p.jugadores && p.jugadores[lado]) || [];
    if (!arr.length) return null;
    const nombre = arr[0].nombre, pos = arr[0].pos;
    const stats = arr.filter(j => j.nombre === nombre).map(j => ({ k: j.etiqueta, v: j.dato }));
    if (stats.length < 2) arr.slice(0, 4).forEach(j => { if (!stats.find(s => s.k === j.etiqueta)) stats.push({ k: j.etiqueta, v: j.dato }); });
    return { nombre, pos, stats: stats.slice(0, 5) };
  }
  function fichaJugador(lado, eq) {
    const j = jugadorDestacado(lado);
    const color = lado === 'local' ? 'local' : 'visita';
    if (!j) return `<div class="cj-fig ${color}">${silueta(color)}<div class="cj-nd">${t('det.nodata')}</div></div>`;
    // normaliza barras al máximo de sus propias stats para dar relieve visual
    const nums = j.stats.map(s => numDe(s.v)).filter(n => n != null);
    const max = nums.length ? Math.max(...nums) : 1;
    const barras = j.stats.map(s => {
      const n = numDe(s.v); const w = n != null && max > 0 ? Math.max(12, Math.round(n / max * 100)) : 40;
      return `<div class="cjs-row"><span class="cjs-k">${esc(s.k)}</span><div class="cjs-bar"><i style="width:${w}%"></i></div><span class="cjs-v">${esc(s.v)}</span></div>`;
    }).join('');
    return `<div class="cj-fig ${color}">
      <div class="cj-head"><b>${esc(j.nombre)}</b><span>${esc(j.pos || '')}</span></div>
      <div class="cj-body">${silueta(color)}<div class="cj-stats">${barras}</div></div>
    </div>`;
  }

  // ---------- Comparación por categorías comunes (barras enfrentadas reales) ----------
  function comparativaJugadores() {
    const cats = {};
    ((p.jugadores && p.jugadores.local) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).l = j; });
    ((p.jugadores && p.jugadores.visita) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).r = j; });
    const filas = Object.keys(cats).map(k => {
      const c = cats[k]; if (!c.l || !c.r) return '';
      const a = numDe(c.l.dato), b = numDe(c.r.dato);
      if (a == null || b == null || (a + b) === 0) return '';
      const lp = a / (a + b) * 100;
      return `<div class="cmpj-row">
        <span class="cmpj-l"><b>${esc(c.l.dato)}</b><small>${esc(c.l.nombre)}</small></span>
        <div class="cmpj-mid"><div class="cmpj-bar"><i class="bl" style="width:${lp.toFixed(1)}%"></i><i class="br" style="width:${(100-lp).toFixed(1)}%"></i></div><span class="cmpj-k">${esc(k)}</span></div>
        <span class="cmpj-r"><b>${esc(c.r.dato)}</b><small>${esc(c.r.nombre)}</small></span>
      </div>`;
    }).filter(Boolean).join('');
    return filas;
  }

  // ---------- Abridores (béisbol) ----------
  function abridorBloque() {
    const A = p.local.abridor, B = p.visita.abridor;
    if (!(A && A.nombre) && !(B && B.nombre)) return '';
    const card = (lado, a, eq) => {
      if (!a || !a.nombre) return `<div class="abx ${lado} sin">${escudoMini(eq)}<span class="abx-nd">${t('det.sinabridor')}</span></div>`;
      const cls = a.mano === 'L' ? 'lhp' : (a.mano === 'R' ? 'rhp' : '');
      const mano = a.mano ? `<span class="abx-mano ${cls}">${manoTxt(a.mano)}</span>` : '';
      const st = [a.era ? `<span><b>${esc(a.era)}</b> ERA</span>` : '', a.wl ? `<span><b>${esc(a.wl)}</b> W-L</span>` : ''].filter(Boolean).join('');
      return `<div class="abx ${lado}">
        <div class="abx-top">${escudoMini(eq)}<span class="abx-eq">${esc(eq.abrev)}</span>${mano}</div>
        <div class="abx-nom">${esc(a.nombre)}</div>
        <div class="abx-st">${st}</div>
      </div>`;
    };
    // gráfica comparativa ERA / récord
    let graf = '';
    if (A && B) {
      const rows = [];
      const e1 = numDe(A.era), e2 = numDe(B.era);
      if (e1 != null && e2 != null && e1 + e2 > 0) rows.push({ k: 'ERA', l: A.era, r: B.era, lp: e2 / (e1 + e2) * 100 });
      const pw = (r) => { const mm = String(r || '').match(/(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], ll = +mm[2]; return (w + ll) ? w / (w + ll) : null; };
      const w1 = pw(A.wl), w2 = pw(B.wl);
      if (w1 != null && w2 != null && w1 + w2 > 0) rows.push({ k: ES ? 'Récord' : 'Record', l: A.wl, r: B.wl, lp: w1 / (w1 + w2) * 100 });
      if (rows.length) graf = `<div class="abx-graf">${rows.map(r => `
        <div class="abg-row"><span>${esc(r.l)}</span><div class="abg-bar"><i class="bl" style="width:${r.lp.toFixed(1)}%"></i><i class="br" style="width:${(100 - r.lp).toFixed(1)}%"></i><em>${esc(r.k)}</em></div><span class="r">${esc(r.r)}</span></div>`).join('')}</div>`;
    }
    return `<div class="dash-card">
      <div class="dc-t">${t('det.abridores')}</div>
      <div class="abx-duo">${card('local', A, p.local)}<span class="abx-vs">VS</span>${card('visita', B, p.visita)}</div>
      ${graf}
    </div>`;
  }

  // ---------- Lesionados ----------
  function lesionadosBloque() {
    const has = p.lesionados && (p.lesionados.local.length || p.lesionados.visita.length);
    if (!has) return '';
    const col = (lado, eq) => {
      const arr = (p.lesionados && p.lesionados[lado]) || [];
      const items = arr.length ? arr.slice(0, 6).map(x => `<div class="lx-row"><span>${esc(x.nombre)} ${x.pos ? `<em>${esc(x.pos)}</em>` : ''}</span><b>${esc(x.estado)}</b></div>`).join('') : `<div class="lx-ok">${t('det.sinlesiones')}</div>`;
      return `<div class="lx-col"><div class="lx-cab">${escudoMini(eq)}${esc(eq.abrev)}</div>${items}</div>`;
    };
    return `<div class="dash-card">
      <div class="dc-t alert">${IC.alerta || ''} ${t('det.lesionados')}</div>
      <div class="lx-duo">${col('local', p.local)}${col('visita', p.visita)}</div>
    </div>`;
  }

  // ---------- Datos del club ----------
  function clubBloque() {
    const has = p.infoEquipos && (p.infoEquipos.local || p.infoEquipos.visita);
    if (!has) return '';
    const col = (lado, eq) => {
      const info = p.infoEquipos && p.infoEquipos[lado]; if (!info) return '';
      const rows = [];
      if (info.fundado) rows.push(`<div class="fx-row"><span>${t('det.fundado')}</span><b>${info.fundado}</b></div>`);
      if (info.estadio) rows.push(`<div class="fx-row"><span>${t('det.estadio')}</span><b>${esc(info.estadio)}</b></div>`);
      if (info.capacidad) rows.push(`<div class="fx-row"><span>${t('det.capacidad')}</span><b>${info.capacidad.toLocaleString()}</b></div>`);
      if (!rows.length) return '';
      return `<div class="fx-col"><div class="fx-cab">${esc(eq.abrev)}</div>${rows.join('')}</div>`;
    };
    const inner = col('local', p.local) + col('visita', p.visita);
    if (!inner.trim()) return '';
    return `<div class="dash-card"><div class="dc-t">${t('det.franquicia')}</div><div class="fx-duo">${inner}</div></div>`;
  }

  // ---------- Analista ----------
  let analistaBloque = '';
  if (p.analista) {
    const a = p.analista, bloqueado = !!opciones.bloquear;
    analistaBloque = `<div class="dash-card analista ${bloqueado ? 'bloqueado' : ''}">
      <div class="dc-t">${IC.estrella} ${t('analista.titulo')} <span class="an-autor">${esc(Lg(a.autor) || '')}</span></div>
      <div class="an-ver"><span class="fav">${esc(Lg(a.veredicto))}</span><span class="pct">${a.probabilidad}%</span></div>
      <div class="an-med"><i style="width:${a.probabilidad}%"></i></div>
      <div class="an-txt">${esc(Lg(a.texto))}</div>
      ${bloqueado ? `<div class="candado">${IC.candado} ${t('analista.candado')}</div>` : ''}
    </div>`;
  }

  // ---------- Chips info (hora, cuenta atrás, sede) ----------
  let chips = '';
  {
    const partes = [];
    if (p.cuando) {
      const d = new Date(p.cuando);
      if (!isNaN(d)) {
        const hora = d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
        partes.push(`<span class="chip"><i>${t('det.horario')}</i>${esc(hora)}</span>`);
        if (p.estado === 'proximo') partes.push(`<span class="chip"><i>${t('det.faltan')}</i><span class="cuenta" data-cuando="${esc(p.cuando)}">—</span></span>`);
      }
    }
    if (p.sede) partes.push(`<span class="chip"><i>${t('det.sede')}</i>${L(p.sede)}</span>`);
    if (partes.length) chips = `<div class="dash-chips">${partes.join('')}</div>`;
  }

  const cmpJug = comparativaJugadores();
  const compartirBtn = `<button class="dash-share" data-compartir="${esc(p.id)}">${IC.compartir} ${t('compartir')}</button>`;
  const favLocal = (m.local || 0) >= (m.visita || 0);

  return `
  <div class="dash">
    <div class="dash-top">
      <div class="dt-team local">${escudoMini(p.local)}<div class="dt-info"><b>${esc(p.local.nombre)}</b><span>${esc(p.local.record || '')}</span></div></div>
      <div class="dash-prob">
        <div class="dp-col ${favLocal ? 'fav' : ''}"><span class="dp-c">${donut(m.local || 0, 'oro')}</span><span class="dp-lb">${esc(p.local.abrev)}</span></div>
        ${tieneEmpate ? `<div class="dp-col draw"><span class="dp-e">${m.empate}%</span><span class="dp-lb">${t('prob.empate')}</span></div>` : `<div class="dp-vs">${badge}</div>`}
        <div class="dp-col ${!favLocal ? 'fav' : ''}"><span class="dp-c">${donut(m.visita || 0, 'azul')}</span><span class="dp-lb">${esc(p.visita.abrev)}</span></div>
      </div>
      <div class="dt-team visita"><div class="dt-info r"><b>${esc(p.visita.nombre)}</b><span>${esc(p.visita.record || '')}</span></div>${escudoMini(p.visita)}</div>
    </div>

    ${chips}
    ${factoresTxt}

    <div class="dash-mid">
      <div class="dash-comparador">
        <div class="dc-t center">${t('det.compjug') || (ES ? 'Comparación de jugadores' : 'Player comparison')}</div>
        <div class="cj-wrap">
          ${fichaJugador('local', p.local)}
          <div class="cj-center">
            ${cmpJug || `<div class="cj-nd">${ES ? 'Sin estadísticas de jugadores para este partido todavía.' : 'No player stats for this match yet.'}</div>`}
          </div>
          ${fichaJugador('visita', p.visita)}
        </div>
      </div>
    </div>

    <div class="dash-grid">
      ${abridorBloque()}
      ${lesionadosBloque()}
      ${clubBloque()}
      ${analistaBloque}
    </div>

    <div class="dash-foot">${compartirBtn}</div>
  </div>`;
}
