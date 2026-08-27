/* ============================================================
   PLAYER TRACKER — seguimiento individual: cómo le ha ido al
   jugador en sus ÚLTIMOS 10 PARTIDOS respecto a la jugada clave.
   · MLB    -> hits por partido (línea ≥1)
   · Soccer -> goles por partido (línea ≥1)
   · NBA    -> puntos por partido (línea 20)
   Historial real por deporte; si no hay id o falla la red, sintetiza
   una trayectoria de demostración. Premium.
   ============================================================ */
import { idiomaActual } from './idioma.js';

const ES = () => idiomaActual() === 'es';
const L = (en, es) => (ES() ? es : en);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

/* Config por deporte: nombre del stat, línea de "acierto", texto de la línea. */
const CFG = {
  mlb:    { stat: () => L('Hits', 'Hits'),   umbral: 1,  hit: (v) => v >= 1,  linea: () => L('Hit line (1+)', 'Línea de hit (1+)'),   logro: () => L('games with a hit', 'partidos con hit') },
  soccer: { stat: () => L('Goals', 'Goles'), umbral: 1,  hit: (v) => v >= 1,  linea: () => L('Goal line (1+)', 'Línea de gol (1+)'),  logro: () => L('games scoring', 'partidos con gol') },
  nba:    { stat: () => L('Points', 'Puntos'), umbral: 20, hit: (v) => v >= 20, linea: () => L('20-point line', 'Línea de 20 pts'),    logro: () => L('games with 20+', 'partidos con 20+') },
};

