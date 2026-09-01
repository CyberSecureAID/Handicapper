/* ============================================================
   VISTA PROYECCIONES (premium) — multideporte.
   · MLB    → Hit Projection    (P ≥1 hit)   motor mlb-parlay.js
   · Soccer → Goal Projection   (P ≥1 gol)   motor soccer-goal.js
   · NBA    → Points Projection (P 20+ pts)  motor nba-points.js
   Carga instantánea (caché/preliminar al entrar, datos en vivo en 2º plano).
   Fondo propio por sección, textura en tarjetas, acentos en dorado.
   Bilingüe (inglés por defecto). Sin proxy ni worker.
   ============================================================ */
import { topParlayHits, topHomeRuns } from '../analisis/mlb-parlay.js';
import { topGoalProjection } from '../analisis/soccer-goal.js';
import { topPointsProjection } from '../analisis/nba-points.js';
import { topShotsProjection } from '../analisis/nhl-shots.js';
import { abrirTracker } from './tracker.js';
import { idiomaActual } from './idioma.js';

const ES = () => idiomaActual() === 'es';
const L = (en, es) => (ES() ? es : en);
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const confLabel = (c) => ES() ? c : ({ alta: 'High', media: 'Medium', baja: 'Low' }[c] || c);
const TEXTURA = 'assets/imagenes/textura-tarjeta.jpg';

/* Caché por deporte para render instantáneo y para no recargar al cambiar idioma */
const CACHE = new Map();   // sport -> { jugadores, meta, ts }

/* ---------- Demostraciones (preliminar mientras llegan datos en vivo) ---------- */
const DEMO_MLB = [
  { rank:1, nombre:'CJ Abrams', equipoAbrev:'WSH', rivalAbrev:'COL', prob:79, confianza:'media',
    tags:['RHP','Gabriel Hughes · 6.54', () => L('Slot 1','Turno 1')],
    factores:['Opponent 6.54 ERA, very hittable','Top of the order','LHB vs RHP'], riesgos:['Lineup not confirmed'] },
  { rank:2, nombre:'Bobby Witt Jr.', equipoAbrev:'KC', rivalAbrev:'TOR', prob:78, confianza:'media',
    tags:['RHP','Spencer Arrighetti · 4.73', () => L('Slot 2','Turno 2')],
    factores:['Elite contact and speed','Starter 4.73 ERA','Top of the order'], riesgos:['Night game: lineup TBC'] },
  { rank:3, nombre:'Gabriel Moreno', equipoAbrev:'ARI', rivalAbrev:'SF', prob:77, confianza:'media',
    tags:['RHP','Landen Roupp · 4.34', () => L('Slot 5','Turno 5')],
    factores:['.303 AVG (7th in MLB)','Low strikeout rate','Opponent allows contact'], riesgos:['Usually bats 5th–6th'] },
];
const DEMO_SOCCER = [
  { rank:1, nombre:'Elite Striker', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:64, confianza:'media',
    tags:['ST', () => L('vs AWY · 1.8 GA','vs AWY · 1.8 GC'), '22 G'],
    factores:[L('Opponent concedes 1.80 goals/game','El rival encaja 1.80 goles/partido'), L('Plays at home','Juega en casa'), L('In form: 4 goals in 5','En forma: 4 goles en 5')], riesgos:[L('Lineup not confirmed','Alineación no confirmada')] },
  { rank:2, nombre:'Second Forward', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:41, confianza:'media',
    tags:['FW', () => L('vs OPP · 1.5 GA','vs OPP · 1.5 GC'), '14 G'],
    factores:[L('Attacking position','Posición de ataque'), L('14 goals this season','14 goles en la temporada')], riesgos:[L('Away from home','Juega de visita')] },
  { rank:3, nombre:'Winger', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:33, confianza:'baja',
    tags:['LW', () => L('vs RVL · 1.3 GA','vs RVL · 1.3 GC'), '9 G'],
    factores:[L('Takes penalties','Cobra penales'), L('Plays at home','Juega en casa')], riesgos:[L('Solid opposing defense','Defensa rival sólida')] },
];
const DEMO_NBA = [
  { rank:1, nombre:'Elite Scorer', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:84, confianza:'media',
    tags:[() => L('31.2 proj','31.2 proy'), () => L('vs AWY · 119 allowed','vs AWY · 119 perm.'), '29.5 PPG'],
    factores:[L('Opponent allows 119 pts/game','El rival permite 119 pts/partido'), L('High-pace game','Partido de ritmo alto'), L('Plenty of minutes','Muchos minutos')], riesgos:[L('Lineup not confirmed','Alineación no confirmada')] },
  { rank:2, nombre:'Primary Option', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:69, confianza:'media',
    tags:[() => L('25.8 proj','25.8 proy'), () => L('vs OPP · 114 allowed','vs OPP · 114 perm.'), '25.0 PPG'],
    factores:[L('Scorer averaging 25.0','Anotador de 25.0 de promedio'), L('Heavy minutes','Muchos minutos')], riesgos:[L('Away from home','Juega de visita')] },
  { rank:3, nombre:'Secondary Scorer', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:55, confianza:'baja',
    tags:[() => L('21.4 proj','21.4 proy'), () => L('vs RVL · 116 allowed','vs RVL · 116 perm.'), '20.1 PPG'],
    factores:[L('Usage up with a starter out','Más protagonismo por una baja')], riesgos:[L('Rotation/minutes risk','Riesgo de minutos')] },
];
const DEMO_NHL = [
  { rank:1, nombre:'Elite Shooter', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:92, confianza:'media',
    tags:[() => L('4.5 proj','4.5 proy'), () => L('vs AWY · 33 SA','vs AWY · 33 TC'), '4.0 S/G'],
    factores:[L('Opponent allows 33 shots/game','El rival permite 33 tiros/partido'), L('Plays at home','Juega en casa'), L('High shot volume','Alto volumen de tiro')], riesgos:[L('Lineup not confirmed','Alineación no confirmada')] },
  { rank:2, nombre:'Top Winger', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:71, confianza:'media',
    tags:[() => L('2.6 proj','2.6 proy'), () => L('vs OPP · 30 SA','vs OPP · 30 TC'), '2.6 S/G'],
    factores:[L('Steady shot volume','Volumen de tiro constante'), L('Power-play time','Minutos en power play')], riesgos:[L('Away from home','Juega de visita')] },
  { rank:3, nombre:'Two-way Center', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:58, confianza:'baja',
    tags:[() => L('2.1 proj','2.1 proy'), () => L('vs RVL · 29 SA','vs RVL · 29 TC'), '2.1 S/G'],
    factores:[L('Plays at home','Juega en casa')], riesgos:[L('Opponent limits shots','El rival limita los tiros')] },
];

