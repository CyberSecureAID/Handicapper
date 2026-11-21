/* =====================================================================
   Glosario en espanol (y en ingles) — explica la estadistica en cristiano.
   Para el aficionado casual que quiere "sonar que sabe" sin ser experto.
   Cero costo de datos: es contenido propio, bilingue, en un modal limpio.
   ===================================================================== */
import { idiomaActual } from './idioma.js';

const L = (en, es) => (idiomaActual() === 'es' ? es : en);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GLOSARIO = [
  { grupo: { en: 'The basics', es: 'Lo basico' }, items: [
    { t: { en: 'Line', es: 'Linea' }, d: { en: 'The threshold we measure, for example 20+ points or 1+ hit. The pick is about beating it.', es: 'El umbral que medimos, por ejemplo 20+ puntos o 1+ hit. El pick es sobre superarlo.' } },
    { t: { en: 'Last 10', es: 'Ultimos 10' }, d: { en: "The player's real record in their 10 most recent games. Our probability comes straight from here, not from a hunch.", es: 'El rendimiento real del jugador en sus 10 partidos mas recientes. Nuestra probabilidad sale de aqui, no de una corazonada.' } },
    { t: { en: 'Probability', es: 'Probabilidad' }, d: { en: 'How often the player beat the line lately. Beating it in 7 of 10 games is about 70%.', es: 'Que tan seguido el jugador supero la linea ultimamente. Superarla en 7 de 10 es cerca de 70%.' } },
    { t: { en: 'Confidence', es: 'Confianza' }, d: { en: 'How solid the estimate is, based on how much real data backs it. More games, more confidence.', es: 'Que tan solida es la estimacion, segun cuantos datos reales la respaldan. Mas partidos, mas confianza.' } },
  ] },
  { grupo: { en: 'Baseball', es: 'Beisbol' }, items: [
    { t: { en: 'AVG · Batting average', es: 'AVG · Promedio' }, d: { en: 'How often a batter gets a hit. .300 is excellent, .250 is average.', es: 'Que tan seguido el bateador conecta hit. .300 es excelente, .250 es del monton.' } },
    { t: { en: 'ERA', es: 'ERA · Efectividad' }, d: { en: 'Earned runs a pitcher allows per 9 innings. Lower is better; under 3.00 is strong.', es: 'Carreras limpias que permite un lanzador por cada 9 entradas. Mas bajo es mejor; bajo 3.00 es fuerte.' } },
    { t: { en: 'Hit', es: 'Hit · Imparable' }, d: { en: 'A batted ball that lets the hitter reach base safely.', es: 'Batazo que le permite al bateador llegar a base a salvo.' } },
    { t: { en: 'WHIP', es: 'WHIP' }, d: { en: 'Base runners a pitcher allows per inning (walks + hits). Lower is better.', es: 'Corredores que permite un lanzador por entrada (boletos + hits). Mas bajo es mejor.' } },
  ] },
  { grupo: { en: 'Basketball', es: 'Basquet' }, items: [
    { t: { en: 'PPG · Points per game', es: 'PPG · Puntos por juego' }, d: { en: 'A player\'s scoring average per game.', es: 'El promedio de puntos del jugador por partido.' } },
    { t: { en: 'Points line', es: 'Linea de puntos' }, d: { en: 'The number a player needs to clear, like 20+ points.', es: 'El numero que el jugador debe superar, como 20+ puntos.' } },
  ] },
  { grupo: { en: 'Soccer', es: 'Futbol' }, items: [
    { t: { en: 'xG · Expected goals', es: 'xG · Goles esperados' }, d: { en: 'The quality of chances: how many goals a team "should" score from them.', es: 'La calidad de las ocasiones: cuantos goles "deberia" marcar un equipo con ellas.' } },
    { t: { en: 'GF/g · Goals for', es: 'GF/p · Goles a favor' }, d: { en: 'Goals a team scores per game, on average.', es: 'Goles que marca un equipo por partido, en promedio.' } },
    { t: { en: 'Over 1.5 goals', es: 'Mas de 1.5 goles' }, d: { en: 'That the match ends with 2 or more goals in total.', es: 'Que el partido termine con 2 o mas goles en total.' } },
    { t: { en: 'Possession', es: 'Posesion' }, d: { en: 'The share of the match a team has the ball.', es: 'El porcentaje del partido que un equipo tiene el balon.' } },
  ] },
  { grupo: { en: 'Ice hockey', es: 'Hockey' }, items: [
    { t: { en: 'Shots', es: 'Tiros' }, d: { en: 'Shots on goal. The shots line is like 2+ shots by a player.', es: 'Tiros a puerta. La linea de tiros es como 2+ tiros de un jugador.' } },
    { t: { en: 'S/G · Shots per game', es: 'S/G · Tiros por juego' }, d: { en: 'A player\'s shots on goal per game, on average.', es: 'Tiros a puerta de un jugador por partido, en promedio.' } },
  ] },
  { grupo: { en: 'American football', es: 'Futbol americano' }, items: [
    { t: { en: 'TD · Touchdown', es: 'TD · Touchdown' }, d: { en: 'A 6-point score. The TD line is a player scoring 1+ touchdown.', es: 'Una anotacion de 6 puntos. La linea de TD es que un jugador anote 1+ touchdown.' } },
    { t: { en: 'RB / WR', es: 'RB / WR' }, d: { en: 'Positions: running back (runner) and wide receiver (catcher).', es: 'Posiciones: running back (corredor) y wide receiver (receptor).' } },
  ] },
];