async function pedir(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ---- Historial real (últimos 10) ---- */
async function logMLB(id, season) {
  const d = await pedir(`https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=gameLog&group=hitting&season=${season}`);
  const splits = d?.stats?.[0]?.splits || [];
  return splits.slice(-10).map(s => num(s.stat?.hits) || 0);
}
async function logESPN(sport, id, campo) {
  const d = await pedir(`https://site.web.api.espn.com/apis/common/v3/sports/${sport}/athletes/${id}/gamelog`);
  const filas = [];
  (d?.seasonTypes || []).forEach(stp => (stp.categories || []).forEach(cat => (cat.events || []).forEach(ev => filas.push(ev))));
  const labels = d?.names || d?.labels || [];
  const idx = labels.findIndex(l => new RegExp(campo, 'i').test(l));
  const out = [];
  filas.slice(0, 10).forEach(ev => { const st = ev.stats || []; const v = idx >= 0 ? num(st[idx]) : null; out.push(v == null ? 0 : v); });
  return out;
}

/* ---- Trayectoria sintética (demo) a partir de la prob/proyección ---- */
function sintetizar(sport, jugador) {
  const rng = mulberry32((hash(jugador.nombre || 'x') ^ 0x9e37) >>> 0);
  const out = [];
  if (sport === 'nba') {
    const mu = num(jugador.proj) || 22, sg = Math.max(4, 0.38 * mu);
    for (let i = 0; i < 10; i++) out.push(Math.max(2, Math.round(mu + (rng() * 2 - 1) * sg * 1.1)));
  } else {
    const p = clamp((num(jugador.prob) || 40) / 100, 0.05, 0.95);
    const lam = -Math.log(1 - p);
    for (let i = 0; i < 10; i++) out.push(poisson(lam, rng));
  }
  return out;
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function poisson(lam, rng) { const Lm = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rng(); } while (p > Lm); return k - 1; }

/* ---- Estilos ---- */
let _css = false;
function inyectarCSS() {
  if (_css) return; _css = true;
  const st = document.createElement('style'); st.id = 'trk-css';
  st.textContent = `
  .trk-bg{position:fixed;inset:0;z-index:120;background:rgba(3,6,11,.74);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;transition:opacity .18s}
  .trk-bg.on{opacity:1}
  .trk{width:100%;max-width:580px;max-height:92vh;overflow:auto;border:1px solid rgba(232,196,106,.22);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);transform:translateY(10px);transition:transform .18s;
    background:linear-gradient(180deg,rgba(18,26,38,.96),rgba(11,17,25,.98)),url('assets/imagenes/textura-tarjeta.jpg') center/cover}
  .trk-bg.on .trk{transform:none}
  .trk-hd{position:relative;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,rgba(232,196,106,.14),rgba(240,53,58,.08))}
  .trk-eq{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#cdb98a}
  .trk-nm{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:23px;color:#fff;margin-top:3px}
  .trk-sub{font-size:12px;color:#98a4b4;margin-top:4px}
  .trk-x{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.3);color:#cdd6e2;cursor:pointer;font-size:18px;line-height:1;display:grid;place-items:center}
  .trk-x:hover{color:#fff;border-color:rgba(255,255,255,.3)}
  .trk-bd{padding:20px 22px 24px}
  .trk-sum{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
  .trk-kpi{flex:1;min-width:120px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px}
  .trk-kpi .k{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5c6879;font-weight:700}
  .trk-kpi .v{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:26px;margin-top:3px;background:linear-gradient(180deg,#f8e7ad,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .trk-kpi .v small{font-size:14px;color:#98a4b4;font-weight:700;-webkit-text-fill-color:#98a4b4}
  .trk-legend{display:flex;gap:16px;align-items:center;margin:16px 0 6px;font-size:11.5px;color:#98a4b4}
  .trk-legend span{display:inline-flex;align-items:center;gap:6px}
  .trk-dot{width:11px;height:11px;border-radius:3px;display:inline-block}
  .trk-dot.hit{background:linear-gradient(180deg,#f6e2a6,#d4a53f)}
  .trk-dot.miss{background:#3a4657}
  .trk-dot.line{width:14px;height:0;border-top:2px dashed #f4494e;border-radius:0}
  .trk-chart{position:relative;height:158px;display:flex;align-items:flex-end;gap:6px;padding:16px 0 6px}
  .trk-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:5px}
  .trk-bar{width:100%;max-width:28px;border-radius:5px 5px 0 0;min-height:3px;transition:height .5s cubic-bezier(.2,.7,.2,1)}
  .trk-bar.hit{background:linear-gradient(180deg,#f6e2a6,#d4a53f);box-shadow:0 0 10px rgba(232,196,106,.35)}
  .trk-bar.miss{background:linear-gradient(180deg,#3a4657,#2a3444)}
  .trk-val{font-family:"Chakra Petch",sans-serif;font-size:11px;font-weight:700;color:#c7d2de}
  .trk-line{position:absolute;left:0;right:0;border-top:2px dashed rgba(244,73,78,.6);pointer-events:none;z-index:2}
  .trk-line span{position:absolute;left:0;top:-9px;font-size:9.5px;font-weight:800;color:#f6a7aa;background:rgba(13,19,29,.9);padding:1px 6px;border-radius:4px;letter-spacing:.04em}
  .trk-axis{display:flex;gap:6px;border-top:1px solid rgba(255,255,255,.1);padding-top:7px}
  .trk-axis .g{flex:1;text-align:center;font-size:9px;color:#5c6879;font-weight:600}
  .trk-note{margin-top:16px;font-size:13px;color:#98a4b4;line-height:1.55}
  .trk-note b{color:#e8c46a}
  .trk-demo{display:inline-block;margin-top:12px;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#98a4b4;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:3px 8px}
  `;
  document.head.appendChild(st);
}

function chartHTML(vals, cfg) {
  const max = Math.max(cfg.umbral, ...vals, 1) * 1.15;
  const zonaTop = 16, alto = 158, base = 6;   // coincide con CSS .trk-chart
  const util = alto - zonaTop - base;
  const yUmbral = zonaTop + (1 - cfg.umbral / max) * util;
  const cols = vals.map((v) => {
    const h = Math.round((v / max) * 100);
    return `<div class="trk-col"><span class="trk-val">${v}</span>
      <div class="trk-bar ${cfg.hit(v) ? 'hit' : 'miss'}" style="height:0" data-h="${h}"></div></div>`;
  }).join('');
  const axis = vals.map((_, i) => `<div class="g">${i === vals.length - 1 ? L('Last', 'Últ.') : '−' + (vals.length - 1 - i)}</div>`).join('');
  return `<div class="trk-chart">
      <div class="trk-line" style="top:${yUmbral}px"><span>${esc(cfg.linea())}</span></div>${cols}
    </div><div class="trk-axis">${axis}</div>`;
}

export async function abrirTracker(jugador, sport) {
  inyectarCSS();
  const cfg = CFG[sport] || CFG.mlb;
  const bg = document.createElement('div'); bg.className = 'trk-bg';
  bg.innerHTML = `<div class="trk" role="dialog" aria-modal="true">
    <div class="trk-hd"><button class="trk-x" aria-label="Close">×</button>
      <div class="trk-eq">${esc(jugador.equipoAbrev || '')} ${jugador.rivalAbrev ? '· ' + L('vs', 'vs') + ' ' + esc(jugador.rivalAbrev) : ''}</div>
      <div class="trk-nm">${esc(jugador.nombre || '')}</div>
      <div class="trk-sub">${L('Last 10 games', 'Últimos 10 partidos')} · ${esc(cfg.stat())}</div>
    </div>
    <div class="trk-bd"><div id="trk-inner">${L('Loading last 10 games…', 'Cargando últimos 10 partidos…')}</div></div>
  </div>`;
  document.body.appendChild(bg);
  requestAnimationFrame(() => bg.classList.add('on'));
  const cerrar = () => { bg.classList.remove('on'); setTimeout(() => bg.remove(), 180); };
  bg.querySelector('.trk-x').onclick = cerrar;
  bg.addEventListener('click', e => { if (e.target === bg) cerrar(); });
  document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', onEsc); } });

  let vals = null, demo = false;
  const season = new Date().getFullYear();
  try {
    if (jugador.id && sport === 'mlb') vals = await logMLB(jugador.id, season);
    else if (jugador.id && sport === 'nba') vals = await logESPN('basketball/nba', jugador.id, 'points|pts');
    else if (jugador.id && sport === 'soccer') vals = await logESPN('soccer', jugador.id, 'goals|goal');
  } catch (_) { vals = null; }
  if (!vals || !vals.length || (sport !== 'mlb' && vals.every(v => v === 0))) { vals = sintetizar(sport, jugador); demo = true; }
  vals = vals.slice(-10);

  const aciertos = vals.filter(v => cfg.hit(v)).length;
  const prom = (vals.reduce((a, b) => a + b, 0) / vals.length);
  const ult3 = vals.slice(-3).filter(v => cfg.hit(v)).length;
  const tendencia = ult3 >= 2 ? L('Trending up', 'En alza') : ult3 === 0 ? L('Cooling off', 'A la baja') : L('Steady', 'Estable');

  bg.querySelector('#trk-inner').innerHTML = `
    <div class="trk-sum">
      <div class="trk-kpi"><div class="k">${L('Hit rate (10)', 'Acierto (10)')}</div><div class="v">${aciertos}<small>/10</small></div></div>
      <div class="trk-kpi"><div class="k">${cfg.stat()} · ${L('avg', 'prom')}</div><div class="v">${prom.toFixed(1)}</div></div>
      <div class="trk-kpi"><div class="k">${L('Last 3', 'Últimos 3')}</div><div class="v">${ult3}<small>/3</small></div></div>
    </div>
    <div class="trk-legend">
      <span><i class="trk-dot hit"></i>${L('Hit the line', 'Acertó la línea')}</span>
      <span><i class="trk-dot miss"></i>${L('Missed', 'No acertó')}</span>
      <span><i class="trk-dot line"></i>${esc(cfg.linea())}</span>
    </div>
    ${chartHTML(vals, cfg)}
    <div class="trk-note"><b>${aciertos}/10</b> ${cfg.logro()}. ${L('Trend', 'Tendencia')}: <b>${tendencia}</b>.${demo ? `<br><span class="trk-demo">${L('Demo trajectory', 'Trayectoria de demostración')}</span>` : ''}</div>`;
  requestAnimationFrame(() => bg.querySelectorAll('.trk-bar').forEach(b => { b.style.height = b.dataset.h + '%'; }));
}