/* ---------- Config por deporte ---------- */
function VISTA(sport) {
  const base = {
    mlb: {
      activo: true, img: 'fondo-hits.jpg', run: () => topParlayHits({ fecha: hoyISO(), n: 9 }), demo: DEMO_MLB,
      eyebrow: L('Premium · Hit Projection', 'Premium · Proyección de Hits'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('Hit chances', 'opciones de hit')}</em>`,
      metric: 'P(≥1 hit)', metricLabel: L('Chance<br>of a hit', 'Opción<br>de hit'),
      lead: L('The nine batters with the highest estimated probability of getting at least one hit today.',
              'Los nueve bateadores con mayor probabilidad estimada de conectar al menos un imparable hoy.'),
      foot: L('Model probability estimates, not betting advice. Baseball is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El béisbol es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.pitcherMano || 'R'}HP`, `${p.pitcher || ''}${p.pitcherEra != null ? ' · ' + (+p.pitcherEra).toFixed(2) : ''}`, `${L('Slot', 'Turno')} ${p.slot || '—'}` ] }),
    },
    soccer: {
      activo: true, img: 'fondo-goals.jpg', run: () => topGoalProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_SOCCER,
      eyebrow: L('Premium · Goal Projection', 'Premium · Proyección de Goles'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('Goal chances', 'opciones de gol')}</em>`,
      metric: 'P(≥1 goal)', metricLabel: L('Chance<br>of a goal', 'Opción<br>de gol'),
      lead: L('The nine players with the highest estimated probability of scoring at least one goal today (anytime goalscorer).',
              'Los nueve jugadores con mayor probabilidad estimada de anotar al menos un gol hoy (anytime goalscorer).'),
      foot: L('Model probability estimates, not betting advice. Football is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El fútbol es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ p.pos || 'FW', (p.gaRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.gaRival).toFixed(2)} ${L('GA', 'GC')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.goles != null ? `${p.goles} G` : '') ].filter(Boolean) }),
    },
    nba: {
      activo: true, img: 'fondo-points.jpg', run: () => topPointsProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NBA,
      eyebrow: L('Premium · Points Projection', 'Premium · Proyección de Puntos'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('20+ point chances', 'opciones de 20+ pts')}</em>`,
      metric: 'P(20+ pts)', metricLabel: L('Chance of<br>20+ pts', 'Opción de<br>20+ pts'),
      lead: L('The nine players with the highest estimated probability of scoring 20 or more points today.',
              'Los nueve jugadores con mayor probabilidad estimada de anotar 20 o más puntos hoy.'),
      foot: L('Model probability estimates, not betting advice. Basketball is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El baloncesto es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.proj} ${L('proj', 'proy')}`, (p.ptsPermRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.ptsPermRival).toFixed(0)} ${L('allowed', 'perm.')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.ppg != null ? `${(+p.ppg).toFixed(1)} PPG` : '') ].filter(Boolean) }),
    },
    nhl: {
      activo: true, img: 'fondo-shots.jpg', run: () => topShotsProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NHL,
      eyebrow: L('Premium · Shots Projection', 'Premium · Proyección de Tiros'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('2+ shot chances', 'opciones de 2+ tiros')}</em>`,
      metric: 'P(2+ SOG)', metricLabel: L('Chance of<br>2+ shots', 'Opción de<br>2+ tiros'),
      lead: L('The nine players with the highest estimated probability of registering 2 or more shots on goal today. In-house Poisson model: opponent shots allowed, home/away and recent form.',
              'Los nueve jugadores con mayor probabilidad estimada de registrar 2 o más tiros a puerta hoy. Modelo propio de Poisson: tiros que permite el rival, local/visita y forma reciente.'),
      foot: L('Model probability estimates, not betting advice. Hockey is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El hockey es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.proj} ${L('proj', 'proy')}`, (p.saRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.saRival).toFixed(0)} ${L('SA', 'TC')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.spg != null ? `${(+p.spg).toFixed(1)} S/G` : '') ].filter(Boolean) }),
    },
  };
  return base[sport] || base.mlb;
}
const imgURL = (cfg) => `assets/imagenes/fondos/${cfg.img}`;

