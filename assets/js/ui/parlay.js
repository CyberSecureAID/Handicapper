/* ============================================================
   VISTA PROYECCIONES (premium) — multideporte.
   · MLB  → Hit Projection   (P ≥1 hit)   motor mlb-parlay.js
   · Soccer → Goal Projection (P ≥1 gol)  motor soccer-goal.js
   · NBA  → Points Projection (en preparación)
   Datos directos del navegador (CORS abierto). Sin proxy ni worker.
   Estética rojo/azul, banner con imágenes de fondo, bilingüe (inglés por defecto).
   ============================================================ */
import { topParlayHits } from '../analisis/mlb-parlay.js';
import { topGoalProjection } from '../analisis/soccer-goal.js';
import { topPointsProjection } from '../analisis/nba-points.js';
import { idiomaActual } from './idioma.js';

const ES = () => idiomaActual() === 'es';
const L = (en, es) => (ES() ? es : en);
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const confLabel = (c) => ES() ? c : ({ alta: 'High', media: 'Medium', baja: 'Low' }[c] || c);

/* ---------- Demostraciones (fallback mientras no hay datos en vivo) ---------- */
const DEMO_MLB = [
  { rank:1, nombre:'CJ Abrams', equipoAbrev:'WSH', rivalAbrev:'COL', prob:79, confianza:'media',
    tags:['RHP','Gabriel Hughes · 6.54', () => L('Slot 1','Turno 1')],
    factores:['Opponent with 6.54 ERA, very hittable','Top of the order','LHB vs RHP'], riesgos:['Lineup not confirmed'] },
  { rank:2, nombre:'Bobby Witt Jr.', equipoAbrev:'KC', rivalAbrev:'TOR', prob:78, confianza:'media',
    tags:['RHP','Spencer Arrighetti · 4.73', () => L('Slot 2','Turno 2')],
    factores:['Elite contact and speed','Opposing starter 4.73 ERA','Top of the order'], riesgos:['Night game: lineup TBC'] },
  { rank:3, nombre:'Gabriel Moreno', equipoAbrev:'ARI', rivalAbrev:'SF', prob:77, confianza:'media',
    tags:['RHP','Landen Roupp · 4.34', () => L('Slot 5','Turno 5')],
    factores:['.303 AVG (7th in MLB)','Low strikeout rate','Opponent allows contact'], riesgos:['Usually bats 5th–6th'] },
];
const DEMO_SOCCER = [
  { rank:1, nombre:'Elite Striker', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:64, confianza:'media',
    tags:['ST', () => L('vs AWY · 1.8 GA','vs AWY · 1.8 GC'), () => L('22 G','22 G')],
    factores:[L('Opponent concedes 1.80 goals/game','El rival encaja 1.80 goles/partido'), L('Plays at home','Juega en casa'), L('In form: 4 goals in 5','En forma: 4 goles en 5')], riesgos:[L('Lineup not confirmed','Alineación no confirmada')] },
  { rank:2, nombre:'Second Forward', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:41, confianza:'media',
    tags:['FW', () => L('vs OPP · 1.5 GA','vs OPP · 1.5 GC'), () => L('14 G','14 G')],
    factores:[L('Attacking position','Posición de ataque'), L('14 goals this season','14 goles en la temporada')], riesgos:[L('Away from home','Juega de visita')] },
  { rank:3, nombre:'Winger', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:33, confianza:'baja',
    tags:['LW', () => L('vs RVL · 1.3 GA','vs RVL · 1.3 GC'), () => L('9 G','9 G')],
    factores:[L('Takes penalties','Cobra penales'), L('Plays at home','Juega en casa')], riesgos:[L('Solid opposing defense','Defensa rival sólida')] },
];