function inyectarEstilos() {
  if (document.getElementById('glosario-css')) return;
  const st = document.createElement('style');
  st.id = 'glosario-css';
  st.textContent = `
  .gl-ov{position:fixed;inset:0;z-index:1200;background:rgba(5,8,14,.72);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;transition:opacity .2s}
  .gl-ov.on{opacity:1}
  .gl-modal{width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;background:var(--tarjeta,#121722);border:1px solid var(--linea,#283040);border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.55);transform:translateY(10px);transition:transform .22s}
  .gl-ov.on .gl-modal{transform:translateY(0)}
  .gl-head{display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--linea,#283040)}
  .gl-head .gl-ic{flex:0 0 auto;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(145deg,#e8c46a,#c79a3c);color:#241a06}
  .gl-head .gl-ic svg{width:19px;height:19px}
  .gl-head h3{margin:0;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:17px;color:var(--tinta,#eef2f7);letter-spacing:.01em}
  .gl-head p{margin:1px 0 0;font-size:12px;color:var(--tinta-3,#9fb0c3)}
  .gl-x{margin-left:auto;flex:0 0 auto;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--linea,#283040);background:var(--fondo-2,#0e131c);color:var(--tinta-2,#c7d2df);cursor:pointer;transition:all .15s}
  .gl-x:hover{border-color:var(--oro,#e8c46a);color:var(--oro,#e8c46a)}
  .gl-x svg{width:16px;height:16px}
  .gl-search{padding:12px 20px 0}
  .gl-search input{width:100%;box-sizing:border-box;height:40px;padding:0 14px;background:var(--fondo-2,#0e131c);border:1px solid var(--linea,#283040);border-radius:10px;color:var(--tinta,#eef2f7);font-size:14px;outline:none}
  .gl-search input:focus{border-color:var(--oro,#e8c46a)}
  .gl-body{overflow-y:auto;padding:8px 20px 20px}
  .gl-grp{margin-top:16px}
  .gl-grp-t{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--oro,#e8c46a);margin:0 0 8px}
  .gl-it{padding:11px 0;border-top:1px solid var(--linea-2,rgba(120,140,170,.14))}
  .gl-it:first-child{border-top:0}
  .gl-it b{display:block;font-size:14px;color:var(--tinta,#eef2f7);margin-bottom:3px;font-weight:700}
  .gl-it span{display:block;font-size:13px;line-height:1.5;color:var(--tinta-2,#b9c6d6)}
  .gl-empty{padding:30px 0;text-align:center;color:var(--tinta-3,#9fb0c3);font-size:13px}
  @media(max-width:560px){.gl-modal{max-height:92vh}}
  `;
  document.head.appendChild(st);
}

const IC_LIBRO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 012-2h12"/></svg>`;
const IC_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function cuerpoHTML(filtro) {
  const q = String(filtro || '').trim().toLowerCase();
  let hay = false;
  const grupos = GLOSARIO.map(g => {
    const items = g.items.filter(it => {
      if (!q) return true;
      return (L(it.t.en, it.t.es) + ' ' + L(it.d.en, it.d.es)).toLowerCase().includes(q);
    });
    if (!items.length) return '';
    hay = true;
    return `<div class="gl-grp"><div class="gl-grp-t">${esc(L(g.grupo.en, g.grupo.es))}</div>${
      items.map(it => `<div class="gl-it"><b>${esc(L(it.t.en, it.t.es))}</b><span>${esc(L(it.d.en, it.d.es))}</span></div>`).join('')
    }</div>`;
  }).join('');
  return hay ? grupos : `<div class="gl-empty">${esc(L('No matches.', 'Sin resultados.'))}</div>`;
}

export function abrirGlosario() {
  inyectarEstilos();
  if (document.getElementById('gl-ov')) return;
  const ov = document.createElement('div');
  ov.className = 'gl-ov'; ov.id = 'gl-ov';
  ov.innerHTML = `
    <div class="gl-modal" role="dialog" aria-modal="true" aria-label="${esc(L('Glossary', 'Glosario'))}">
      <div class="gl-head">
        <span class="gl-ic">${IC_LIBRO}</span>
        <div><h3>${esc(L('Glossary', 'Glosario'))}</h3><p>${esc(L('The stats, in plain words.', 'La estadistica, en cristiano.'))}</p></div>
        <button class="gl-x" id="gl-x" aria-label="${esc(L('Close', 'Cerrar'))}">${IC_X}</button>
      </div>
      <div class="gl-search"><input id="gl-q" type="text" placeholder="${esc(L('Search a term…', 'Busca un termino…'))}" autocomplete="off"></div>
      <div class="gl-body" id="gl-body">${cuerpoHTML('')}</div>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  const cerrar = () => { ov.classList.remove('on'); setTimeout(() => ov.remove(), 200); };
  ov.querySelector('#gl-x').addEventListener('click', cerrar);
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
  const q = ov.querySelector('#gl-q');
  q.addEventListener('input', () => { ov.querySelector('#gl-body').innerHTML = cuerpoHTML(q.value); });
  document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc2); } });
}