/* ---------- CSS ---------- */
let _css = false;
function inyectarCSS() {
  if (_css) return; _css = true;
  const st = document.createElement('style'); st.id = 'parlay-css';
  st.textContent = `
  .ply{--az:#4db4f7;--ro:#f4494e;--ok:#41d6a0;--am:#f3b13d;--oro:#e8c46a;--oro2:#c79a3c;
    --card:#0e141e;--line:rgba(255,255,255,.08);--tx:#eef3f9;--tx2:#98a4b4;--tx3:#5c6879;max-width:1120px;margin:0 auto}
  .ply *{box-sizing:border-box}
  .ply-hero{position:relative;border-radius:20px;overflow:hidden;margin-bottom:20px;isolation:isolate;border:1px solid var(--line);background-size:cover;background-position:center;background-color:#0a1420;aspect-ratio:1048/271;display:flex}
  .ply-hero-bg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;background-color:#0a1420}
  .ply-hero-veil{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,rgba(6,9,15,.92),rgba(6,9,15,.5) 46%,rgba(6,9,15,.10) 72%),linear-gradient(0deg,rgba(6,9,15,.74),transparent 46%),radial-gradient(125% 135% at 58% 42%, transparent 52%, rgba(6,9,15,.62))}
  .ply-hero-in{position:relative;z-index:2;width:100%;display:flex;flex-direction:column;padding:20px 28px}
  .ply-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#efe3c6;border:1px solid rgba(232,196,106,.35);border-radius:999px;padding:6px 13px;background:rgba(0,0,0,.30)}
  .ply-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--oro);box-shadow:0 0 10px var(--oro)}
  .ply-title{font-family:"Chakra Petch",sans-serif;font-weight:800;letter-spacing:-.01em;line-height:1.04;font-size:clamp(26px,5vw,44px);color:#fff;margin:16px 0 8px;text-shadow:0 2px 20px rgba(0,0,0,.6)}
  .ply-title em{font-style:normal;background:linear-gradient(180deg,#f8e7ad,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .ply-lead{color:#cbd4e0;font-size:14.5px;max-width:620px;line-height:1.55;text-shadow:0 1px 12px rgba(0,0,0,.7)}
  .ply-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .ply-meta span{font-size:11.5px;color:#d3dbe6;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:6px 11px;background:rgba(0,0,0,.34)}
  .ply-meta b{color:#fff}
  /* ---- Contenido superpuesto sobre el banner ---- */
  .ply-chips{display:flex;gap:8px;flex-wrap:wrap}
  .ply-chips span{font-size:11.5px;color:#eaf0f8;border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:6px 11px;background:rgba(6,10,18,.55);backdrop-filter:blur(4px)}
  .ply-chips b{color:#fff;font-weight:800}
  .ply-hero-in .ply-title{margin:auto 0 6px}
  .ply-hero-in .ply-lead{margin:0 0 4px}
  .ply-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
  .ply-tab{display:inline-flex;align-items:center;gap:9px;padding:11px 16px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--tx2);font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;transition:.15s}
  .ply-tab:hover{border-color:rgba(255,255,255,.28);color:var(--tx)}
  .ply-tab-n{font-weight:800;font-size:12px;padding:1px 8px;border-radius:8px;background:rgba(255,255,255,.08)}
  .ply-tab.on.hits{background:linear-gradient(180deg,rgba(232,196,106,.20),rgba(232,196,106,.05));border-color:var(--oro);color:#f4e6c0}
  .ply-tab.on.hits .ply-tab-n{background:rgba(232,196,106,.26);color:#f4e6c0}
  .ply-tab.on.hr{background:linear-gradient(180deg,rgba(151,90,222,.24),rgba(151,90,222,.06));border-color:#9a5cdc;color:#dcc7f7}
  .ply-tab.on.hr .ply-tab-n{background:rgba(151,90,222,.32);color:#dcc7f7}
  .ply-tab.on.tb{background:linear-gradient(180deg,rgba(29,155,240,.20),rgba(29,155,240,.05));border-color:#1d9bf0;color:#bfe0fb}
  .ply-tab.on.tb .ply-tab-n{background:rgba(29,155,240,.30);color:#bfe0fb}
  .ply-panel{margin-top:16px}
  /* ---- Panel "muy pronto" (temado por apuesta) ---- */
  .ply-soon{text-align:center;padding:44px 24px;border:1px dashed var(--line);border-radius:16px;background:rgba(255,255,255,.02)}
  .ply-soon-badge{display:inline-block;padding:5px 13px;border-radius:999px;border:1px solid var(--line);font-family:"Chakra Petch",sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--tx2);margin-bottom:14px}
  .ply-soon.hr .ply-soon-badge{color:#dcc7f7;border-color:rgba(151,90,222,.5);background:rgba(151,90,222,.10)}
  .ply-soon.tb .ply-soon-badge{color:#bfe0fb;border-color:rgba(29,155,240,.5);background:rgba(29,155,240,.10)}
  .ply-soon-t{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:22px;color:#fff;margin-bottom:8px}
  .ply-soon-d{color:var(--tx2);font-size:14px;max-width:440px;margin:0 auto;line-height:1.55}
  /* ---- Tarjetas de HR: tema morado ---- */
  .ply-panel.hr .ply-c::before{background:linear-gradient(90deg,#9a5cdc,transparent 70%)}
  .ply-panel.hr .ply-rank{background:linear-gradient(135deg,#d3b8f5,#8a5cd8);color:#1a0e2e;box-shadow:0 4px 14px rgba(138,92,216,.42)}
  .ply-panel.hr .ply-fill{background:linear-gradient(90deg,#8a5cd8,#d3b8f5)}
  .ply-panel.hr .ply-pct{background:linear-gradient(180deg,#e5d2fb,#a06fe0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
  .ply-panel.hr .ply-tag.h{color:#dcc7f7;border-color:rgba(151,90,222,.4)}
  .ply-panel.hr .ply-verdict{border-left-color:#9a5cdc}
  .ply-panel.hr .ply-analyze{background:linear-gradient(90deg,#8a5cd8,#c9a6f0);color:#1a0e2e}
  .ply-panel.hr .ply-blk.f .ply-blk-t{color:#dcc7f7}
  .ply-panel.hr .ply-blk.f li::before{background:#9a5cdc}
  .ply-panel.hr .ply-c:focus-visible{outline-color:#9a5cdc}
  @media(max-width:620px){.ply-hero{aspect-ratio:auto;min-height:330px}.ply-hero-veil{background:linear-gradient(180deg,rgba(6,9,15,.42),rgba(6,9,15,.25) 34%,rgba(6,9,15,.92)),radial-gradient(130% 120% at 50% 40%, transparent 55%, rgba(6,9,15,.6))}.ply-hero-in{padding:18px 18px}.ply-hero-in .ply-title{font-size:clamp(24px,7vw,32px)}.ply-chips span{font-size:10.5px;padding:5px 9px}.ply-tab{padding:10px 13px;font-size:12.5px}}
  .ply-note{display:flex;gap:9px;align-items:center;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--tx2);font-size:12px;padding:9px 13px;border-radius:10px;margin-bottom:16px}
  .ply-note i{width:6px;height:6px;border-radius:50%;background:var(--oro);flex:0 0 auto}
  .ply-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
  .ply-skel{border:1px solid var(--line);border-radius:16px;padding:18px;height:190px;position:relative;overflow:hidden;background:rgba(255,255,255,.02)}
  .ply-skel::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);transform:translateX(-100%);animation:ply-shimmer 1.3s infinite}
  .ply-skel b{display:block;height:12px;border-radius:6px;background:rgba(255,255,255,.06);margin-bottom:12px}
  .ply-skel b.w1{width:55%;height:16px}.ply-skel b.w2{width:38%}.ply-skel b.w3{width:80%;margin-top:20px}.ply-skel b.w4{width:70%}
  @keyframes ply-shimmer{100%{transform:translateX(100%)}}
  .ply-c{position:relative;border:1px solid var(--line);border-radius:16px;padding:18px 18px 16px;overflow:hidden;cursor:pointer;
    background:linear-gradient(180deg,rgba(17,25,37,.90),rgba(11,17,25,.95)),url('${TEXTURA}') center/cover;
    transition:transform .16s ease,border-color .16s ease}
  .ply-c:hover{transform:translateY(-2px);border-color:rgba(232,196,106,.45)}
  .ply-c:focus-visible{outline:2px solid var(--oro);outline-offset:2px}
  .ply-c::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--oro),transparent 70%);opacity:.6}
  .ply-c.r1::before,.ply-c.r2::before,.ply-c.r3::before{opacity:1;height:4px}
  .ply-c-top{display:flex;align-items:center;gap:12px;margin-bottom:13px}
  .ply-rank{flex:0 0 auto;width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:#241a06;background:linear-gradient(135deg,#f6e2a6,#d4a53f);box-shadow:0 4px 14px rgba(199,154,60,.35)}
  .ply-c.r4 .ply-rank,.ply-c.r5 .ply-rank,.ply-c.r6 .ply-rank,.ply-c.r7 .ply-rank,.ply-c.r8 .ply-rank,.ply-c.r9 .ply-rank{background:linear-gradient(135deg,#2a3646,#1a2431);color:#9fb0c2;box-shadow:none;border:1px solid var(--line)}
  .ply-idn{min-width:0;flex:1}
  .ply-nm{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:var(--tx);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ply-mt{font-size:12px;color:var(--tx2);font-weight:600;margin-top:2px}
  .ply-mt b{color:var(--tx)}
  .ply-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:15px}
  .ply-tag{font-size:11px;font-weight:600;color:var(--tx2);border:1px solid var(--line);border-radius:7px;padding:4px 8px;background:rgba(255,255,255,.02);white-space:nowrap}
  .ply-tag.h{color:var(--oro);border-color:rgba(232,196,106,.3)}
  .ply-meter{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  .ply-track{height:9px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden;margin:2px 0 12px}
  .ply-verdict{font-size:13px;line-height:1.5;color:#e3eaf3;background:rgba(255,255,255,.03);border-left:3px solid var(--tx3);border-radius:8px;padding:10px 13px;margin:0 0 12px}
  .ply-verdict.bueno{border-left-color:var(--ok);background:rgba(65,214,160,.07)}
  .ply-verdict.medio{border-left-color:var(--am);background:rgba(243,177,61,.07)}
  .ply-verdict.malo{border-left-color:var(--ro);background:rgba(244,73,78,.07)}
  .ply-pct{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:40px;line-height:1;color:#e8c46a;background:linear-gradient(180deg,#f8e7ad,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .ply-plab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);font-weight:700;text-align:right;line-height:1.35}
  .ply-fill{height:100%;border-radius:6px;width:0;transition:width 1s cubic-bezier(.2,.7,.2,1);background:linear-gradient(90deg,var(--oro2),#f6e2a6);box-shadow:0 0 14px rgba(232,196,106,.4)}
  .ply-conf{display:inline-flex;align-items:center;gap:7px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 12px}
  .ply-conf i{width:7px;height:7px;border-radius:50%}
  .ply-conf.alta{color:#8ff0cb;background:rgba(65,214,160,.1);border:1px solid rgba(65,214,160,.3)}.ply-conf.alta i{background:var(--ok)}
  .ply-conf.media{color:#f6d38c;background:rgba(243,177,61,.1);border:1px solid rgba(243,177,61,.3)}.ply-conf.media i{background:var(--am)}
  .ply-conf.baja{color:#f6a7aa;background:rgba(244,73,78,.1);border:1px solid rgba(244,73,78,.3)}.ply-conf.baja i{background:var(--ro)}
  .ply-split{margin-top:14px;padding-top:13px;border-top:1px solid var(--line);display:grid;gap:12px}
  .ply-blk-t{font-size:10px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;margin-bottom:7px}
  .ply-blk.f .ply-blk-t{color:var(--oro)}
  .ply-blk.r .ply-blk-t{color:var(--ro)}
  .ply-blk ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
  .ply-blk li{position:relative;padding-left:16px;font-size:12.5px;color:var(--tx2);line-height:1.4}
  .ply-blk li::before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:2px}
  .ply-blk.f li::before{background:var(--oro)}
  .ply-blk.r li::before{background:var(--ro)}
  .ply-analyze{margin-top:15px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#241a06;background:linear-gradient(90deg,#e8c46a,#f6e2a6);border:0;border-radius:10px;padding:11px 12px;cursor:pointer;transition:filter .15s}
  .ply-analyze:hover{filter:brightness(1.06)}
  .ply-analyze svg{width:15px;height:15px}
  .ply-foot{color:var(--tx3);font-size:11.5px;line-height:1.6;text-align:center;margin-top:20px;padding:0 10px}
  .ply-lock{position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--line);isolation:isolate}
  .ply-lock-in{position:relative;z-index:2;padding:56px 26px;text-align:center}
  .ply-lock h3{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:clamp(21px,3.6vw,30px);color:#fff;margin:16px 0 10px;text-shadow:0 2px 18px rgba(0,0,0,.6)}
  .ply-lock p{color:#cdd6e2;max-width:440px;margin:0 auto 20px;font-size:14px;line-height:1.55;text-shadow:0 1px 10px rgba(0,0,0,.6)}
  .ply-cta{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;color:#241a06;background:linear-gradient(90deg,#e8c46a,#f6e2a6);border:0;border-radius:999px;padding:13px 26px;cursor:pointer;text-transform:uppercase;box-shadow:0 6px 20px rgba(199,154,60,.4)}
  .ply-cta:hover{filter:brightness(1.06)}
  @media(max-width:560px){.ply-hero-in{padding:24px 20px 22px}.ply-grid{grid-template-columns:1fr}.ply-pct{font-size:34px}}
  `;
  document.head.appendChild(st);
}