const DEMO_NBA = [
  { rank:1, nombre:'Elite Scorer', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:84, confianza:'media',
    tags:[() => L('31.2 proj','31.2 proy'), () => L('vs AWY · 119 allowed','vs AWY · 119 permitidos'), '29.5 PPG'],
    factores:[L('Opponent allows 119 pts/game','El rival permite 119 pts/partido'), L('High-pace game','Partido de ritmo alto'), L('Plenty of minutes','Muchos minutos')], riesgos:[L('Lineup not confirmed','Alineación no confirmada')] },
  { rank:2, nombre:'Primary Option', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:69, confianza:'media',
    tags:[() => L('25.8 proj','25.8 proy'), () => L('vs OPP · 114 allowed','vs OPP · 114 permitidos'), '25.0 PPG'],
    factores:[L('Scorer averaging 25.0','Anotador de 25.0 de promedio'), L('Heavy minutes','Muchos minutos')], riesgos:[L('Away from home','Juega de visita')] },
  { rank:3, nombre:'Secondary Scorer', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:55, confianza:'baja',
    tags:[() => L('21.4 proj','21.4 proy'), () => L('vs RVL · 116 allowed','vs RVL · 116 permitidos'), '20.1 PPG'],
    factores:[L('Usage up with a starter out','Más protagonismo por una baja')], riesgos:[L('Rotation/minutes risk','Riesgo de minutos')] },
];

