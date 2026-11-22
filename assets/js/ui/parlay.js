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
import { topGoalProjection, topGoalsMatchProjection } from '../analisis/soccer-goal.js';
import { topPointsProjection } from '../analisis/nba-points.js';
import { topShotsProjection } from '../analisis/nhl-shots.js';
import { topTouchdownProjection } from '../analisis/nfl-touchdowns.js';
import { eliteDelDia } from '../analisis/elite.js';
import { calendarioVacioHTML } from './calendario-vacio.js';
import { abrirTracker, abrirTrackerGoles } from './tracker.js';
import { idiomaActual } from './idioma.js';
import { clicMas, enSlip, pickKey, aSlipItem } from './pickem.js';

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
    factores:['Opponent 6.54 ERA, very hittable','Top of the order','LHB vs RHP'], riesgos:[] },
  { rank:2, nombre:'Bobby Witt Jr.', equipoAbrev:'KC', rivalAbrev:'TOR', prob:78, confianza:'media',
    tags:['RHP','Spencer Arrighetti · 4.73', () => L('Slot 2','Turno 2')],
    factores:['Elite contact and speed','Starter 4.73 ERA','Top of the order'], riesgos:[] },
  { rank:3, nombre:'Gabriel Moreno', equipoAbrev:'ARI', rivalAbrev:'SF', prob:77, confianza:'media',
    tags:['RHP','Landen Roupp · 4.34', () => L('Slot 5','Turno 5')],
    factores:['.303 AVG (7th in MLB)','Low strikeout rate','Opponent allows contact'], riesgos:[] },
];
const DEMO_SOCCER = [
  { rank:1, esPartido:true, nombre:'Bayern vs Leipzig', equipoAbrev:'BAY', rivalAbrev:'RBL', prob:86, proj:3.4, confianza:'alta',
    tags:[() => L('3.4 exp. goals','3.4 goles esp.'), () => L('Home side scores','Local anotador'), () => L('Leaky defenses','Defensas permeables')],
    factores:[L('Both teams average 2+ goals','Ambos promedian 2+ goles'), L('Open, attacking matchup','Cruce abierto y ofensivo')], riesgos:[] },
  { rank:2, esPartido:true, nombre:'Liverpool vs Everton', equipoAbrev:'LIV', rivalAbrev:'EVE', prob:79, proj:2.9, confianza:'alta',
    tags:[() => L('2.9 exp. goals','2.9 goles esp.'), () => L('Home side scores','Local anotador')],
    factores:[L('High-scoring home side','Local muy anotador')], riesgos:[] },
  { rank:3, esPartido:true, nombre:'Atalanta vs Roma', equipoAbrev:'ATA', rivalAbrev:'ROM', prob:74, proj:2.7, confianza:'media',
    tags:[() => L('2.7 exp. goals','2.7 goles esp.'), () => L('Away side scores','Visita que marca')],
    factores:[L('Both sides find the net often','Ambos ven puerta seguido')], riesgos:[] },
];
const DEMO_NBA = [
  { rank:1, nombre:'Elite Scorer', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:84, confianza:'media',
    tags:[() => L('31.2 proj','31.2 proy'), () => L('vs AWY · 119 allowed','vs AWY · 119 perm.'), '29.5 PPG'],
    factores:[L('Opponent allows 119 pts/game','El rival permite 119 pts/partido'), L('High-pace game','Partido de ritmo alto'), L('Plenty of minutes','Muchos minutos')], riesgos:[] },
  { rank:2, nombre:'Primary Option', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:69, confianza:'media',
    tags:[() => L('25.8 proj','25.8 proy'), () => L('vs OPP · 114 allowed','vs OPP · 114 perm.'), '25.0 PPG'],
    factores:[L('Scorer averaging 25.0','Anotador de 25.0 de promedio'), L('Heavy minutes','Muchos minutos')], riesgos:[] },
  { rank:3, nombre:'Secondary Scorer', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:55, confianza:'baja',
    tags:[() => L('21.4 proj','21.4 proy'), () => L('vs RVL · 116 allowed','vs RVL · 116 perm.'), '20.1 PPG'],
    factores:[L('Usage up with a starter out','Más protagonismo por una baja')], riesgos:[] },
];
const DEMO_NHL = [
  { rank:1, nombre:'Elite Shooter', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:92, confianza:'media',
    tags:[() => L('4.5 proj','4.5 proy'), () => L('vs AWY · 33 SA','vs AWY · 33 TC'), '4.0 S/G'],
    factores:[L('Opponent allows 33 shots/game','El rival permite 33 tiros/partido'), L('Plays at home','Juega en casa'), L('High shot volume','Alto volumen de tiro')], riesgos:[] },
  { rank:2, nombre:'Top Winger', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:71, confianza:'media',
    tags:[() => L('2.6 proj','2.6 proy'), () => L('vs OPP · 30 SA','vs OPP · 30 TC'), '2.6 S/G'],
    factores:[L('Steady shot volume','Volumen de tiro constante'), L('Power-play time','Minutos en power play')], riesgos:[] },
  { rank:3, nombre:'Two-way Center', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:58, confianza:'baja',
    tags:[() => L('2.1 proj','2.1 proy'), () => L('vs RVL · 29 SA','vs RVL · 29 TC'), '2.1 S/G'],
    factores:[L('Plays at home','Juega en casa')], riesgos:[] },
];
const DEMO_NFL = [
  { rank:1, nombre:'Red-zone Back', pos:'RB', equipoAbrev:'HOME', rivalAbrev:'AWY', prob:68, confianza:'media',
    tags:['RB', () => L('vs AWY · 3.2 TD/g allowed','vs AWY · 3.2 TD/j perm.'), '9 TD'],
    factores:[L('Opponent soft in the red zone','Rival blando en zona roja'), L('Plays at home','Juega en casa'), L('Goal-line role','Rol en la yarda uno')], riesgos:[] },
  { rank:2, nombre:'Star Receiver', pos:'WR', equipoAbrev:'CLB', rivalAbrev:'OPP', prob:52, confianza:'media',
    tags:['WR', () => L('vs OPP · 2.7 TD/g allowed','vs OPP · 2.7 TD/j perm.'), '7 TD'],
    factores:[L('Red-zone target','Objetivo en zona roja'), L('High target share','Muchos envíos')], riesgos:[] },
  { rank:3, nombre:'Big Tight End', pos:'TE', equipoAbrev:'TMX', rivalAbrev:'RVL', prob:41, confianza:'baja',
    tags:['TE', () => L('vs RVL · 2.5 TD/g allowed','vs RVL · 2.5 TD/j perm.'), '5 TD'],
    factores:[L('Plays at home','Juega en casa')], riesgos:[] },
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
      activo: true, img: 'fondo-goals.jpg', run: () => topGoalsMatchProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_SOCCER,
      eyebrow: L('Premium · Goals Projection', 'Premium · Proyección de Goles'),
      titulo: `${L('Goals', 'Goles')} <em>${L('today', 'de hoy')}</em>`,
      metric: 'P(2+ goals)', metricLabel: L('Chance of 2+ goals', 'Opción de 2+ goles'),
      lead: L('The matches with the highest estimated probability of seeing two or more goals today (Over 1.5, the most popular goals market).',
              'Los partidos con mayor probabilidad estimada de tener dos o más goles hoy (Over 1.5, el mercado de goles más popular).'),
      foot: L('Model probability estimates, not betting advice. Football is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El fútbol es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ (p.proj != null ? `${(+p.proj).toFixed(1)} ${L('exp. goals', 'goles esp.')}` : ''), (p.gfLocal != null ? `${p.equipoAbrev || 'H'} ${(+p.gfLocal).toFixed(1)} ${L('GF/g', 'GF/p')}` : ''), (p.gfVisita != null ? `${p.rivalAbrev || 'A'} ${(+p.gfVisita).toFixed(1)} ${L('GF/g', 'GF/p')}` : '') ].filter(Boolean) }),
    },
    nba: {
      activo: true, img: 'fondo-points.jpg', run: () => topPointsProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NBA,
      eyebrow: L('Premium · Points Projection', 'Premium · Proyección de Puntos'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('20+ point chances', 'opciones de 20+ pts')}</em>`,
      metric: 'P(20+ pts)', metricLabel: L('Chance of<br>20+ pts', 'Opción de<br>20+ pts'),
      lead: L('The players with the highest estimated probability of scoring 20 or more points.',
              'Los jugadores con mayor probabilidad estimada de anotar 20 o más puntos.'),
      foot: L('Model probability estimates, not betting advice. Basketball is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El baloncesto es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.proj} ${L('proj', 'proy')}`, (p.ptsPermRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.ptsPermRival).toFixed(0)} ${L('allowed', 'perm.')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.ppg != null ? `${(+p.ppg).toFixed(1)} PPG` : '') ].filter(Boolean) }),
    },
    nhl: {
      activo: true, img: 'fondo-shots.jpg', run: () => topShotsProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NHL,
      eyebrow: L('Premium · Shots Projection', 'Premium · Proyección de Tiros'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('2+ shot chances', 'opciones de 2+ tiros')}</em>`,
      metric: 'P(2+ SOG)', metricLabel: L('Chance of<br>2+ shots', 'Opción de<br>2+ tiros'),
      lead: L('The players with the highest estimated probability of registering 2 or more shots on goal.',
              'Los jugadores con mayor probabilidad estimada de registrar 2 o más tiros a puerta.'),
      foot: L('Model probability estimates, not betting advice. Hockey is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El hockey es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ `${p.proj} ${L('proj', 'proy')}`, (p.saRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.saRival).toFixed(0)} ${L('SA', 'TC')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.spg != null ? `${(+p.spg).toFixed(1)} S/G` : '') ].filter(Boolean) }),
    },
    nfl: {
      activo: true, img: 'fondo-touchdowns.jpg', run: () => topTouchdownProjection({ fecha: hoyISO(), n: 9 }), demo: DEMO_NFL,
      eyebrow: L('Premium · Touchdown Projection', 'Premium · Proyección de Touchdowns'),
      titulo: `${L('Top picks · Best', 'Top del día · Mejores')} <em>${L('touchdown chances', 'opciones de touchdown')}</em>`,
      metric: 'P(1+ TD)', metricLabel: L('Chance of<br>a TD', 'Opción de<br>un TD'),
      lead: L('The players with the highest estimated probability of scoring a touchdown (anytime TD scorer).',
              'Los jugadores con mayor probabilidad estimada de anotar un touchdown (anytime TD scorer).'),
      foot: L('Model probability estimates, not betting advice. Football is high-variance: a high probability is not a certainty.',
              'Estimaciones probabilísticas del modelo, no asesoría de apuestas. El fútbol americano es de alta varianza: una probabilidad alta no es certeza.'),
      toCard: (p) => ({ ...p, tags: p.tags || [ p.pos || 'RB', (p.tdPermRival != null ? `${L('vs', 'vs')} ${p.rivalAbrev} · ${(+p.tdPermRival).toFixed(1)} ${L('TD/g', 'TD/j')}` : `${L('vs', 'vs')} ${p.rivalAbrev || ''}`), (p.tdTot != null ? `${p.tdTot} TD` : '') ].filter(Boolean) }),
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
  .ply-hero{position:relative;border-radius:20px;overflow:hidden;margin-bottom:20px;isolation:isolate;border:none;background-size:cover;background-position:center;background-color:#070b12;aspect-ratio:1048/271;display:flex}
  .ply-hero::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:20px;box-shadow:inset 0 0 0 3px #070b12, inset 0 0 11px 3px rgba(7,11,18,.85)}
  .ply-hero-bg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;background-color:#0a1420}
  .ply-hero-veil{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,rgba(6,9,15,.9),rgba(6,9,15,.5) 46%,rgba(6,9,15,.12) 72%),linear-gradient(0deg,rgba(6,9,15,.7),transparent 46%)}
  .ply-nivel{position:absolute;top:14px;right:14px;z-index:4;display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:11px;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12px;letter-spacing:.06em;text-shadow:0 1px 2px rgba(0,0,0,.4)}
  .ply-nivel svg{width:15px;height:15px}
  .ply-nivel.pro{background:linear-gradient(180deg,#c6844a,#7a4a26);color:#ffe6c9;border:1px solid rgba(205,140,80,.7);box-shadow:0 3px 10px -3px rgba(120,74,38,.6),inset 0 1px 0 rgba(255,255,255,.2)}
  .ply-nivel.prem{background:linear-gradient(180deg,#e8c46a,#96661e);color:#3a2800;border:1px solid rgba(232,196,106,.8);box-shadow:0 3px 10px -3px rgba(150,110,30,.5),inset 0 1px 0 rgba(255,255,255,.3)}
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
  .ply-skel{border:1px solid var(--line);border-radius:16px;padding:16px;position:relative;overflow:hidden;background:rgba(255,255,255,.02)}
  .ply-skel::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);transform:translateX(-100%);animation:ply-shimmer 1.25s infinite}
  .sk-el{background:rgba(255,255,255,.07);border-radius:8px;display:block}
  .sk-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .sk-rank{width:34px;height:34px;border-radius:9px}
  .sk-when{width:86px;height:16px;border-radius:7px}
  .sk-match{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
  .sk-logo{width:44px;height:44px;border-radius:50%}
  .sk-vs{width:24px;height:12px}
  .sk-line{height:12px;border-radius:6px;margin-bottom:10px}
  .sk-line.w1{width:72%}.sk-line.w2{width:46%}
  .sk-btn{height:38px;border-radius:10px;margin-top:16px}
  @keyframes ply-shimmer{100%{transform:translateX(100%)}}
  .elite-loadwrap{margin-top:16px}
  .ply-c{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;padding:18px 18px 16px;overflow:hidden;cursor:pointer;height:100%;
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
  .ply-mt{font-size:13.5px;color:#d4dce8;font-weight:700;margin-top:4px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .ply-mt b{color:var(--oro)}
  .ply-mt .vs{color:#8a94a3;font-weight:600;font-size:12px}
  .ply-mt .ply-when{font-size:10.5px;letter-spacing:.03em;color:#0f1622;font-weight:800;background:linear-gradient(180deg,#e8c46a,#cfa63f);border-radius:6px;padding:3px 8px;text-transform:uppercase}
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
  .ply-cg{text-align:center}
  .plyg-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:10px}
  .plyg-top .ply-rank{justify-self:start}
  .plyg-when{justify-self:center;font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#0f1622;background:linear-gradient(180deg,#e8c46a,#cfa63f);border-radius:6px;padding:3px 10px;white-space:nowrap}
  .plyg-top .ply-conf{justify-self:end;margin-left:0}
  .plyg-match{display:flex;align-items:center;justify-content:center;gap:14px;margin:4px 0 14px}
  .plyg-side{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1 1 0;min-width:0}
  .plyg-logo{width:58px;height:58px;display:grid;place-items:center}
  .plyg-logo img{max-width:100%;max-height:100%;object-fit:contain}
  .plyg-fb{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid var(--line);display:grid;place-items:center;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:16px;color:var(--tx2)}
  .plyg-nm{font-size:12.5px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.15}
  .plyg-vs{flex:0 0 auto;width:50px;height:50px;object-fit:contain}
  .plyg-prob{margin:2px 0 12px}
  .plyg-prob b{display:block;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:42px;line-height:1;background:linear-gradient(180deg,#f6e2a6,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .plyg-prob span{display:block;font-size:11px;color:var(--tx3);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
  .plyg-bars{display:flex;flex-direction:column;gap:11px;margin:2px 0 14px}
  .plyg-bar-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
  .plyg-bar-top span{font-size:12.5px;color:var(--tx2);font-weight:600}
  .plyg-bar-top b{font-family:"Chakra Petch",sans-serif;font-size:16px;color:var(--tx)}
  .plyg-bar-tr{height:9px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}
  .plyg-bar-tr u{display:block;height:100%;border-radius:6px}
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
  .ply-actions{display:flex;gap:8px;margin-top:auto;padding-top:15px;align-items:stretch}
  .ply-actions .ply-analyze{margin-top:0;flex:1 1 auto}
  .ply-share{flex:0 0 auto;width:46px;display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#25d366,#11924c);color:#fff;border:0;border-radius:10px;cursor:pointer;transition:filter .15s,transform .1s;box-shadow:0 3px 11px rgba(18,140,75,.38)}
  .ply-share:hover{filter:brightness(1.07);transform:translateY(-1px)}
  .ply-share:active{transform:translateY(0) scale(.97)}
  .ply-share svg{width:21px;height:21px}
  .ply-slip{flex:0 0 auto;width:46px;display:flex;align-items:center;justify-content:center;background:var(--fondo-2,#0e131c);color:var(--oro,#e8c46a);border:1px solid rgba(232,184,75,.45);border-radius:10px;cursor:pointer;transition:all .15s}
  .ply-slip svg{width:22px;height:22px}
  .ply-slip:hover{border-color:var(--oro,#e8c46a);background:var(--oro-suave,rgba(232,184,75,.14))}
  .ply-slip.on{background:linear-gradient(135deg,var(--oro,#e8c46a),#f6e2a6);color:#241a06;border-color:transparent;box-shadow:0 3px 10px rgba(232,184,75,.3)}
  .ply-slip:active{transform:scale(.96)}
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
const IC_MAS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const IC_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
/* Boton "+" para agregar un pick a la combinada (pick'em). */
function botonSlip(p, cfg) {
  const k = pickKey(p, cfg);
  const en = enSlip(k);
  return `<button class="ply-slip ${en ? 'on' : ''}" data-slip="${p.rank}" data-slipkey="${esc(k)}" aria-label="${L('Add to pick’em', 'Agregar a la combinada')}" title="Pick'em">${en ? IC_CHECK : IC_MAS}</button>`;
}
const IC_WA = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.1 1.6 5.9L4 29l8.3-2.2c1.7.9 3.6 1.4 5.5 1.4h.2C24.6 28.2 30 22.8 30 16.2 30 9.6 24.6 3 16 3zm0 22.9h-.1c-1.7 0-3.4-.5-4.9-1.4l-.3-.2-4.9 1.3 1.3-4.8-.2-.4c-1-1.6-1.5-3.4-1.5-5.3C5.2 10 10 5.2 16 5.2s10.8 4.8 10.8 10.8S22 25.9 16 25.9z"/><path d="M22 18.3c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.8.6-.1 1.9-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>`;
/* Compartir un pick como IMAGEN de marca (hoja nativa en movil con el archivo
   para WhatsApp/TikTok/IG; en escritorio descarga la imagen y abre WhatsApp).
   Jugador -> imagen de prop; partido de goles -> imagen de goles. */
async function compartirPick(j, cfg) {
  if (!j) return;
  try {
    const mod = await import('./compartir.js');
    if (j.esPartido) mod.compartirGoles({ ...j, veredictoTxt: analisisGoles(j, ES()) });
    else mod.compartirJugador(j, cfg);
  } catch (_) {}
}

const APUESTAS = [
  { id: 'hits', cls: 'hits', label: () => L('Hits', 'Hits') },
];
function betTabsHTML(activo) {
  if (APUESTAS.length < 2) return '';   // con una sola apuesta no hace falta barra de pestañas
  const act = activo || 'hits';
  return `<div class="ply-tabs">${APUESTAS.map(t =>
    `<button class="ply-tab ${t.cls}${t.id === act ? ' on' : ''}" data-bet="${t.id}"><span class="ply-tab-l">${t.label()}</span></button>`
  ).join('')}</div>`;
}

function heroHTML(cfg, meta, cargando, variante) {
  const noun = String(cfg.metricLabel || '').replace(/<br>/g, ' ').trim();
  const nMostrar = cfg._count != null ? cfg._count : (cargando ? null : 0);
  const chips = [
    `<span>${L('Date', 'Fecha')} · <b>${esc(meta.fecha)}</b></span>`,
    (nMostrar > 0 ? `<span class="ply-count-chip"><b>${nMostrar}</b> ${L('players', 'jugadores')} · ${esc(noun)}</span>` : ''),
  ].filter(Boolean).join('');
  const posBg = cfg._sport === 'mlb' ? '75%' : '72%';   // móvil: mueve la foto para que salga el atleta
  const corona = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16l-1.2-8-4.3 3-2.5-5-2.5 5-4.3-3z"/></svg>';
  const badge = cfg._modo === 'pro'
    ? `<span class="ply-nivel pro">${corona}PRO</span>`
    : `<span class="ply-nivel prem">${corona}PREMIUM</span>`;
  return `<div class="ply-hero" style="background-image:url('${imgURL(cfg)}');background-position:${posBg} center">
    <div class="ply-hero-veil"></div>
    ${badge}
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
  'P(1+ TD)': { hi: 46, mid: 36,
    alta:   { es: (pr) => `Fuerte candidato a anotar touchdown hoy (${pr}%).`,       en: (pr) => `Strong candidate to score a touchdown today (${pr}%).` },
    mod:    { es: (pr) => `Opciones reales de ver la end zone (${pr}%), sin garantías.`, en: (pr) => `Real shot at the end zone (${pr}%), no guarantees.` },
    parejo: { es: (pr) => `TD poco probable hoy (${pr}%): defensa rival dura.`,      en: (pr) => `TD unlikely today (${pr}%): tough rival defense.` },
    flojo:  { es: (pr) => `Muestra corta: este ${pr}% es poco fiable.`,             en: (pr) => `Small sample: this ${pr}% isn't reliable.` },
    solido: { es: ' Anotador a seguir.', en: ' A scorer to watch.' } },
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

/* Piso de probabilidad por mercado: por debajo de esto NO se muestra en Premium.
   Un 55% o un 5-de-10 es irrelevante para quien apuesta: es relleno. Cada mercado
   tiene su piso real (los jonrones y los goles de jugador son raros por naturaleza,
   por eso su piso es mas bajo, pero sigue siendo "lo fuerte" de ese mercado). */
const PISO = {
  'P(≥1 hit)': 64,     // hit: lo normal ronda 65%, lo fuerte 70%+
  'P(2+ goals)': 62,   // over 1.5 del partido: duelos con gol de sobra
  'P(20+ pts)': 63,    // anotadores de fiar
  'P(2+ SOG)': 64,     // volumen de tiro alto
  'P(1+ TD)': 62,      // corta el relleno de 55-61% que no sirve
  'P(1+ HR)': 28,      // el HR es raro: 28%+ ya es un bate de poder real
  'P(≥1 goal)': 42,    // jugador marca gol (mercado raro)
};

/* Curación (regla obligatoria): SOLO lo fuerte de verdad. Calidad, no cantidad:
   mejor 2 o 3 monstruos que rellenar con dudosos. Nunca se rellena por debajo del
   piso; si nadie califica, la vista queda vacía (con aviso claro), jamás con humo. */
function curar(jugadores, cfg) {
  let arr = (jugadores || []).slice();
  const porScore = arr.some(j => j.score != null);
  arr.sort((a, b) => porScore ? ((b.score || 0) - (a.score || 0)) : ((b.prob || 0) - (a.prob || 0)));
  const piso = PISO[cfg.metric] != null ? PISO[cfg.metric] : 60;
  const fuertes = arr.filter(j => (j.prob || 0) >= piso);
  return fuertes.slice(0, 9).map((j, i) => ({ ...j, rank: i + 1 }));
}


/* ============================================================
   ANÁLISIS DEL PICK ("por qué ESTE, HOY") — lee como un especialista
   del deporte, tejiendo jugador + debilidad del rival + el número.
   Determinista por jugador, combinatorio (nunca el mismo verso).
   Solo se usa en picks de alta confianza (los únicos que se muestran).
   ============================================================ */
function analisisPick(p, cfg) {
  const es = ES();
  const L2 = (en, esT) => es ? esT : en;
  const nom = (p.nombre || '').split(' ').slice(-2).join(' ');
  const riv = p.rivalAbrev || L2('the opponent', 'el rival');
  const pr = p.prob;
  const M = cfg.metric;
  const h = p.hist || null;

  // Vocabulario por deporte (la linea y la unidad reales).
  const VOC = {
    'P(20+ pts)': { linea: L2('20 points', '20 puntos'), u: L2('points', 'puntos') },
    'P(≥1 hit)':  { linea: L2('a hit', 'un hit'),         u: L2('hits', 'hits') },
    'P(2+ SOG)':  { linea: L2('2 shots', '2 tiros'),      u: L2('shots', 'tiros') },
    'P(1+ TD)':   { linea: L2('a touchdown', 'un touchdown'), u: '' },
    'P(2+ goals)':{ linea: L2('2 goals', '2 goles'),      u: L2('goals', 'goles') },
  }[M] || { linea: L2('the line', 'la línea'), u: '' };

  // Semilla que incluye los NUMEROS del jugador y el rank -> cada tarjeta es unica.
  const sem = String((p.nombre || '') + riv + M + (h ? `${h.aciertos}.${h.muestra}.${h.mejor}` : pr) + (p.rank || ''));
  let hs = 0; for (let i = 0; i < sem.length; i++) hs = (hs * 131 + sem.charCodeAt(i)) & 0x7fffffff;
  const pick = (arr, salt) => arr[(((hs ^ (salt * 2654435761)) >>> 0)) % arr.length];

  if (h && h.muestra) {
    // Parrafo basado en el HISTORIAL REAL: nunca el mismo (los numeros cambian) y variado.
    const rec = pick([
      L2(`${nom} has cleared ${VOC.linea} in ${h.aciertos} of his last ${h.muestra}`, `${nom} ha superado ${VOC.linea} en ${h.aciertos} de sus últimos ${h.muestra}`),
      L2(`In his last ${h.muestra} games, ${nom} got there ${h.aciertos} times`, `En sus últimos ${h.muestra} partidos, ${nom} lo logró ${h.aciertos} veces`),
      L2(`${h.aciertos} of ${nom}'s last ${h.muestra} went over ${VOC.linea}`, `${h.aciertos} de los últimos ${h.muestra} de ${nom} pasaron de ${VOC.linea}`),
      L2(`The tape backs ${nom}, ${h.aciertos} games over ${VOC.linea} in his last ${h.muestra}`, `La evidencia respalda a ${nom}, ${h.aciertos} partidos sobre ${VOC.linea} en sus últimos ${h.muestra}`),
      L2(`${nom} keeps hitting it, ${h.aciertos} times in his last ${h.muestra}`, `${nom} lo sigue cumpliendo, ${h.aciertos} veces en sus últimos ${h.muestra}`),
      L2(`Look at the run: ${nom} cleared ${VOC.linea} in ${h.aciertos} of ${h.muestra}`, `Mira la racha, ${nom} superó ${VOC.linea} en ${h.aciertos} de ${h.muestra}`),
      L2(`Over his last ${h.muestra}, ${nom} delivered ${h.aciertos} times`, `En sus últimos ${h.muestra}, ${nom} respondió ${h.aciertos} veces`),
    ], 3);
    const alto = (h.mejor && VOC.u) ? pick([
      L2(`, as high as ${h.mejor} ${VOC.u}`, `, con hasta ${h.mejor} ${VOC.u}`),
      L2(` (peak of ${h.mejor})`, ` (tope de ${h.mejor})`),
      L2(`, topping out at ${h.mejor} ${VOC.u}`, `, con un máximo de ${h.mejor} ${VOC.u}`),
      L2(`, including a ${h.mejor} ${VOC.u} ceiling`, `, con un techo de ${h.mejor} ${VOC.u}`),
      ``,
    ], 7) : '';
    const cierre = pick([
      L2(` At ${pr}%, the sample does the talking against ${riv}.`, ` Con ${pr}%, la muestra habla frente a ${riv}.`),
      L2(` That consistency is why he tops the board today, not a hunch.`, ` Esa constancia es por lo que encabeza el tablero hoy, no una corazonada.`),
      L2(` Measurable and repeatable, exactly what you pay for here.`, ` Medible y repetible, justo lo que pagas aquí.`),
      L2(` Against ${riv}, that track record is the real edge.`, ` Contra ${riv}, ese historial es la ventaja real.`),
      L2(` The matchup with ${riv} only adds to a number already earned.`, ` El cruce con ${riv} solo suma a un número ya ganado.`),
      L2(` At ${pr}%, this is form you can lean on, not a coin flip.`, ` Con ${pr}%, es forma en la que apoyarse, no un volado.`),
      L2(` The floor is high and the role is locked in against ${riv}.`, ` El piso es alto y el rol está fijo frente a ${riv}.`),
    ], 13);
    return `${rec}${alto}.${cierre}`;
  }

  // Sin historial (p.ej. mercados por partido): texto variado por jugador.
  return pick([
    L2(`${nom} profiles as the sharpest look here at ${pr}%.`, `${nom} es la opción más clara aquí con ${pr}%.`),
    L2(`At ${pr}%, ${nom} is the name to circle against ${riv}.`, `Con ${pr}%, ${nom} es el nombre a marcar frente a ${riv}.`),
    L2(`${nom} brings the role and the volume this spot rewards.`, `${nom} aporta el rol y el volumen que este cruce premia.`),
    L2(`Usage and matchup both favor ${nom} here, hence the ${pr}%.`, `El uso y el cruce favorecen a ${nom} aquí, de ahí el ${pr}%.`),
    L2(`${nom} sits at the top of this board for a reason at ${pr}%.`, `${nom} está arriba en este tablero por algo, con ${pr}%.`),
    L2(`The spot sets up well for ${nom} against ${riv}.`, `El escenario le sienta bien a ${nom} frente a ${riv}.`),
    L2(`${nom} gets the minutes and the touches this one calls for.`, `${nom} tiene los minutos y los balones que pide este partido.`),
  ], 5);
}

function veredicto(p, cfg) {
  const pr = p.prob, conf = p.confianza;
  const S = FRASES[cfg.metric] || FRASES._def;
  const baja = (conf === 'baja' || conf === 'muy baja');
  const muyBaja = conf === 'muy baja';
  // Texto SIEMPRE por jugador y variado (regla: nunca el mismo parrafo), y bilingue
  // (respeta el idioma elegido, no fuerza ingles). Antes, los picks que no eran de
  // alta confianza usaban una plantilla FIJA repetida y le pegaban el factor en
  // espanol (p.ej. "In favor: juega en casa"): esa era la fuente del parrafo igual
  // y del idioma mezclado. analisisPick arma el texto desde los datos del pick.
  const texto = analisisPick(p, cfg);
  let tono = 'medio';
  if (pr >= S.hi && !baja) tono = 'bueno';
  else if (muyBaja || pr < S.mid) tono = 'malo';
  return { texto, tono };
}

function horaPartido(cuando) {
  if (!cuando) return '';
  try {
    const d = new Date(cuando); if (isNaN(d)) return '';
    const hoy = new Date(); const mismo = d.toDateString() === hoy.toDateString();
    const man = new Date(hoy); man.setDate(hoy.getDate() + 1); const esMan = d.toDateString() === man.toDateString();
    const hora = d.toLocaleTimeString(ES() ? 'es' : 'en', { hour: 'numeric', minute: '2-digit' });
    if (mismo) return (ES() ? 'Hoy ' : 'Today ') + hora;
    if (esMan) return (ES() ? 'Mañana ' : 'Tomorrow ') + hora;
    const dia = d.toLocaleDateString(ES() ? 'es' : 'en', { weekday: 'short', day: 'numeric' });
    return dia + ' ' + hora;
  } catch (_) { return ''; }
}
/* Análisis de goles: humano, variado, sobre el PARTIDO (no un jugador). */
function analisisGoles(p, ES) {
  const L2 = (en, es) => ES ? es : en;
  const A = p.localNom || p.equipoAbrev || (ES ? 'el local' : 'the home side');
  const B = p.visitaNom || p.rivalAbrev || (ES ? 'la visita' : 'the away side');
  const sem = String((p.equipoAbrev || '') + (p.rivalAbrev || '') + (p.prob || '') + (p.rank || ''));
  let h = 0; for (let i = 0; i < sem.length; i++) h = (h * 131 + sem.charCodeAt(i)) & 0x7fffffff;
  // Indices independientes y bien repartidos (sal distinta por ranura -> casi nunca se repiten dos tarjetas)
  const pick = (arr, salt) => arr[(((h ^ (salt * 2654435761)) >>> 0)) % arr.length];
  const alto = p.prob >= 78, medio = p.prob >= 66;
  const gfA = p.gfLocal, gfB = p.gfVisita, gaA = p.gaLocal, gaB = p.gaVisita;
  const ambosMarcan = (gfA != null && gfA >= 1.4) && (gfB != null && gfB >= 1.2);
  const defsFlojas = (gaA != null && gaA >= 1.4) || (gaB != null && gaB >= 1.4);

  // Apertura (varias, ninguna empieza con "vs")
  const abre = alto
    ? [ L2(`This one has goals written all over it.`, `Este partido tiene pinta de goles por todos lados.`),
        L2(`If you like watching the net bulge, circle this one.`, `Si te gusta ver el balón entrar, marca este.`),
        L2(`Everything here points to an open, high scoring night.`, `Todo aquí apunta a una noche abierta y de goles.`),
        L2(`Hard to see this one staying quiet.`, `Cuesta ver este cruce quedándose callado.`),
        L2(`${A} and ${B} both love a shootout, and tonight sets up for one.`, `A ${A} y a ${B} les va el ida y vuelta, y hoy se arma para eso.`),
        L2(`The setup screams goals from the first whistle.`, `El planteamiento grita goles desde el primer pitazo.`),
        L2(`Two sides that would rather outscore you than shut you down.`, `Dos equipos que prefieren superarte en goles que cerrarte el arco.`),
        L2(`This has the makings of an end to end watch.`, `Esto tiene pinta de un partido de pura ida y vuelta.`),
        L2(`Goals have followed both of these teams around all season.`, `Los goles han seguido a estos dos equipos toda la temporada.`) ]
    : medio
    ? [ L2(`There should be goals in this one, without being a certainty.`, `Debería haber goles en este, sin ser una certeza.`),
        L2(`The pieces are there for a couple of goals.`, `Las piezas están para un par de goles.`),
        L2(`Lean toward goals here, but keep your eyes open.`, `Inclínate por los goles aquí, pero con los ojos abiertos.`),
        L2(`A fair bet to open up, even if it takes a while.`, `Una apuesta razonable a que se abra, aunque tarde un poco.`),
        L2(`Goals feel more likely than not, with a touch of caution.`, `Los goles se sienten más probables que no, con algo de cautela.`),
        L2(`${A} against ${B} carries quiet over potential.`, `${A} contra ${B} trae potencial silencioso de over.`) ]
    : [ L2(`A tighter one, though a single goal is very likely.`, `Uno más cerrado, aunque un gol es muy probable.`),
        L2(`Don't expect a shootout, but goals aren't off the table.`, `No esperes una fiesta de goles, pero tampoco están descartados.`),
        L2(`Could stay low, yet one goal looks well within reach.`, `Puede quedarse bajo, pero un gol se ve al alcance.`),
        L2(`Cagey on paper, with a goal still the sensible call.`, `Trabado en el papel, con un gol como la lectura sensata.`) ];

  // Cuerpo con datos reales
  const cuerpo = [];
  if (ambosMarcan) cuerpo.push(pick([
    L2(`Both ${A} and ${B} find the net regularly, and that combination is exactly what feeds the over.`, `Tanto ${A} como ${B} ven puerta con regularidad, y esa combinación es justo lo que alimenta el over.`),
    L2(`Two attacks that show up week after week tend to produce, and these two do.`, `Dos ataques que aparecen semana tras semana suelen producir, y estos dos lo hacen.`),
    L2(`${A} scores at home and ${B} travels with bite, so goals tend to come from both ends.`, `${A} anota en casa y ${B} viaja con mordida, así que los goles suelen venir por los dos lados.`),
    L2(`When both teams carry this kind of scoring rate, the over usually takes care of itself.`, `Cuando ambos cargan este ritmo goleador, el over suele resolverse solo.`),
    L2(`Neither of these sides sits back, and that shared appetite is the engine of the pick.`, `Ninguno de estos equipos se echa atrás, y ese apetito compartido es el motor del pick.`)], 101));
  if (defsFlojas) cuerpo.push(pick([
    L2(`Neither back line has been a wall lately, which only helps the case.`, `Ninguna zaga ha sido un muro últimamente, lo que solo ayuda al argumento.`),
    L2(`There are cracks at the back on at least one side, and that usually shows up on the scoreboard.`, `Hay grietas atrás en al menos uno de los dos, y eso suele reflejarse en el marcador.`),
    L2(`The defending has been shaky enough that chances should be there for the taking.`, `La defensa ha estado floja como para que las ocasiones aparezcan.`),
    L2(`One of these rearguards keeps leaking, and good attacks punish that.`, `Una de estas defensas sigue filtrando, y los buenos ataques lo castigan.`),
    L2(`Soft spots at the back on both ends tilt this toward a busy scoreboard.`, `Puntos débiles atrás en ambos lados inclinan esto a un marcador movido.`)], 211));
  if (!cuerpo.length) cuerpo.push(pick([
    L2(`The scoring numbers on both sides make a couple of goals the sensible read.`, `Los números de goles de ambos hacen que un par de goles sea la lectura sensata.`),
    L2(`Recent scoring form is what tips this toward the over.`, `La forma goleadora reciente es lo que inclina esto hacia el over.`),
    L2(`The underlying numbers lean to goals even if the names don't jump out.`, `Los números de fondo se inclinan a goles aunque los nombres no salten.`),
    L2(`Pace and shot volume both point the same way here, toward the over.`, `El ritmo y el volumen de tiro apuntan al mismo lado, al over.`),
    L2(`Form over the last month reads like a side that keeps finding goals.`, `La forma del último mes se lee como la de un equipo que sigue encontrando goles.`)], 101));

  // Cierre con la probabilidad
  const cierra = alto
    ? pick([ L2(`At ${p.prob}%, the two goal line is one of the cleaner looks on today's board.`, `Con ${p.prob}%, la línea de dos goles es de las más limpias del día.`),
             L2(`${p.prob}% for 2+ is a number I trust here.`, `${p.prob}% de 2+ es un número en el que me fío aquí.`),
             L2(`At ${p.prob}%, this is about as solid as the goals market gets today.`, `Con ${p.prob}%, esto es de lo más sólido que da el mercado de goles hoy.`),
             L2(`${p.prob}% says the model likes it, and the eye test agrees.`, `${p.prob}% dice que al modelo le gusta, y la vista coincide.`),
             L2(`At ${p.prob}%, the over is the read I keep coming back to.`, `Con ${p.prob}%, el over es la lectura a la que vuelvo.`),
             L2(`The ${p.prob}% here is backed by both form and matchup.`, `El ${p.prob}% aquí lo respaldan la forma y el cruce.`)], 307)
    : pick([ L2(`${p.prob}% for 2+ isn't a lock, but it's fair value in a good spot.`, `${p.prob}% de 2+ no es seguro, pero es valor justo en un buen sitio.`),
             L2(`At ${p.prob}%, the edge is there without needing a goal fest.`, `Con ${p.prob}%, la ventaja está sin necesitar una fiesta de goles.`),
             L2(`${p.prob}% is a sensible number, not a sure thing, so size it right.`, `${p.prob}% es un número sensato, no una certeza, así que mídelo bien.`),
             L2(`At ${p.prob}%, treat it as a lean rather than a banker.`, `Con ${p.prob}%, tómalo como inclinación, no como fijo.`),
             L2(`${p.prob}% leaves room for a quiet night, but the value holds.`, `${p.prob}% deja margen para una noche callada, pero el valor aguanta.`),
             L2(`The ${p.prob}% read is modest and honest, which is the whole point.`, `La lectura de ${p.prob}% es modesta y honesta, que es justo el punto.`)], 307);

  return `${pick(abre, 0)} ${cuerpo.slice(0, 2).join(' ')} ${cierra}`;
}

/* Tarjeta a nivel de PARTIDO (Goals / Over 1.5): logos + VS + dos barras. */
function _goalLogo(url, ab) {
  return url
    ? `<span class="plyg-logo"><img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="plyg-fb" style="display:none">${esc(ab || '')}</span></span>`
    : `<span class="plyg-logo"><span class="plyg-fb" style="display:flex">${esc(ab || '')}</span></span>`;
}
function cardPartidoHTML(p, cfg) {
  const ES = idiomaActual() === 'es';
  const conf = confPorProb(p.prob, cfg);
  const cuando = horaPartido(p.cuando);
  const p05 = p.probOver05 != null ? p.probOver05 : null;
  const p15 = p.probOver15 != null ? p.probOver15 : p.prob;
  const barra = (lab, val, color) => `<div class="plyg-bar"><div class="plyg-bar-top"><span>${lab}</span><b>${val == null ? '—' : val + '%'}</b></div><div class="plyg-bar-tr"><u style="width:${val || 0}%;background:${color}"></u></div></div>`;
  return `<article class="ply-c ply-cg r${p.rank}" data-idx="${p.rank}">
    <div class="plyg-top"><div class="ply-rank">${p.rank}</div>${cuando ? `<span class="plyg-when">${esc(cuando)}</span>` : ''}</div>
    <div class="plyg-match">
      <div class="plyg-side">${_goalLogo(p.logoLocal, p.equipoAbrev)}<span class="plyg-nm">${esc(p.localNom || p.equipoAbrev || '')}</span></div>
      <img class="plyg-vs" src="assets/imagenes/vs.png" alt="vs" loading="lazy">
      <div class="plyg-side">${_goalLogo(p.logoVisita, p.rivalAbrev)}<span class="plyg-nm">${esc(p.visitaNom || p.rivalAbrev || '')}</span></div>
    </div>
    <div class="plyg-bars">
      ${barra(ES ? 'Al menos 1 gol' : 'At least 1 goal', p05, '#3ecf8e')}
      ${barra(ES ? '2 o más goles' : '2+ goals', p15, '#e8c46a')}
    </div>
    <div class="ply-verdict bueno">${esc(analisisGoles(p, ES))}</div>
    <span class="ply-conf ${conf}"><i></i>${L('Confidence', 'Confianza')} ${esc(confLabel(conf))}</span>
    <div class="ply-actions">
      <button class="ply-analyze" data-analyze="${p.rank}">${IC_LUPA}${L('Analyze · Goals', 'Analizar · Goles')}</button>
      ${botonSlip(p, cfg)}
      <button class="ply-share" data-share="${p.rank}" aria-label="${L('Share on WhatsApp', 'Compartir en WhatsApp')}" title="WhatsApp">${IC_WA}</button>
    </div>
  </article>`;
}

/* Frase clara de QUÉ hace el jugador (para el titular de la tarjeta). */
const QUE = {
  'P(≥1 hit)':  { en: 'to get a hit',        es: 'de conectar un hit' },
  'P(20+ pts)': { en: 'for 20+ points',      es: 'de anotar 20+ puntos' },
  'P(2+ SOG)':  { en: 'for 2+ shots',        es: 'de disparar 2+ veces a puerta' },
  'P(1+ TD)':   { en: 'to score a TD',       es: 'de anotar un touchdown' },
  'P(1+ HR)':   { en: 'to hit a home run',   es: 'de conectar un jonrón' },
};

function _plmLogo(url, ab) {
  return url
    ? `<span class="plm-logo"><img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><b style="display:none">${esc(ab || '')}</b></span>`
    : `<span class="plm-logo"><b style="display:flex">${esc(ab || '')}</b></span>`;
}

function cardHTML(p, cfg) {
  if (p.esPartido) return cardPartidoHTML(p, cfg);
  const ES = idiomaActual() === 'es';
  const conf = confPorProb(p.prob, cfg);
  const vd = veredicto({ ...p, confianza: conf }, cfg);
  const cuando = horaPartido(p.cuando);
  const que = QUE[cfg.metric] ? (ES ? QUE[cfg.metric].es : QUE[cfg.metric].en) : (cfg.metricLabel || '').replace(/<br>/g, ' ');
  const nomA = esc(p.nomLocal || p.equipoAbrev || ''), nomB = esc(p.nomVisita || p.rivalAbrev || '');
  return `<article class="ply-c r${p.rank}" data-idx="${p.rank}">
    <div class="ply-c-hd">
      <div class="ply-rank">${p.rank}</div>
      <div class="ply-idn"><div class="ply-nm">${esc(p.nombre)}</div></div>
      ${cuando ? `<span class="ply-when ply-when-r">${esc(cuando)}</span>` : ''}
    </div>
    <div class="ply-matchup">
      <div class="ply-mt-side">${_plmLogo(p.logoLocal, p.equipoAbrev)}<span class="plm-nm">${nomA}</span></div>
      <img class="ply-mt-vs" src="assets/imagenes/vs.png" alt="vs">
      <div class="ply-mt-side">${_plmLogo(p.logoVisita, p.rivalAbrev)}<span class="plm-nm">${nomB}</span></div>
    </div>
    <div class="ply-headline"><b class="ply-pct">${p.prob}%</b><span class="ply-what">${esc(que)}</span></div>
    <div class="ply-track"><div class="ply-fill" data-w="${p.prob}"></div></div>
    <div class="ply-verdict ${vd.tono}">${esc(vd.texto)}</div>
    <span class="ply-conf ${conf}"><i></i>${L('Confidence', 'Confianza')} ${esc(confLabel(conf))}</span>
    <div class="ply-actions">
      <button class="ply-analyze" data-analyze="${p.rank}">${IC_LUPA}${L('Analyze · Last 10', 'Analizar · Últimos 10')}</button>
      ${botonSlip(p, cfg)}
      <button class="ply-share" data-share="${p.rank}" aria-label="${L('Share on WhatsApp', 'Compartir en WhatsApp')}" title="WhatsApp">${IC_WA}</button>
    </div>
  </article>`;
}

function animar(cont) {
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; io.unobserve(e.target); } }), { threshold: .2 });
  cont.querySelectorAll('.ply-fill').forEach(b => io.observe(b));
}