/* ---------- Render ---------- */
const tagTxt = (t) => (typeof t === 'function' ? t() : t);
const IC_LUPA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6M11 8v6"/></svg>`;

const APUESTAS = [
  { id: 'hits', cls: 'hits', label: () => L('Hits', 'Hits') },
  { id: 'hr',   cls: 'hr',   label: () => L('Home runs', 'Home runs') },
  { id: 'tb',   cls: 'tb',   label: () => L('Total bases', 'Bases totales') },
];
function betTabsHTML(activo) {
  const act = activo || 'hits';
  return `<div class="ply-tabs">${APUESTAS.map(t =>
    `<button class="ply-tab ${t.cls}${t.id === act ? ' on' : ''}" data-bet="${t.id}"><span class="ply-tab-l">${t.label()}</span></button>`
  ).join('')}</div>`;
}

function heroHTML(cfg, meta, cargando, variante) {
  const noun = String(cfg.metricLabel || '').replace(/<br>/g, ' ').trim();
  const chips = [
    `<span>${L('Date', 'Fecha')} · <b>${esc(meta.fecha)}</b></span>`,
    `<span class="ply-count-chip"><b>9</b> ${L('players', 'jugadores')} · ${esc(noun)}</span>`,
  ].join('');
  return `<div class="ply-hero" style="background-image:url('${imgURL(cfg)}')">
    <div class="ply-hero-veil"></div>
    <div class="ply-hero-in">
      <div class="ply-chips">${chips}</div>
      <div class="ply-title">${cargando ? L('Loading…', 'Cargando…') : cfg.titulo}</div>
      <div class="ply-lead">${esc(cfg.lead)}</div>
      ${cfg._sport === 'mlb' ? betTabsHTML(variante) : ''}
    </div></div>`;
}