/* ---------- Configuración de vista por deporte ---------- */
function VISTA(sport) {
  const base = {
    mlb: {
      activo: true, source: 'MLB Stats API', run: () => topParlayHits({ fecha: hoyISO(), n: 9 }), demo: DEMO_MLB,
      eyebrow: L('Premium · Hit Projection', 'Premium · Proyección de Hits'),
      titulo: `${L('Top 9 · Probability of', 'Top 9 · Probabilidad de')} <em>≥1 Hit</em>`,
      metric: 'P(≥1 hit)', metricLabel: L('Probability<br>of ≥1 hit', 'Probabilidad<br>de ≥1 hit'),
      lead: L('The nine batters with the highest estimated probability of getting at least one hit today. In-house model on official data: confirmed pitcher, handedness splits, recent form and batting order.',
              'Los nueve bateadores con mayor probabilidad estimada de conectar al menos un imparable hoy. Modelo propio sobre datos oficiales: pitcher confirmado, splits por mano, forma reciente y orden de bateo.'),
      nota: L('Today\u2019s lineups are not posted yet. Showing a demo; the live ranking appears once MLB confirms the lineups.',
              'Los lineups de hoy aún no están publicados. Se muestra una demostración; el ranking en vivo aparece cuando MLB confirma las alineaciones.'),
      foot: L('Model probability estimates, not official data or betting advice. Baseball is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no datos oficiales ni asesoría de apuestas. El béisbol es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.pitcherMano || 'R'}HP`, `${p.pitcher || ''}${p.pitcherEra != null ? ' · ' + (+p.pitcherEra).toFixed(2) : ''}`, `${L('Slot', 'Turno')} ${p.slot || '—'}` ] }),
    },
    soccer: {
      activo: true, source: 'ESPN', run: () => topGoalProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_SOCCER,
      eyebrow: L('Premium · Goal Projection', 'Premium · Proyección de Goles'),
      titulo: `${L('Top 9 · Probability of', 'Top 9 · Probabilidad de')} <em>≥1 Goal</em>`,
      metric: 'P(≥1 goal)', metricLabel: L('Probability<br>of ≥1 goal', 'Probabilidad<br>de ≥1 gol'),
      lead: L('The nine players with the highest estimated probability of scoring at least one goal today (anytime goalscorer). In-house Poisson model: opponent defense, recent form, home/away and expected minutes.',
              'Los nueve jugadores con mayor probabilidad estimada de anotar al menos un gol hoy (anytime goalscorer). Modelo propio de Poisson: defensa rival, forma reciente, local/visita y minutos previstos.'),
      nota: L('Soccer lineups confirm about an hour before kickoff. Until then, minutes are projected. Showing a demo if no live data is available.',
              'Las alineaciones de fútbol se confirman ~1 hora antes. Hasta entonces, los minutos son proyectados. Se muestra una demostración si no hay datos en vivo.'),
      foot: L('Model probability estimates, not official data or betting advice. Football is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no datos oficiales ni asesoría de apuestas. El fútbol es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ p.pos || 'FW', (p.gaRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.gaRival).toFixed(2)} ${L('GA', 'GC')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.goles != null ? `${p.goles} G` : '') ].filter(Boolean) }),
    },
    nba: {
      activo: true, source: 'ESPN', run: () => topPointsProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NBA,
      eyebrow: L('Premium · Points Projection', 'Premium · Proyección de Puntos'),
      titulo: `${L('Top 9 · Probability of', 'Top 9 · Probabilidad de')} <em>20+ ${L('Points', 'Puntos')}</em>`,
      metric: 'P(20+ pts)', metricLabel: L('Probability<br>of 20+ pts', 'Probabilidad<br>de 20+ pts'),
      lead: L('The nine players with the highest estimated probability of scoring 20 or more points today. In-house model: projected points from opponent defense, pace, home/away, minutes and recent form.',
              'Los nueve jugadores con mayor probabilidad estimada de anotar 20 o más puntos hoy. Modelo propio: puntos proyectados a partir de defensa rival, ritmo, local/visita, minutos y forma reciente.'),
      nota: L('NBA lineups and minutes finalize close to tip-off. Until then, minutes are projected. Showing a demo if no live data is available.',
              'Las alineaciones y minutos de la NBA se definen cerca del salto inicial. Hasta entonces, los minutos son proyectados. Se muestra una demostración si no hay datos en vivo.'),
      foot: L('Model probability estimates, not official data or betting advice. Basketball is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no datos oficiales ni asesoría de apuestas. El baloncesto es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.proj} ${L('proj', 'proy')}`, (p.ptsPermRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.ptsPermRival).toFixed(0)} ${L('allowed', 'perm.')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.ppg != null ? `${(+p.ppg).toFixed(1)} PPG` : '') ].filter(Boolean) }),
    },
  };
  return base[sport] || base.mlb;
}

/* ---------- CSS (inyectado una vez) ---------- */
let _css = false;
function inyectarCSS() {
  if (_css) return; _css = true;
  const AZUL = 'assets/imagenes/fondos/azul.jpg', ROJO = 'assets/imagenes/fondos/rojo.jpg';
  const st = document.createElement('style'); st.id = 'parlay-css';
  st.textContent = `
  .ply{--az:#4db4f7;--az2:#1f8fe0;--ro:#f4494e;--ro2:#c62f34;--ok:#41d6a0;--am:#f3b13d;
    --bg:#080b12;--card:#0e141e;--card2:#121a26;--line:rgba(255,255,255,.08);--tx:#eef3f9;--tx2:#98a4b4;--tx3:#5c6879;
    max-width:1120px;margin:0 auto}
  .ply *{box-sizing:border-box}
  .ply-hero{position:relative;border-radius:20px;overflow:hidden;margin-bottom:20px;isolation:isolate;border:1px solid var(--line)}
  .ply-hero-bg{position:absolute;inset:0;z-index:0}
  .ply-hero-bg::before,.ply-hero-bg::after{content:"";position:absolute;inset:0;background-size:cover;background-position:center}
  .ply-hero-bg::before{background-image:url('${AZUL}');clip-path:polygon(0 0,62% 0,42% 100%,0 100%)}
  .ply-hero-bg::after{background-image:url('${ROJO}');clip-path:polygon(62% 0,100% 0,100% 100%,42% 100%)}
  .ply-hero-veil{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(6,9,15,.60),rgba(6,9,15,.84)),radial-gradient(120% 100% at 50% 0,transparent,rgba(6,9,15,.5))}
  .ply-hero-in{position:relative;z-index:2;padding:30px 30px 26px}
  .ply-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;
    font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#dfeaf6;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:6px 13px;background:rgba(0,0,0,.28)}
  .ply-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--az);box-shadow:0 0 10px var(--az)}
  .ply-title{font-family:"Chakra Petch",sans-serif;font-weight:800;letter-spacing:-.01em;line-height:1.04;font-size:clamp(26px,5vw,44px);color:#fff;margin:16px 0 8px;text-shadow:0 2px 20px rgba(0,0,0,.55)}
  .ply-title em{font-style:normal;background:linear-gradient(90deg,var(--az),#bfe0fb);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .ply-lead{color:#cbd4e0;font-size:14.5px;max-width:620px;line-height:1.55;text-shadow:0 1px 12px rgba(0,0,0,.6)}
  .ply-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .ply-meta span{font-size:11.5px;color:#d3dbe6;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:6px 11px;background:rgba(0,0,0,.32)}
  .ply-meta b{color:#fff}
  .ply-note{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(243,177,61,.28);background:rgba(243,177,61,.07);color:#f3cd8a;font-size:13px;line-height:1.5;padding:12px 15px;border-radius:12px;margin-bottom:18px}
  .ply-note b{color:#f7dca7;flex:0 0 auto}
  .ply-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
  .ply-c{position:relative;background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);border-radius:16px;padding:18px 18px 16px;overflow:hidden}
  .ply-c::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--az),transparent 70%);opacity:.65}
  .ply-c.r1::before,.ply-c.r2::before,.ply-c.r3::before{opacity:1;height:4px}
  .ply-c-top{display:flex;align-items:center;gap:12px;margin-bottom:13px}
  .ply-rank{flex:0 0 auto;width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:#0a1017;background:linear-gradient(135deg,var(--az),#8fd0fb);box-shadow:0 4px 14px rgba(31,143,224,.35)}
  .ply-c.r4 .ply-rank,.ply-c.r5 .ply-rank,.ply-c.r6 .ply-rank,.ply-c.r7 .ply-rank,.ply-c.r8 .ply-rank,.ply-c.r9 .ply-rank{background:linear-gradient(135deg,#2a3646,#1a2431);color:#9fb0c2;box-shadow:none;border:1px solid var(--line)}
  .ply-idn{min-width:0;flex:1}
  .ply-nm{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:var(--tx);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ply-mt{font-size:12px;color:var(--tx2);font-weight:600;margin-top:2px}
  .ply-mt b{color:var(--tx)}
  .ply-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:15px}
  .ply-tag{font-size:11px;font-weight:600;color:var(--tx2);border:1px solid var(--line);border-radius:7px;padding:4px 8px;background:rgba(255,255,255,.02);white-space:nowrap}
  .ply-tag.h{color:var(--az);border-color:rgba(77,180,247,.3)}
  .ply-meter{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  .ply-pct{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:40px;line-height:1;color:var(--az)}
  .ply-plab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);font-weight:700;text-align:right;line-height:1.35}
  .ply-track{height:9px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden;margin:2px 0 14px}
  .ply-fill{height:100%;border-radius:6px;width:0;transition:width 1s cubic-bezier(.2,.7,.2,1);background:linear-gradient(90deg,var(--az2),var(--az));box-shadow:0 0 14px rgba(77,180,247,.45)}
  .ply-conf{display:inline-flex;align-items:center;gap:7px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 12px}
  .ply-conf i{width:7px;height:7px;border-radius:50%}
  .ply-conf.alta{color:#8ff0cb;background:rgba(65,214,160,.1);border:1px solid rgba(65,214,160,.3)}.ply-conf.alta i{background:var(--ok)}
  .ply-conf.media{color:#f6d38c;background:rgba(243,177,61,.1);border:1px solid rgba(243,177,61,.3)}.ply-conf.media i{background:var(--am)}
  .ply-conf.baja{color:#f6a7aa;background:rgba(244,73,78,.1);border:1px solid rgba(244,73,78,.3)}.ply-conf.baja i{background:var(--ro)}
  .ply-split{margin-top:14px;padding-top:13px;border-top:1px solid var(--line);display:grid;gap:12px}
  .ply-blk-t{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;margin-bottom:7px}
  .ply-blk.f .ply-blk-t{color:var(--az)}
  .ply-blk.r .ply-blk-t{color:var(--ro)}
  .ply-blk ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .ply-blk li{position:relative;padding-left:16px;font-size:12.5px;color:var(--tx2);line-height:1.4}
  .ply-blk li::before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:2px}
  .ply-blk.f li::before{background:var(--az)}
  .ply-blk.r li::before{background:var(--ro)}
  .ply-foot{color:var(--tx3);font-size:11.5px;line-height:1.6;text-align:center;margin-top:20px;padding:0 10px}
  .ply-lock{position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--line);isolation:isolate}
  .ply-lock-in{position:relative;z-index:2;padding:56px 26px;text-align:center}
  .ply-lock h3{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:clamp(21px,3.6vw,30px);color:#fff;margin:16px 0 10px;text-shadow:0 2px 18px rgba(0,0,0,.55)}
  .ply-lock p{color:#cdd6e2;max-width:440px;margin:0 auto 20px;font-size:14px;line-height:1.55;text-shadow:0 1px 10px rgba(0,0,0,.5)}
  .ply-cta{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;color:#08111c;background:linear-gradient(90deg,var(--az),#9ad4fb);border:0;border-radius:999px;padding:13px 26px;cursor:pointer;text-transform:uppercase;box-shadow:0 6px 20px rgba(31,143,224,.4)}
  .ply-cta:hover{filter:brightness(1.06)}
  @media(max-width:560px){.ply-hero-in{padding:24px 20px 22px}.ply-grid{grid-template-columns:1fr}.ply-pct{font-size:34px}
    .ply-hero-bg::before{clip-path:polygon(0 0,70% 0,52% 100%,0 100%)}.ply-hero-bg::after{clip-path:polygon(70% 0,100% 0,100% 100%,52% 100%)}}
  `;
  document.head.appendChild(st);
}

/* ---------- Render ---------- */
const tagTxt = (t) => (typeof t === 'function' ? t() : t);

function heroHTML(cfg, meta, demo, cargando) {
  const chips = [
    `<span>${L('Date', 'Fecha')} · <b>${esc(meta.fecha)}</b></span>`,
    `<span>${L('Source', 'Fuente')} · <b>${esc(cfg.source)}</b></span>`,
    `<span>${L('Metric', 'Métrica')} · <b>${esc(cfg.metric)}</b></span>`,
    demo ? `<span>${L('Mode', 'Modo')} · <b>${L('Demo', 'Demostración')}</b></span>` : `<span>${L('Candidates', 'Candidatos')} · <b>${meta.candidatosEvaluados || '—'}</b></span>`,
  ].join('');
  return `<div class="ply-hero"><div class="ply-hero-bg"></div><div class="ply-hero-veil"></div>
    <div class="ply-hero-in">
      <span class="ply-eyebrow"><i></i>${cargando ? L('Loading analysis…', 'Cargando análisis…') : esc(cfg.eyebrow)}</span>
      <div class="ply-title">${cfg.titulo}</div>
      <div class="ply-lead">${esc(cfg.lead)}</div>
      <div class="ply-meta">${chips}</div>
    </div></div>`;
}

function comingSoonHTML(cfg) {
  return `<div class="ply"><div class="ply-lock"><div class="ply-hero-bg"></div><div class="ply-hero-veil"></div>
    <div class="ply-lock-in">
      <span class="ply-eyebrow"><i></i>${esc(cfg.eyebrow)}</span>
      <h3>${esc(cfg.titulo)}</h3>
      <p>${L('This projection is on the way. The engine for this sport lands in the next update.', 'Esta proyección está en camino. El motor de este deporte llega en la próxima actualización.')}</p>
    </div></div></div>`;
}

function cardHTML(p, cfg) {
  const tags = (cfg.toCard(p).tags || []).map((t, i) => `<span class="ply-tag${i === 0 ? ' h' : ''}">${esc(tagTxt(t))}</span>`).join('');
  const fav = (p.factores || []).map(f => `<li>${esc(f)}</li>`).join('');
  const rsk = (p.riesgos || []).map(f => `<li>${esc(f)}</li>`).join('');
  return `<article class="ply-c r${p.rank}">
    <div class="ply-c-top"><div class="ply-rank">${p.rank}</div>
      <div class="ply-idn"><div class="ply-nm">${esc(p.nombre)}</div>
        <div class="ply-mt"><b>${esc(p.equipoAbrev || '')}</b> ${L('vs', 'vs')} ${esc(p.rivalAbrev || '')}</div></div></div>
    <div class="ply-tags">${tags}</div>
    <div class="ply-meter"><div class="ply-pct">${p.prob}%</div><div class="ply-plab">${cfg.metricLabel}</div></div>
    <div class="ply-track"><div class="ply-fill" data-w="${p.prob}"></div></div>
    <span class="ply-conf ${p.confianza}"><i></i>${L('Confidence', 'Confianza')} ${esc(confLabel(p.confianza))}</span>
    <div class="ply-split">
      ${fav ? `<div class="ply-blk f"><div class="ply-blk-t">${L('Key factors', 'Factores favorables')}</div><ul>${fav}</ul></div>` : ''}
      ${rsk ? `<div class="ply-blk r"><div class="ply-blk-t">${L('Risks', 'Riesgos')}</div><ul>${rsk}</ul></div>` : ''}
    </div></article>`;
}

function animar(cont) {
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; io.unobserve(e.target); } }), { threshold: .25 });
  cont.querySelectorAll('.ply-fill').forEach(b => io.observe(b));
}

