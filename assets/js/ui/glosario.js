/* =====================================================================
   Glosario — referencia corporativa de Sports Expectations.
   Explica la estadistica en cristiano, con la MISMA identidad visual de la
   plataforma: navy profundo, dorado de marca, Chakra Petch en titulos, claves
   tipo chip. Bilingue. Cero costo de datos (contenido propio).
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
    { t: { en: 'OPS', es: 'OPS' }, d: { en: 'On-base plus slugging: how much a hitter reaches base and hits for power, in one number. Higher is better.', es: 'Embasarse mas poder, en un solo numero. Mientras mas alto, mejor bateador.' } },
    { t: { en: 'ERA', es: 'ERA · Efectividad' }, d: { en: 'Earned runs a pitcher allows per 9 innings. Lower is better; under 3.00 is strong.', es: 'Carreras limpias que permite un lanzador por cada 9 entradas. Mas bajo es mejor; bajo 3.00 es fuerte.' } },
    { t: { en: 'WHIP', es: 'WHIP' }, d: { en: 'Base runners a pitcher allows per inning (walks + hits). Lower is better.', es: 'Corredores que permite un lanzador por entrada (boletos + hits). Mas bajo es mejor.' } },
    { t: { en: 'Hit', es: 'Hit · Imparable' }, d: { en: 'A batted ball that lets the hitter reach base safely.', es: 'Batazo que le permite al bateador llegar a base a salvo.' } },
  ] },
  { grupo: { en: 'Basketball', es: 'Basquet' }, items: [
    { t: { en: 'PPG · Points per game', es: 'PPG · Puntos por juego' }, d: { en: "A player's scoring average per game.", es: 'El promedio de puntos del jugador por partido.' } },
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
    { t: { en: 'S/G · Shots per game', es: 'S/G · Tiros por juego' }, d: { en: "A player's shots on goal per game, on average.", es: 'Tiros a puerta de un jugador por partido, en promedio.' } },
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
  .gl-ov{position:fixed;inset:0;z-index:1200;background:rgba(4,7,12,.74);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;transition:opacity .2s}
  .gl-ov.on{opacity:1}
  .gl-modal{width:100%;max-width:580px;max-height:88vh;display:flex;flex-direction:column;background:var(--tarjeta);border:1px solid var(--linea);border-radius:20px;overflow:hidden;box-shadow:var(--sombra);transform:translateY(12px);transition:transform .22s}
  .gl-ov.on .gl-modal{transform:translateY(0)}
  /* Encabezado corporativo: banda navy con filo dorado */
  .gl-head{position:relative;padding:20px 22px 18px;background:linear-gradient(135deg,#16202f 0%,#0f1826 60%);border-bottom:1px solid var(--linea)}
  .gl-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--oro),var(--oro-2))}
  .gl-eyebrow{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--oro);margin-bottom:9px}
  .gl-eyebrow svg{width:14px;height:14px}
  .gl-titrow{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
  .gl-head h3{margin:0;font-family:var(--display);font-weight:800;font-size:25px;line-height:1;color:var(--tinta);letter-spacing:.01em}
  .gl-head p{margin:7px 0 0;font-size:12.5px;color:var(--tinta-2);max-width:88%}
  .gl-x{flex:0 0 auto;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--linea);background:rgba(0,0,0,.25);color:var(--tinta-2);cursor:pointer;transition:all .15s}
  .gl-x:hover{border-color:var(--oro);color:var(--oro)}
  .gl-x svg{width:16px;height:16px}
  .gl-search{padding:14px 22px 2px}
  .gl-search-in{display:flex;align-items:center;gap:9px;height:42px;padding:0 13px;background:var(--fondo-2);border:1px solid var(--linea);border-radius:11px;box-shadow:var(--sombra-input);transition:border-color .15s}
  .gl-search-in:focus-within{border-color:var(--oro)}
  .gl-search-in svg{width:16px;height:16px;color:var(--tinta-3);flex:0 0 auto}
  .gl-search-in input{flex:1;background:none;border:0;outline:none;color:var(--tinta);font-size:14px;font-family:var(--sans)}
  .gl-body{overflow-y:auto;padding:6px 22px 22px}
  .gl-grp{margin-top:18px}
  .gl-grp-t{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:700;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--oro);margin:0 0 4px}
  .gl-grp-t::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--oro-suave),transparent)}
  .gl-it{padding:13px 0 13px 14px;border-left:2px solid transparent;border-bottom:1px solid var(--linea-suave);transition:border-color .15s,background .15s;border-radius:0 8px 8px 0}
  .gl-it:last-child{border-bottom:0}
  .gl-it:hover{border-left-color:var(--oro);background:var(--oro-suave)}
  .gl-it-h{display:flex;align-items:center;gap:9px;margin-bottom:5px;flex-wrap:wrap}
  .gl-key{font-family:var(--display);font-weight:800;font-size:12px;letter-spacing:.04em;color:var(--oro);background:var(--oro-suave);border:1px solid rgba(232,184,75,.28);padding:2px 9px;border-radius:7px}
  .gl-term{font-family:var(--display);font-weight:700;font-size:15px;color:var(--tinta)}
  .gl-def{display:block;font-size:13px;line-height:1.55;color:var(--tinta-2)}
  .gl-empty{padding:34px 0;text-align:center;color:var(--tinta-3);font-size:13px}
  @media(max-width:560px){.gl-modal{max-height:92vh}.gl-head h3{font-size:22px}.gl-head p{max-width:100%}}
  `;
  document.head.appendChild(st);
}

const IC_STATS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`;
const IC_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
const IC_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function termoHTML(it) {
  const full = L(it.t.en, it.t.es);
  const parts = full.split(' · ');
  const key = parts.length > 1 ? parts[0] : null;
  const name = parts.length > 1 ? parts.slice(1).join(' · ') : full;
  return `<div class="gl-it">
    <div class="gl-it-h">${key ? `<span class="gl-key">${esc(key)}</span>` : ''}<span class="gl-term">${esc(name)}</span></div>
    <span class="gl-def">${esc(L(it.d.en, it.d.es))}</span>
  </div>`;
}

function cuerpoHTML(filtro) {
  const q = String(filtro || '').trim().toLowerCase();
  let hay = false;
  const grupos = GLOSARIO.map(g => {
    const items = g.items.filter(it => !q || (L(it.t.en, it.t.es) + ' ' + L(it.d.en, it.d.es)).toLowerCase().includes(q));
    if (!items.length) return '';
    hay = true;
    return `<div class="gl-grp"><div class="gl-grp-t">${esc(L(g.grupo.en, g.grupo.es))}</div>${items.map(termoHTML).join('')}</div>`;
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
        <div class="gl-eyebrow">${IC_STATS}${L('Sports Expectations · Reference', 'Sports Expectations · Referencia')}</div>
        <div class="gl-titrow">
          <div>
            <h3>${esc(L('Glossary', 'Glosario'))}</h3>
            <p>${esc(L('Every stat we use, in plain words. Know what you are betting on.', 'Cada estadistica que usamos, en cristiano. Sabe sobre que estas apostando.'))}</p>
          </div>
          <button class="gl-x" id="gl-x" aria-label="${esc(L('Close', 'Cerrar'))}">${IC_X}</button>
        </div>
      </div>
      <div class="gl-search"><div class="gl-search-in">${IC_SEARCH}<input id="gl-q" type="text" placeholder="${esc(L('Search a term…', 'Busca un termino…'))}" autocomplete="off"></div></div>
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