function comingSoonHTML(cfg) {
  return `<div class="ply"><div class="ply-lock"><div class="ply-hero-bg" style="background-image:url('${imgURL(cfg)}')"></div><div class="ply-hero-veil"></div>
    <div class="ply-lock-in"><span class="ply-eyebrow"><i></i>${esc(cfg.eyebrow)}</span>
      <h3>${esc(cfg.titulo)}</h3><p>${L('This projection is on the way.', 'Esta proyección está en camino.')}</p></div></div></div>`;
}

/* Veredicto humanizado: una frase clara que dice qué significa el número y qué
   hacer con él. El % sigue siendo EL dato; esto lo interpreta en palabras. */
/* Frases y umbrales POR DEPORTE. Los rangos de probabilidad no son iguales:
   un 50% de gol en fútbol es élite, pero un 50% de hit es flojo. Por eso cada
   mercado tiene sus propios cortes (hi/mid) y su vocabulario natural. */
const FRASES = {
  'P(≥1 hit)': { hi: 68, mid: 60,
    alta:   { es: (pr) => `Fuerte candidato a pegar hit hoy (${pr}%).`,           en: (pr) => `Strong candidate to get a hit today (${pr}%).` },
    mod:    { es: (pr) => `Tiene con qué conectar (${pr}%), sin garantías.`,       en: (pr) => `A real shot to connect (${pr}%), no guarantees.` },
    parejo: { es: (pr) => `Duelo parejo al bate (${pr}%): el abridor rival complica.`, en: (pr) => `Even at the plate (${pr}%): the opposing starter makes it tough.` },
    flojo:  { es: (pr) => `Pocos turnos para medirlo: este ${pr}% es poco fiable.`, en: (pr) => `Too few at-bats to judge: this ${pr}% isn't reliable.` },
    solido: { es: ' Selección sólida.', en: ' Solid pick.' } },
  'P(≥1 goal)': { hi: 42, mid: 26,
    alta:   { es: (pr) => `Amenaza real de gol hoy (${pr}%).`,                     en: (pr) => `Real goal threat today (${pr}%).` },
    mod:    { es: (pr) => `Puede ver puerta (${pr}%), dependerá del partido.`,     en: (pr) => `Could find the net (${pr}%), depends on the game.` },
    parejo: { es: (pr) => `Difícil que marque (${pr}%): la defensa rival aprieta.`, en: (pr) => `Unlikely to score (${pr}%): tough rival defense.` },
    flojo:  { es: (pr) => `Pocos partidos para fiarse de este ${pr}%.`,            en: (pr) => `Too few games to trust this ${pr}%.` },
    solido: { es: ' Nombre a seguir para anotar.', en: ' One to watch for a goal.' } },
  'P(20+ pts)': { hi: 65, mid: 45,
    alta:   { es: (pr) => `Firme candidato a pasar de 20 puntos (${pr}%).`,        en: (pr) => `Firm candidate to clear 20 points (${pr}%).` },
    mod:    { es: (pr) => `Puede rondar los 20 (${pr}%), sin asegurarlo.`,          en: (pr) => `Could flirt with 20 (${pr}%), not a lock.` },
    parejo: { es: (pr) => `Le costará llegar a 20 hoy (${pr}%).`,                   en: (pr) => `Reaching 20 looks hard today (${pr}%).` },
    flojo:  { es: (pr) => `Rol o minutos poco claros: este ${pr}% es poco fiable.`, en: (pr) => `Unclear role or minutes: this ${pr}% isn't reliable.` },
    solido: { es: ' Anotador de fiar esta noche.', en: ' Reliable scorer tonight.' } },
  'P(2+ SOG)': { hi: 72, mid: 50,
    alta:   { es: (pr) => `Volumen de tiro alto: apunta a 2+ disparos (${pr}%).`,  en: (pr) => `High shot volume: on track for 2+ shots (${pr}%).` },
    mod:    { es: (pr) => `Puede llegar a 2 tiros (${pr}%), sin garantía.`,         en: (pr) => `Could reach 2 shots (${pr}%), no guarantee.` },
    parejo: { es: (pr) => `Poco probable que llegue a 2 tiros (${pr}%).`,           en: (pr) => `Unlikely to reach 2 shots (${pr}%).` },
    flojo:  { es: (pr) => `Pocos partidos para fiarse de este ${pr}%.`,            en: (pr) => `Too few games to trust this ${pr}%.` },
    solido: { es: ' Tirador constante.', en: ' Consistent shooter.' } },
  'P(1+ HR)': { hi: 25, mid: 16,
    alta:   { es: (pr) => `Fuerte candidato a volarla hoy (${pr}%).`,               en: (pr) => `Strong candidate to go deep today (${pr}%).` },
    mod:    { es: (pr) => `Poder real para el cuadrangular (${pr}%), sin garantías.`, en: (pr) => `Real power for a home run (${pr}%), no guarantees.` },
    parejo: { es: (pr) => `HR poco probable hoy (${pr}%): matchup complicado.`,     en: (pr) => `HR unlikely today (${pr}%): tough matchup.` },
    flojo:  { es: (pr) => `Muestra corta: este ${pr}% es poco fiable.`,            en: (pr) => `Small sample: this ${pr}% isn't reliable.` },
    solido: { es: ' Bate de poder a seguir.', en: ' A power bat to watch.' } },
};
FRASES._def = FRASES['P(≥1 hit)'];