/* ---------- API pública ---------- */
export async function pintarParlay(cont, { sport = 'mlb', esPremium = false, abrirPlanes } = {}) {
  inyectarCSS();
  const cfg = VISTA(sport);

  if (!esPremium) {
    cont.innerHTML = `<div class="ply"><div class="ply-lock"><div class="ply-hero-bg"></div><div class="ply-hero-veil"></div>
      <div class="ply-lock-in">
        <span class="ply-eyebrow"><i></i>${L('Premium', 'Premium')}</span>
        <h3>${esc((cfg.titulo || '').replace(/<[^>]+>/g, ''))}</h3>
        <p>${L('Every day, the players with the highest probability of the key play. In-house model on official data. Premium plan only.', 'Cada día, los jugadores con mayor probabilidad de la jugada clave. Modelo propio sobre datos oficiales. Exclusivo del plan Premium.')}</p>
        <button class="ply-cta" id="ply-cta">${L('See Premium plan', 'Ver plan Premium')}</button>
      </div></div></div>`;
    const b = cont.querySelector('#ply-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }

  if (!cfg.activo) { cont.innerHTML = comingSoonHTML(cfg); return; }

  cont.innerHTML = `<div class="ply">${heroHTML(cfg, { fecha: hoyISO() }, false, true)}</div>`;

  let jugadores = [], meta = { fecha: hoyISO() }, demo = false, nota = '';
  try {
    const r = await cfg.run();
    if (r?.jugadores?.length) { jugadores = r.jugadores; meta = r.meta; }
    else { demo = true; nota = cfg.nota; }
  } catch (_) { demo = true; nota = cfg.nota; }
  if (demo) { jugadores = cfg.demo; meta = { fecha: hoyISO(), candidatosEvaluados: cfg.demo.length }; }

  cont.innerHTML = `<div class="ply">
    ${heroHTML(cfg, meta, demo, false)}
    ${nota ? `<div class="ply-note"><b>${L('Note', 'Nota')}</b><span>${esc(nota)}</span></div>` : ''}
    <div class="ply-grid">${jugadores.map(p => cardHTML(p, cfg)).join('')}</div>
    <div class="ply-foot">${esc(cfg.foot)}</div>
  </div>`;
  animar(cont);
}