function soonPanelHTML(bet) {
  const T = bet === 'hr' ? L('Home runs', 'Home runs') : L('Total bases', 'Bases totales');
  const D = bet === 'hr'
    ? L('The players most likely to hit a home run today, the most popular MLB prop. Building it now.',
        'Los jugadores con mayor probabilidad de pegar un cuadrangular hoy, el prop más popular de la MLB. En construcción.')
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
    if (chip && bet === 'hits') chip.innerHTML = `<b>${cfg._count != null ? cfg._count : ''}</b> ${L('players', 'jugadores')} · ${L('Chance of a hit', 'Opción de hit')}`;
    if (chip && bet === 'tb') chip.innerHTML = `${L('Total bases', 'Bases totales')} · ${L('coming soon', 'muy pronto')}`;
    if (chip && bet === 'hr') chip.innerHTML = hrCount != null
      ? `<b>${hrCount}</b> ${L('players', 'jugadores')} · ${L('Chance of a HR', 'Opción de HR')}`
      : `${L('Chance of a HR', 'Opción de HR')} · ${L('loading…', 'cargando…')}`;

    if (bet === 'hr' && !hrCargado) {
      hrCargado = true;
      const grid = cont.querySelector('[data-hr-grid]'); if (!grid) return;
      grid.innerHTML = skelCards(4);
      try {
        const cached = CACHE.get('mlb:hr');
        let jug;
        if (cached && Date.now() - cached.ts < 120000) jug = cached.jugadores;
        else {
          const r = await conTimeout(topHomeRuns({ fecha: hoyISO(), n: 5 }), 25000);
          jug = (r && r.jugadores) ? curar(r.jugadores, CFG_HR) : [];
          CACHE.set('mlb:hr', { jugadores: jug, ts: Date.now() });
        }
        hrCount = jug.length;
        if (chip) chip.innerHTML = `<b>${hrCount}</b> ${L('players', 'jugadores')} · ${L('Chance of a HR', 'Opción de HR')}`;
        grid.innerHTML = jug.length ? jug.map(p => cardHTML(p, CFG_HR)).join('')
          : `<div class="ply-note"><i></i>${L('No standout home run picks for today\u2019s games.', 'Hoy no hay bateadores que cumplan el nivel de HR.')}</div>`;
        animar(cont);
        grid.querySelectorAll('.ply-share[data-share]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); compartirPick(jug[+b.dataset.share - 1], CFG_HR); }));
        grid.querySelectorAll('.ply-slip[data-slip]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); const j = jug[+b.dataset.slip - 1]; if (j) clicMas(j, CFG_HR, b); }));
        grid.querySelectorAll('.ply-analyze[data-analyze]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); const j = jug[+b.dataset.analyze - 1]; if (j) abrirTracker(j, 'mlb', 'hr'); }));
        grid.querySelectorAll('.ply-c[data-idx]').forEach(el => el.addEventListener('click', () => { const j = jug[+el.dataset.idx - 1]; if (j) abrirTracker(j, 'mlb', 'hr'); }));
      } catch (_) {
        grid.innerHTML = `<div class="ply-note"><i></i>${L('Could not load home runs.', 'No se pudo cargar home runs.')}</div>`;
        hrCargado = false;
      }
    }
  }));
}