/* Config para renderizar las tarjetas de HOME RUNS (tema morado). */
const CFG_HR = {
  _sport: 'mlb', _bet: 'hr',
  metric: 'P(1+ HR)',
  metricLabel: L('Chance<br>of a HR', 'Opción<br>de HR'),
  toCard: (p) => ({ ...p, tags: p.tags || [
    (p.hr != null ? `${p.hr} HR` : ''),
    `${L('vs', 'vs')} ${p.pitcher || 'TBD'}${p.pitcherEra != null ? ' · ' + (+p.pitcherEra).toFixed(2) : ''}`,
    (p.rachaHR ? `${p.rachaHR} ${L('HR games', 'con HR')}` : ''),
  ].filter(Boolean) }),
  foot: L('Model probability estimates, not betting advice. Home runs are rare and high-variance.',
          'Estimaciones probabilísticas del modelo, no asesoría de apuestas. Los HR son raros y de alta varianza.'),
};

/* Confianza MOSTRADA en base a la probabilidad (no a la muestra de temporada,
   que a inicio de año castiga a todos). Así un 79% se ve "alta", no "media",
   y desaparece el mensaje de "muy baja" que espantaba al usuario. */
function confPorProb(prob, cfg) {
  const S = FRASES[cfg.metric] || FRASES._def;
  if (prob >= S.hi) return 'alta';
  if (prob >= S.mid) return 'media';
  return 'baja';
}

/* Curación (regla obligatoria): solo jugadores BUENOS. Ordena por probabilidad
   y, si hay suficientes por encima del umbral del deporte, descarta a los flojos.
   Nunca deja la vista vacía. Máximo 9. */
function curar(jugadores, cfg) {
  const S = FRASES[cfg.metric] || FRASES._def;
  let arr = (jugadores || []).slice();
  // Si el motor ya trae 'score' (racha real de juegos-con-hit), respeta ese orden.
  if (arr.some(j => j.score != null)) {
    arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    return arr.slice(0, 9).map((j, i) => ({ ...j, rank: i + 1 }));
  }
  arr.sort((a, b) => (b.prob || 0) - (a.prob || 0));
  const buenos = arr.filter(j => (j.prob || 0) >= S.mid);
  if (buenos.length >= 5) arr = buenos;
  return arr.slice(0, 9).map((j, i) => ({ ...j, rank: i + 1 }));
}


function veredicto(p, cfg) {
  const es = ES();
  const pr = p.prob, conf = p.confianza;
  const fav = (p.factores || [])[0];
  const rsk = (p.riesgos || [])[0];
  const baja = (conf === 'baja' || conf === 'muy baja');
  const muyBaja = conf === 'muy baja';
  const S = FRASES[cfg.metric] || FRASES._def;
  const line = (o) => (es ? o.es(pr) : o.en(pr));
  const F = fav ? (es ? ` A favor: ${fav.toLowerCase()}.` : ` In favor: ${fav.toLowerCase()}.`) : '';
  const R = rsk ? (es ? ` Cuidado: ${rsk.toLowerCase()}.` : ` Watch out: ${rsk.toLowerCase()}.`) : '';
  let tono, txt;

  if (muyBaja) {
    tono = 'malo';
    txt = line(S.flojo) + (rsk ? (es ? ` ${rsk}.` : ` ${rsk}.`) : '') + (es ? ' No te apoyes solo en esto.' : " Don't lean on it alone.");
  } else if (pr >= S.hi) {
    tono = baja ? 'medio' : 'bueno';
    txt = line(S.alta) + F + (baja ? (es ? ' Aún con reservas.' : ' Still with reservations.') : (es ? S.solido.es : S.solido.en));
  } else if (pr >= S.mid) {
    tono = 'medio';
    txt = line(S.mod) + F;
  } else {
    tono = 'medio';
    txt = line(S.parejo) + R;
  }
  return { texto: txt, tono };
}

function cardHTML(p, cfg) {

  const conf = confPorProb(p.prob, cfg);       // confianza coherente con la probabilidad
  const pv = { ...p, confianza: conf };
  const tags = (cfg.toCard(p).tags || []).map((t, i) => `<span class="ply-tag${i === 0 ? ' h' : ''}">${esc(tagTxt(t))}</span>`).join('');
  const fav = (p.factores || []).map(f => `<li>${esc(f)}</li>`).join('');
  const rsk = (p.riesgos || []).map(f => `<li>${esc(f)}</li>`).join('');
  const vd = veredicto(pv, cfg);
  return `<article class="ply-c r${p.rank}" data-idx="${p.rank}">
    <div class="ply-c-top"><div class="ply-rank">${p.rank}</div>
      <div class="ply-idn"><div class="ply-nm">${esc(p.nombre)}</div>
        <div class="ply-mt"><b>${esc(p.equipoAbrev || '')}</b> ${L('vs', 'vs')} ${esc(p.rivalAbrev || '')}</div></div></div>
    <div class="ply-tags">${tags}</div>
    <div class="ply-meter"><div class="ply-pct">${p.prob}%</div><div class="ply-plab">${cfg.metricLabel}</div></div>
    <div class="ply-track"><div class="ply-fill" data-w="${p.prob}"></div></div>
    <div class="ply-verdict ${vd.tono}">${esc(vd.texto)}</div>
    <span class="ply-conf ${conf}"><i></i>${L('Confidence', 'Confianza')} ${esc(confLabel(conf))}</span>
    <div class="ply-split">
      ${fav ? `<div class="ply-blk f"><div class="ply-blk-t">${L('Key factors', 'Factores favorables')}</div><ul>${fav}</ul></div>` : ''}
      ${rsk ? `<div class="ply-blk r"><div class="ply-blk-t">${L('Risks', 'Riesgos')}</div><ul>${rsk}</ul></div>` : ''}
    </div>
    <button class="ply-analyze" data-analyze="${p.rank}">${IC_LUPA}${L('Analyze player · Last 10', 'Analizar jugador · Últimos 10')}</button>
  </article>`;
}

function animar(cont) {
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; io.unobserve(e.target); } }), { threshold: .2 });
  cont.querySelectorAll('.ply-fill').forEach(b => io.observe(b));
}

function soonPanelHTML(bet) {
  const T = bet === 'hr' ? L('Home runs', 'Home runs') : L('Total bases', 'Bases totales');
  const D = bet === 'hr'
    ? L('The players most likely to hit a home run today — the most popular MLB prop. Building it now.',
        'Los jugadores con mayor probabilidad de pegar un cuadrangular hoy — el prop más popular de la MLB. En construcción.')
    : L('The players most likely to rack up 2+ total bases today. Building it now.',
        'Los jugadores con mayor probabilidad de sumar 2+ bases totales hoy. En construcción.');
  return `<div class="ply-panel ply-soon ${bet}" data-bet-panel="${bet}" hidden>
    <div class="ply-soon-badge">${T}</div>
    <div class="ply-soon-t">${L('Coming soon', 'Muy pronto')}</div>
    <div class="ply-soon-d">${D}</div>
  </div>`;
}
function wireBets(cont) {
  const tabs = cont.querySelectorAll('.ply-tab[data-bet]');
  const panels = cont.querySelectorAll('[data-bet-panel]');
  let hrCargado = false, hrCount = null;
  tabs.forEach(t => t.addEventListener('click', async () => {
    const bet = t.dataset.bet;
    tabs.forEach(x => x.classList.remove('on')); t.classList.add('on');
    panels.forEach(p => { p.hidden = (p.getAttribute('data-bet-panel') !== bet); });

    const chip = cont.querySelector('.ply-count-chip');
    if (chip && bet === 'hits') chip.innerHTML = `<b>9</b> ${L('players', 'jugadores')} · ${L('Chance of a hit', 'Opción de hit')}`;
    if (chip && bet === 'tb') chip.innerHTML = `${L('Total bases', 'Bases totales')} · ${L('coming soon', 'muy pronto')}`;
    if (chip && bet === 'hr') chip.innerHTML = hrCount != null
      ? `<b>${hrCount}</b> ${L('players', 'jugadores')} · ${L('Chance of a HR', 'Opción de HR')}`
      : `${L('Chance of a HR', 'Opción de HR')} · ${L('loading…', 'cargando…')}`;

    if (bet === 'hr' && !hrCargado) {
      hrCargado = true;
      const grid = cont.querySelector('[data-hr-grid]'); if (!grid) return;
      let sk = ''; for (let i = 0; i < 6; i++) sk += '<div class="ply-skel"><b class="w1"></b><b class="w2"></b><b class="w3"></b><b class="w4"></b></div>';
      grid.innerHTML = sk;
      try {
        const cached = CACHE.get('mlb:hr');
        let jug;
        if (cached && Date.now() - cached.ts < 120000) jug = cached.jugadores;
        else {
          const r = await conTimeout(topHomeRuns({ fecha: hoyISO(), n: 6 }), 25000);
          jug = (r && r.jugadores) ? curar(r.jugadores, CFG_HR) : [];
          CACHE.set('mlb:hr', { jugadores: jug, ts: Date.now() });
        }
        hrCount = jug.length;
        if (chip) chip.innerHTML = `<b>${hrCount}</b> ${L('players', 'jugadores')} · ${L('Chance of a HR', 'Opción de HR')}`;
        grid.innerHTML = jug.length ? jug.map(p => cardHTML(p, CFG_HR)).join('')
          : `<div class="ply-note"><i></i>${L('No standout home run picks for today\u2019s games.', 'Hoy no hay bateadores que cumplan el nivel de HR.')}</div>`;
        animar(cont);
        grid.querySelectorAll('.ply-c[data-idx]').forEach(el => el.addEventListener('click', () => { const j = jug[+el.dataset.idx - 1]; if (j) abrirTracker(j, 'mlb', 'hr'); }));
      } catch (_) {
        grid.innerHTML = `<div class="ply-note"><i></i>${L('Could not load home runs.', 'No se pudo cargar home runs.')}</div>`;
        hrCargado = false;
      }
    }
  }));
}