function sinJuegosHTML(cont, cfg, meta, brutos) {
  cfg._count = 0;   // sin picks -> sin chip de número
  const ES = idiomaActual() === 'es';
  const avisos = (meta && meta.avisos) || [];
  const av = avisos.join(' · ');
  let msg;
  if (brutos > 0) {
    // Hay jugadores candidatos, pero ninguno superó el umbral de alta confianza.
    msg = L(`There are games, but no pick clears our high-confidence bar today. We only show the very best, never filler.`,
            `Hay partidos, pero hoy ningún pick supera nuestro umbral de alta confianza. Solo mostramos lo mejor, nunca relleno.`);
  } else if (/sin juegos|no games/i.test(av)) {
    msg = L('No games for this sport today. Check back on a game day.', 'Hoy no hay partidos de este deporte. Vuelve un día de juego.');
  } else if (/sin datos de jugadores|sin roster|sin tiradores/i.test(av)) {
    msg = L('There are games, but player season stats are not available yet (likely preseason). This fills in once the season is underway.',
            'Hay partidos, pero aún no hay estadísticas de jugadores de la temporada (probablemente pretemporada). Se llenará cuando arranque la temporada.');
  } else {
    msg = L('No picks to show right now. Check back shortly.', 'No hay picks que mostrar ahora mismo. Vuelve en un rato.');
  }
  // Calendario horizontal (web): hoy + cuando vuelve la accion (proximo partido real).
  const calTitulo = (cfg.eyebrow || '').replace(/^\s*(Premium|Pro)\s*[·.]\s*/i, '');
  const cal = calendarioVacioHTML({ titulo: calTitulo, hoy: hoyISO(), proxima: (meta && meta.proxima) || null, contexto: (meta && meta.contexto) || null, nota: msg, idioma: ES ? 'es' : 'en' });
  cont.innerHTML = `<div class="ply">${heroHTML(cfg, { fecha: hoyISO() }, false)}<div style="margin-top:14px">${cal}</div></div>`;
}
function pintarGrid(cont, cfg, jugadores, meta, preliminar) {
  cfg._count = jugadores.length;
  const nota = preliminar
    ? ``
    : '';
  cont.innerHTML = `<div class="ply">
    ${heroHTML(cfg, meta, false, 'hits')}
    ${nota}
    <div class="ply-panel" data-bet-panel="hits"><div class="ply-grid">${jugadores.map(p => cardHTML(p, cfg)).join('')}</div></div>
    <div class="ply-foot">${esc(cfg.foot)}</div>
  </div>`;
  animar(cont);
  wireBets(cont);
  const abrir = (idx) => { const j = jugadores[idx - 1]; if (!j) return; if (j.esPartido) abrirTrackerGoles(j); else abrirTracker(j, cfg._sport); };
  cont.querySelectorAll('.ply-analyze[data-analyze]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); abrir(+b.dataset.analyze); }));
  cont.querySelectorAll('.ply-share[data-share]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); compartirPick(jugadores[+b.dataset.share - 1], cfg); }));
  cont.querySelectorAll('.ply-slip[data-slip]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); const j = jugadores[+b.dataset.slip - 1]; if (j) clicMas(j, cfg, b); }));
  cont.querySelectorAll('.ply-c[data-idx]').forEach(el => el.addEventListener('click', () => abrir(+el.dataset.idx)));
}

/* Promesa con límite de tiempo (para no colgar la carga) */
const conTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/* Esqueleto de carga: 9 tarjetas fantasma (nunca "solo 3") */
/* Skeleton con forma de tarjeta real (rank, logos, lineas, boton): la carga se
   siente intencional y premium, no un texto suelto. Se usa igual en Premium y Elite. */
function skelCards(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<div class="ply-skel">
    <div class="sk-top"><span class="sk-el sk-rank"></span><span class="sk-el sk-when"></span></div>
    <div class="sk-match"><span class="sk-el sk-logo"></span><span class="sk-el sk-vs"></span><span class="sk-el sk-logo"></span></div>
    <span class="sk-el sk-line w1"></span><span class="sk-el sk-line w2"></span>
    <span class="sk-el sk-btn"></span></div>`;
  return s;
}

function pintarCargando(cont, cfg) {
  cont.innerHTML = `<div class="ply">
    ${heroHTML(cfg, { fecha: hoyISO() }, true)}
    <div class="ply-note"><i></i>${L('Loading top picks for today…', 'Cargando los mejores del día…')}</div>
    <div class="ply-grid">${skelCards(4)}</div>
  </div>`;
}

/* ---------- API pública ---------- */
function limitarPro(jug, modo) {
  if (modo !== 'pro') return jug;
  return jug.slice(0, 1);   // Pro: SOLO 1 pick (el de mayor probabilidad/average)
}

/* Guarda el MEJOR pick del deporte (mayor prob) para la "combinada del dia" del
   pick'em. Solo escribe en localStorage; si algo falla, no afecta el render. */
function guardarMejorDelDia(cfg, jugadores) {
  try {
    if (!jugadores || !jugadores.length) return;
    const probDe = (x) => (x.probOver15 != null ? x.probOver15 : x.prob) || 0;
    const top = jugadores.slice().sort((a, b) => probDe(b) - probDe(a))[0];
    if (!top) return;
    const item = aSlipItem(top, cfg);
    if (!item || item.prob == null) return;
    const hoy = new Date().toISOString().slice(0, 10);
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem('se-mejores-v1') || '{}'); } catch (_) {}
    if (!raw || raw.fecha !== hoy || !raw.picks) raw = { fecha: hoy, picks: {} };
    raw.picks[cfg._sport || 'x'] = item;
    localStorage.setItem('se-mejores-v1', JSON.stringify(raw));
  } catch (_) {}
}

export async function pintarParlay(cont, { sport = 'mlb', nivel = 'basic', modo = 'premium', esPremium, abrirPlanes } = {}) {
  inyectarCSS();
  const cfg = VISTA(sport); cfg._sport = sport;
  if (esPremium === true && nivel === 'basic') nivel = 'premium';   // compat con la llamada vieja
  cfg._modo = modo;

  const permitido = (modo === 'pro') ? (nivel === 'pro' || nivel === 'premium') : (nivel === 'premium');
  if (!permitido) {
    const esPro = (modo === 'pro');
    const eyeb = esPro ? L('Pro', 'Pro') : L('Premium', 'Premium');
    const msg = esPro
      ? L('A daily selection of the top plays. Available on the Pro and Premium plans.', 'Una selección diaria de las mejores jugadas. Disponible en los planes Pro y Premium.')
      : L('Every day, the full board of highest-probability plays. Premium plan only.', 'Cada día, el tablero completo de jugadas con mayor probabilidad. Exclusivo del plan Premium.');
    const cta = esPro ? L('See Pro plan', 'Ver plan Pro') : L('See Premium plan', 'Ver plan Premium');
    cont.innerHTML = `<div class="ply"><div class="ply-lock ${esPro ? 'lock-pro' : 'lock-prem'}"><div class="ply-hero-bg" style="background-image:url('${imgURL(cfg)}')"></div><div class="ply-hero-veil"></div>
      <div class="ply-lock-in"><span class="ply-eyebrow"><i></i>${eyeb}</span>
        <h3>${esc((cfg.titulo || '').replace(/<[^>]+>/g, ''))}</h3>
        <p>${msg}</p>
        <button class="ply-cta" id="ply-cta">${cta}</button></div></div></div>`;
    const b = cont.querySelector('#ply-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }
  if (!cfg.activo) { cont.innerHTML = comingSoonHTML(cfg); return; }

  const cached = CACHE.get(sport);
  const fresco = cached && (Date.now() - cached.ts < 120000);
  if (fresco) { pintarGrid(cont, cfg, limitarPro(cached.jugadores, modo), cached.meta, false); guardarMejorDelDia(cfg, cached.jugadores); }
  else pintarCargando(cont, cfg);

  if (!fresco) {
    try {
      const r = await conTimeout(cfg.run(), 25000);
      const bruto = (r && r.jugadores) || [];
      if (bruto.length) {
        const jug = curar(bruto, cfg);
        if (jug.length) {
          CACHE.set(sport, { jugadores: jug, meta: r.meta, ts: Date.now() });
          pintarGrid(cont, cfg, limitarPro(jug, modo), r.meta, false);
          guardarMejorDelDia(cfg, jug);
        } else {
          sinJuegosHTML(cont, cfg, r.meta, bruto.length);   // hay candidatos pero ninguno pasa el umbral
        }
      } else {
        sinJuegosHTML(cont, cfg, r && r.meta, 0);
      }
    } catch (_) {
      sinJuegosHTML(cont, cfg, { avisos: ['Error al leer los datos'] }, 0);
    }
  }
}


/* ============================================================
   LA ÉLITE DEL DÍA — sección Premium: selección multideporte.
   ============================================================ */
const ELITE_ICO = { mlb: 'hit.png', soccer: 'goal.png', nba: 'puntos.png', nhl: 'shots.png', nfl: 'touchdowns.png' };
const ELITE_DEP = { mlb: { en: 'Baseball', es: 'Béisbol' }, soccer: { en: 'Soccer', es: 'Fútbol' }, nba: { en: 'Basketball', es: 'Básquet' }, nhl: { en: 'Hockey', es: 'Hockey' }, nfl: { en: 'Football', es: 'Fútbol Am.' } };

function _elLogo(url, ab) {
  return url
    ? `<span class="elp-team"><img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><b style="display:none">${esc(ab || '')}</b></span>`
    : `<span class="elp-team"><b style="display:flex">${esc(ab || '')}</b></span>`;
}

function elitePickCard(p, ES) {
  const L = (en, es) => ES ? es : en;
  const dep = ELITE_DEP[p._sport] ? (ES ? ELITE_DEP[p._sport].es : ELITE_DEP[p._sport].en) : '';
  const eti = p._etiqueta ? (ES ? p._etiqueta.es : p._etiqueta.en) : '';
  const pico = p._pico ? (ES ? p._pico.es : p._pico.en) : '';
  const ico = ELITE_ICO[p._sport] || 'hit.png';
  const nomA = esc(p.localNom || p.nomLocal || p.equipoAbrev || '');
  const nomB = esc(p.visitaNom || p.nomVisita || p.rivalAbrev || '');
  const quien = p.esPartido ? L('2+ goals in this match', '2+ goles en el partido') : esc(p.nombre || '');
  const apellido = esc((p.nombre || '').split(' ').slice(-1)[0]);
  const ctx = p.esPartido
    ? L('Both teams tend to score, so goals are the play here.', 'Ambos suelen marcar; los goles son la jugada aquí.')
    : L(`${apellido} is the player with the best chance ${pico} today.`, `El jugador ${apellido} es quien más probabilidad tiene ${pico} hoy.`);
  const logo = (url, ab) => url
    ? `<span class="elp-logo"><img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><b style="display:none">${esc(ab || '')}</b></span>`
    : `<span class="elp-logo"><b style="display:flex">${esc(ab || '')}</b></span>`;
  return `<div class="elp">
    <div class="elp-head"><img class="elp-ico" src="assets/imagenes/${ico}" alt=""><div class="elp-htx"><b>${esc(dep)}</b><span>${esc(eti)}</span></div></div>
    <div class="elp-teams">
      <div class="elp-t">${logo(p.logoLocal, p.equipoAbrev)}<span class="elp-tn">${nomA}</span></div>
      <img class="elp-vsimg" src="assets/imagenes/vs.png" alt="vs">
      <div class="elp-t">${logo(p.logoVisita, p.rivalAbrev)}<span class="elp-tn">${nomB}</span></div>
    </div>
    <div class="elp-pick">${quien}</div>
    <div class="elp-ctx">${ctx}</div>
    <div class="elp-prob"><b>${p.prob}%</b><i><u style="width:${p.prob}%"></u></i></div>
  </div>`;
}

export async function pintarElite(cont, { nivel = 'basic', abrirPlanes } = {}) {
  inyectarCSS();
  const ES = idiomaActual() === 'es';
  const L = (en, es) => ES ? es : en;
  const bg = "assets/imagenes/fondos/fondo-elite.jpg";
  const corona = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16l-1.2-8-4.3 3-2.5-5-2.5 5-4.3-3z"/></svg>';

  if (nivel !== 'premium') {
    cont.innerHTML = `<div class="ply"><div class="ply-lock lock-prem"><div class="ply-hero-bg" style="background-image:url('${bg}')"></div><div class="ply-hero-veil"></div>
      <div class="ply-lock-in"><span class="ply-eyebrow"><i></i>Premium</span>
        <h3>${L("The Day's Elite", 'La Élite del Día')}</h3>
        <p>${L('The single best multi-sport selection of the day, only the clearest plays. Premium plan only.', 'La mejor selección multideporte del día, solo lo más evidente. Exclusivo del plan Premium.')}</p>
        <button class="ply-cta" id="ply-cta">${L('See Premium plan', 'Ver plan Premium')}</button></div></div></div>`;
    const b = cont.querySelector('#ply-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }

  const banner = `<div class="ply-hero" style="background-image:url('${bg}');background-position:65% center">
    <div class="ply-hero-veil"></div>
    <span class="ply-nivel prem">${corona}PREMIUM</span>
    <div class="ply-hero-in">
      <div class="ply-title">${L("The Day's", 'La Élite')} <em>${L('Elite', 'del Día')}</em></div>
      <div class="ply-lead">${L('One elite pick per sport, combined into a single multi-sport play. Only the clearest calls make the cut.', 'Un pick de élite por deporte, combinados en una sola jugada multideporte. Solo lo más evidente entra.')}</div>
    </div></div>`;
  cont.innerHTML = `<div class="ply">${banner}<div class="elite-loadwrap">
    <div class="ply-note"><i></i>${L("Building today's Elite…", 'Armando la Élite de hoy…')}</div>
    <div class="elite-grid">${skelCards(3)}</div></div></div>`;

  let r;
  try {
    r = await Promise.race([
      eliteDelDia(),
      new Promise(res => setTimeout(() => res({ picks: [], probComb: null, _timeout: true }), 16000)),
    ]);
  } catch (_) { r = { picks: [], probComb: null }; }
  const picks = r.picks || [];
  const slot = cont.querySelector('.elite-loadwrap'); if (!slot) return;
  if (!picks.length) {
    slot.outerHTML = `<div class="elite-empty">${L('No standout multi-sport plays today. The Elite only shows the clearest calls, so check back later.', 'Hoy no hay jugadas multideporte evidentes. La Élite solo muestra lo más claro, así que vuelve más tarde.')}</div>`;
    return;
  }
  const combo = r.probComb != null
    ? `<div class="elite-combo"><div class="elite-combo-l"><span>${L('Combined chance', 'Probabilidad combinada')}</span><small>${picks.length} ${L('sports · all must hit', 'deportes · deben cumplirse todos')}</small></div><b>${r.probComb}%</b></div>`
    : '';
  const cards = picks.map(p => elitePickCard(p, ES)).join('');
  const foot = L('Automated multi-sport selection from public data. An opinion and an estimate, not betting advice.', 'Selección multideporte automatizada a partir de datos públicos. Una opinión y una estimación, no asesoría de apuestas.');
  slot.outerHTML = `${combo}<div class="elite-grid">${cards}</div><div class="elite-foot">${foot}</div>`;
}