function pintarGrid(cont, cfg, jugadores, meta, preliminar) {
  const nota = preliminar
    ? `<div class="ply-note"><i></i>${L('Preview — live projections update at game time.', 'Vista preliminar — las proyecciones en vivo se actualizan a la hora del juego.')}</div>`
    : '';
  cont.innerHTML = `<div class="ply">
    ${heroHTML(cfg, meta, false, 'hits')}
    ${nota}
    <div class="ply-panel" data-bet-panel="hits"><div class="ply-grid">${jugadores.map(p => cardHTML(p, cfg)).join('')}</div></div>
    ${cfg._sport === 'mlb' ? `<div class="ply-panel hr" data-bet-panel="hr" hidden><div class="ply-grid" data-hr-grid></div></div>${soonPanelHTML('tb')}` : ''}
    <div class="ply-foot">${esc(cfg.foot)}</div>
  </div>`;
  animar(cont);
  wireBets(cont);
  const abrir = (idx) => { const j = jugadores[idx - 1]; if (j) abrirTracker(j, cfg._sport); };
  cont.querySelectorAll('.ply-analyze[data-analyze]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); abrir(+b.dataset.analyze); }));
  cont.querySelectorAll('.ply-c[data-idx]').forEach(el => el.addEventListener('click', () => abrir(+el.dataset.idx)));
}

/* Promesa con límite de tiempo (para no colgar la carga) */
const conTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/* Esqueleto de carga: 9 tarjetas fantasma (nunca "solo 3") */
function pintarCargando(cont, cfg) {
  var cards = '';
  for (var i = 0; i < 9; i++) cards += '<div class="ply-skel"><b class="w1"></b><b class="w2"></b><b class="w3"></b><b class="w4"></b></div>';
  cont.innerHTML = `<div class="ply">
    ${heroHTML(cfg, { fecha: hoyISO() }, true)}
    <div class="ply-note"><i></i>${L('Loading top picks for today…', 'Cargando los mejores del día…')}</div>
    <div class="ply-grid">${cards}</div>
  </div>`;
}

/* ---------- API pública ---------- */
export async function pintarParlay(cont, { sport = 'mlb', esPremium = false, abrirPlanes } = {}) {
  inyectarCSS();
  const cfg = VISTA(sport); cfg._sport = sport;

  if (!esPremium) {
    cont.innerHTML = `<div class="ply"><div class="ply-lock"><div class="ply-hero-bg" style="background-image:url('${imgURL(cfg)}')"></div><div class="ply-hero-veil"></div>
      <div class="ply-lock-in"><span class="ply-eyebrow"><i></i>${L('Premium', 'Premium')}</span>
        <h3>${esc((cfg.titulo || '').replace(/<[^>]+>/g, ''))}</h3>
        <p>${L('Every day, the players with the highest probability of the key play. Premium plan only.', 'Cada día, los jugadores con mayor probabilidad de la jugada clave. Exclusivo del plan Premium.')}</p>
        <button class="ply-cta" id="ply-cta">${L('See Premium plan', 'Ver plan Premium')}</button></div></div></div>`;
    const b = cont.querySelector('#ply-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }
  if (!cfg.activo) { cont.innerHTML = comingSoonHTML(cfg); return; }

  // 1) Pintado INSTANTÁNEO: caché si es reciente, si no, preliminar
  const cached = CACHE.get(sport);
  const fresco = cached && (Date.now() - cached.ts < 120000);
  if (fresco) pintarGrid(cont, cfg, cached.jugadores, cached.meta, false);
  else pintarCargando(cont, cfg);

  // 2) Datos en vivo en 2º plano (con timeout amplio), y se sustituye si llegan
  if (!fresco) {
    try {
      const r = await conTimeout(cfg.run(), 25000);
      if (r && r.jugadores && r.jugadores.length) {
        const jug = curar(r.jugadores, cfg);   // regla: solo los buenos, ordenados, máx 9
        CACHE.set(sport, { jugadores: jug, meta: r.meta, ts: Date.now() });
        pintarGrid(cont, cfg, jug, r.meta, false);
      } else {
        // Sin datos en vivo -> muestra el respaldo (para no dejar la sección cargando en vacío)
        pintarGrid(cont, cfg, cfg.demo, { fecha: hoyISO() }, true);
      }
    } catch (_) {
      // Falló/expiró -> respaldo (así goals/points/shots nunca quedan en blanco)
      pintarGrid(cont, cfg, cfg.demo, { fecha: hoyISO() }, true);
    }
  }
}
