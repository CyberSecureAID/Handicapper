/* ============================================================
   VISTAS — HTML de la lista de partidos y del detalle.
   Renderiza los logos reales con respaldo (abreviatura) si falla la carga.
   ============================================================ */
import { IC } from './iconos.js';
import { t, Lg, idiomaActual } from './idioma.js';
import { figuraLado, fondoLado, figuraAbridor } from './figuras.js';
import { fotoJugador, cadenaFotoStr } from '../datos/fotos-jugadores.js';

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

/* ---- Tarjeta de un partido (lobby) — idéntica a la referencia ---- */
export function tarjetaPartido(p) {
  const ES = idiomaActual() === 'es';
  const vivo = p.estado === 'vivo';
  const m = p.mercado || {};
  const hayEmpate = m.empate != null;

  const icoReloj = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  const icoPin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>`;
  const icoInfo = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`;
  const icoStar = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8z"/></svg>`;
  const icoChev = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;

  const posLinea = (eq) => eq.posicion != null
    ? `${eq.posicion}° ${ES ? 'Posición' : 'Position'}`
    : (eq.division || (_recReal(eq.record) ? eq.record : '') || '');

  const logoBig = (eq) => eq.logo
    ? `<span class="pm-logo"><img src="${esc(eq.logo)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="pm-logo-fb" style="display:none">${esc(eq.abrev || '')}</span></span>`
    : `<span class="pm-logo"><span class="pm-logo-fb" style="display:flex">${esc(eq.abrev || '')}</span></span>`;

  const teamTx = (eq) => `<div class="pm-team-tx">
    <span class="pm-team-nm">${esc(eq.nombre)}</span>
    <span class="pm-team-pos">${esc(posLinea(eq))}</span></div>`;

  const col = (val, etq, clase) => `<div class="pm-prob-c ${clase}">
    <b>${val == null ? '--' : val + '%'}</b><span>${etq}</span>
    <i class="pm-bar"><u style="width:${val == null ? 0 : val}%"></u></i></div>`;

  // Color: entre LOCAL y VISITA, el menor = rojo, el mayor = azul.
  // El EMPATE siempre es gris.
  const claseLV = (mio, otro) => {
    if (mio == null || otro == null) return 'media';
    if (mio === otro) return 'media';
    return mio > otro ? 'alta' : 'baja';   // alta=azul, baja=rojo
  };

  return `
  <div class="pmatch" data-id="${esc(p.id)}">
    <div class="pm-liga">
      <div class="pm-liga-top">${ligaCuno(p)}<span class="pm-liga-nm">${esc(p.liga)}</span></div>
      <div class="pm-meta ${vivo ? 'vivo' : ''}">${icoReloj}<span>${esc(Lg(p.inicio))}</span></div>
      ${p.sede ? `<div class="pm-meta">${icoPin}<span>${esc(Lg(p.sede))}</span></div>` : ''}
    </div>

    <div class="pm-team l">${logoBig(p.local)}${teamTx(p.local)}</div>

    <div class="pm-prob">
      <div class="pm-prob-t">${ES ? 'Probabilidad estimada' : 'Estimated probability'} <span class="pm-info">${icoInfo}</span></div>
      <div class="pm-prob-cols">
        ${col(m.local, ES ? 'Local' : 'Home', claseLV(m.local, m.visita))}
        ${col(hayEmpate ? m.empate : null, ES ? 'Empate' : 'Draw', 'media')}
        ${col(m.visita, ES ? 'Visitante' : 'Away', claseLV(m.visita, m.local))}
      </div>
    </div>

    <div class="pm-team r">${teamTx(p.visita)}${logoBig(p.visita)}</div>

    <div class="pm-actions">
      <button class="pm-fav" data-fav="${esc(p.id)}" aria-label="Favorito">${icoStar}</button>
      <button class="pm-ver" data-ver="${esc(p.id)}">${ES ? 'Ver Análisis' : 'View Analysis'} ${icoChev}</button>
    </div>
  </div>`;
}

/* ============================================================
   PANEL DE COMPARACIÓN — réplica del panel deportivo de referencia.
   Pestañas centradas y funcionales · acciones (compartir/cerrar) a la
   derecha de la banda · sin scroll en escritorio · responsivo en móvil.
   ============================================================ */

function numDe(v) {
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/-?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : null;
}
function avatar(jug, ligaId) {
  if (!jug) return '';
  const url = fotoJugador(jug, ligaId);
  const ini = esc((jug.nombre || '?').trim().charAt(0).toUpperCase());
  if (url) return `<span class="hd-av"><img src="${esc(url)}" alt="" loading="lazy"
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="hd-av-i" style="display:none">${ini}</span></span>`;
  return `<span class="hd-av"><span class="hd-av-i" style="display:flex">${ini}</span></span>`;
}
const INV_STAT = /era|whip|error|contra|against|goles en contra|ponches recibidos/i;

/* onerror que prueba la siguiente URL de data-fb; si se acaban, muestra el respaldo. */
const FB_IMG = `(function(im){var l=(im.getAttribute('data-fb')||'').split('~~').filter(Boolean);if(l.length){im.setAttribute('data-fb',l.slice(1).join('~~'));im.src=l[0];}else{im.onerror=null;im.style.display='none';if(im.nextElementSibling)im.nextElementSibling.style.display='flex';}})(this)`;
/* Igual, pero para la foto grande del abridor: la última URL es la figura (siempre carga). */
const FB_PIT = `(function(im){var l=(im.getAttribute('data-fb')||'').split('~~').filter(Boolean);if(l.length){var n=l[0];im.setAttribute('data-fb',l.slice(1).join('~~'));if(n.indexOf('/imagenes/jugadores/')>-1)im.classList.add('is-figura');im.src=n;}else{im.onerror=null;}})(this)`;

/* ============================================================
   INFORME DE ANÁLISIS ("el cerebro") — v2. Genera un scouting report
   escrito, único, humano y con voz de ESPECIALISTA por cada partido.
   100% dentro del repo (sin IA externa). Razonamiento maduro: los datos
   y los jugadores se tejen como FACTORES de un caso, nunca como "fulano
   es bueno, gana su equipo". Ángulos propios por deporte. Combinatorio
   y determinista por partido.
   ============================================================ */
/* Récord con algún dígito distinto de cero (no "0-0-0" ni vacío). */
function _recReal(r) { return r && /\d+\s*[-\u2013]\s*\d+/.test(String(r)) && /[1-9]/.test(String(r)); }

function informeIA(p, ES) {
  const L = (en, es) => ES ? es : en;
  const m = p.mercado || {};
  const pl = m.local != null ? m.local : 50, pv = m.visita != null ? m.visita : 50;
  const favLocal = pl >= pv;
  const fav = favLocal ? p.local : p.visita, dog = favLocal ? p.visita : p.local;
  const probFav = Math.max(pl, pv), empate = m.empate;
  const fN = esc(fav.nombre || fav.abrev || '?'), dN = esc(dog.nombre || dog.abrev || '?');
  const sem = String((fav.abrev || '') + (dog.abrev || '') + (p.id || ''));
  let h = 0; for (let i = 0; i < sem.length; i++) h = (h * 33 + sem.charCodeAt(i)) & 0x7fffffff;
  const pick = (arr, off) => (arr && arr.length) ? arr[((h >> off) & 0x3fffffff) % arr.length] : '';
  const nivel = probFav >= 78 ? 'alto' : probFav >= 64 ? 'medio' : 'bajo';

  // ---- Deporte ----
  const dep = String(p.deporte || p.liga || '').toLowerCase();
  const D = /beis|mlb|base/.test(dep) ? 'beis' : /bask|nba/.test(dep) ? 'bask' : /hock|nhl/.test(dep) ? 'hoc' : /amer|nfl|rubio|gridiron/.test(dep) ? 'amer' : 'fut';
  const campo = { beis: L('at the plate','al bate'), bask: L('on the floor','en la duela'), hoc: L('on the ice','en el hielo'), amer: L('on the field','en el campo'), fut: L('on the pitch','en la cancha') }[D];

  // ---- Jugadores reales ----
  const ladoF = favLocal ? 'local' : 'visita', ladoD = favLocal ? 'visita' : 'local';
  const jugF = (p.jugadores && p.jugadores[ladoF]) || [], jugD = (p.jugadores && p.jugadores[ladoD]) || [];
  const batF = (p.bateadores && p.bateadores[ladoF]) || [], batD = (p.bateadores && p.bateadores[ladoD]) || [];
  const lesD = (p.lesionados && p.lesionados[ladoD]) || [];
  const estF = (D === 'beis' && batF[0]) || jugF[0] || null;
  const estD = (D === 'beis' && batD[0]) || jugD[0] || null;
  const lesion = lesD.find(l => /out|doubt|injur|baja|duda|question/i.test(l.estado || '')) || lesD[0] || null;
  const nom = (j) => esc(j && j.nombre ? j.nombre.split(' ').slice(-2).join(' ') : '');
  const statOk = (val) => val != null && val !== '' && /[1-9]/.test(String(val));   // stat con algún dígito real
  const st = (j) => (j && j.dato && statOk(j.dato)) ? `${esc(j.dato)}${j.etiqueta ? ' ' + esc(j.etiqueta) : ''}` : '';

  const partes = [];

  // ---- 1) APERTURA ----
  partes.push(pick({
    alto: [
      L(`Let's not overthink this one. ${fN} sits a level above ${dN}, and the numbers barely blink about it.`, `No le demos tantas vueltas. ${fN} está un escalón por encima de ${dN}, y los números apenas parpadean.`),
      L(`Every so often a game reads itself. This is one: ${fN} over ${dN}, and it isn't close on paper.`, `Cada tanto aparece un partido que se lee solo. Este es uno: ${fN} sobre ${dN}, y en el papel no está cerca.`),
      L(`If there's a spot to trust the process today, it's ${fN} against ${dN}. The gap is real and it's earned.`, `Si hay un sitio donde fiarse del proceso hoy, es ${fN} contra ${dN}. La diferencia es real y está ganada.`),
      L(`On form and on paper this tilts hard toward ${fN}. ${dN} has genuine work to do just to keep it honest.`, `Por forma y por papel esto se inclina fuerte hacia ${fN}. ${dN} tiene tarea de verdad solo para mantenerlo digno.`),
      L(`I'll be direct: ${dN} walks into a rough matchup, and ${fN} is the kind of side that makes those pay.`, `Voy directo: ${dN} entra en un cruce complicado, y ${fN} es del tipo que lo cobra.`)],
    medio: [
      L(`There's more here than the scoreline will suggest. ${fN} holds the edge over ${dN}, but it's the earn-it kind.`, `Hay más tela de la que dirá el marcador. ${fN} tiene la ventaja sobre ${dN}, pero del tipo que hay que ganarse.`),
      L(`${fN} is the side I lean on against ${dN}, though anyone calling it a lock is skipping a few steps.`, `${fN} es el lado por el que me inclino frente a ${dN}, aunque quien lo cante como seguro se está saltando pasos.`),
      L(`Form and table both nudge toward ${fN}, but ${dN} is not the sort of opponent you take lightly.`, `La forma y la tabla empujan hacia ${fN}, pero ${dN} no es rival para tomárselo a la ligera.`),
      L(`Sound rather than spectacular: ${fN} should get the better of ${dN}, and the case holds together.`, `Sólido más que espectacular: ${fN} debería llevarse lo mejor de ${dN}, y el caso se sostiene.`)],
    bajo: [
      L(`Coin-flip territory, and I won't dress it up. ${fN} earns the faintest of nods over ${dN}.`, `Terreno de moneda al aire, y no lo voy a maquillar. ${fN} se gana el favoritismo más leve sobre ${dN}.`),
      L(`Anyone selling certainty on ${fN} vs ${dN} is guessing with confidence. This is a genuine toss-up.`, `Cualquiera que venda certezas en ${fN} contra ${dN} adivina con seguridad. Esto es un volado de verdad.`),
      L(`No runaway here. ${fN} shades it, but ${dN} is right in the frame with them.`, `Nada de goleadas aquí. ${fN} lo saca por poco, pero ${dN} está en el cuadro con ellos.`)]
  }[nivel], 0));

  // ---- 2) EL CASO (datos tejidos, no sueltos) ----
  const casos = [];
  const recReal = (r) => r && /\d+\s*[-\u2013]\s*\d+/.test(String(r)) && /[1-9]/.test(String(r));   // debe verse como récord (X-Y) y no ser todo ceros
  if (recReal(fav.record) && recReal(dog.record)) casos.push(L(`the records set the tone, ${esc(fav.record)} against ${esc(dog.record)}`, `los récords marcan el tono, ${esc(fav.record)} contra ${esc(dog.record)}`));
  if (fav.posicion != null && dog.posicion != null && Number(fav.posicion) > 0 && Number(dog.posicion) > 0 && Number(fav.posicion) < Number(dog.posicion)) casos.push(L(`the table isn't lying, ${fav.posicion} against ${dog.posicion} is real distance`, `la tabla no miente, ${fav.posicion} contra ${dog.posicion} es distancia real`));
  const wp = (w) => { const n = Number(w); return isFinite(n) ? (n > 1.5 ? n / 100 : n) : NaN; };
  const wF = wp(fav.winPct), wD = wp(dog.winPct);
  if (isFinite(wF) && isFinite(wD) && wF > 0 && wF <= 1 && (wF - wD) >= 0.12) casos.push(L(`${fN} has simply converted more often over the stretch`, `${fN} ha convertido más seguido en el tramo`));
  // Sin datos duros -> el caso se apoya en el modelo y la forma, no en cifras vacías
  if (!casos.length) casos.push(pick([L(`the model leans this way on form and matchup, not on a gaudy record`, `el modelo se inclina así por forma y cruce, no por un récord llamativo`), L(`recent form and the matchup are what tip this one`, `la forma reciente y el cruce son lo que inclinan este`), L(`this one is about who's arriving in better shape`, `este va de quién llega en mejor forma`)], 5));
  const casa = favLocal ? L(` Home ground only firms it up.`, ` Jugar en casa solo lo afianza.`) : '';
  const abreCaso = pick([L('Start with the obvious', 'Empieza por lo obvio'), L('Here\u2019s the backbone of it', 'Aquí está la columna vertebral'), L('The foundation is simple', 'El cimiento es simple'), L('What tilts it', 'Lo que lo inclina'), L('Read it straight', 'Léelo directo'), L('The short version', 'La versión corta')], 7);
  partes.push(`${abreCaso}: ${pick(casos, 3)}.${casa} ${pick([
    L(`None of that guarantees anything, but it's the kind of foundation that usually holds.`, `Nada de eso garantiza nada, pero es de esos cimientos que suelen aguantar.`),
    L(`Take it as the frame of the game, not the final word.`, `Tómalo como el marco del partido, no como la última palabra.`),
    L(`It's a picture built from several pieces, which is exactly why I trust it more than a single number.`, `Es una foto armada de varias piezas, y justo por eso me fío más que de un solo número.`)], 8)}`);

  // ---- 3) ÁNGULO DE ESPECIALISTA (por deporte) + jugador como FACTOR ----
  const anguloDep = {
    beis: L(`In baseball it so often turns on the mound and whether the bats show up, so I look there first.`, `En béisbol tantas veces todo gira en la loma y en si aparecen los bates, así que ahí miro primero.`),
    fut: L(`Soccer is a game of fine margins, one moment, one set piece, and the plan changes, so I weigh who controls those margins.`, `El fútbol es un juego de márgenes finos: un momento, una jugada a balón parado, y el plan cambia, así que peso quién domina esos márgenes.`),
    bask: L(`Over forty-eight minutes, efficiency and depth tend to win out, so a single hot quarter rarely fools me.`, `En cuarenta y ocho minutos, la eficiencia y el fondo suelen imponerse, así que un cuarto caliente rara vez me engaña.`),
    hoc: L(`Hockey tightens around goaltending and special teams, and that's where I'd expect this to be decided.`, `El hockey se aprieta en el portero y en las jugadas especiales, y ahí espero que se decida.`),
    amer: L(`Football usually gets won up front and lost on turnovers, so I care less about the headline names than the margins.`, `El fútbol americano suele ganarse en la línea y perderse en las pérdidas de balón, así que me importan menos los nombres de portada que los márgenes.`)
  }[D];
  let bloque3 = anguloDep;
  if (estF && nom(estF)) {
    const s = st(estF);
    bloque3 += ' ' + pick([
      L(`It helps that ${campo}, ${nom(estF)}${s ? ` (${s})` : ''} gives ${fN} a reliable focal point, one more thing tilting the matchup rather than the whole argument.`, `Ayuda que ${campo}, ${nom(estF)}${s ? ` (${s})` : ''} le da a ${fN} un punto de apoyo fiable; una cosa más que inclina el cruce, no el argumento entero.`),
      L(`${nom(estF)}${s ? ` (${s})` : ''} is part of why ${fN} feels steadier, though I'd never hang a result on one name.`, `${nom(estF)}${s ? ` (${s})` : ''} es parte de por qué ${fN} se siente más firme, aunque jamás colgaría un resultado de un solo nombre.`),
      L(`And with ${nom(estF)} in form${s ? ` (${s})` : ''}, ${fN} has a card to play when the game gets tight, useful, not decisive on its own.`, `Y con ${nom(estF)} en forma${s ? ` (${s})` : ''}, ${fN} tiene una carta para el momento apretado; útil, no decisiva por sí sola.`)], 14);
  }
  partes.push(bloque3);

  // ---- 4) CONTRA-CASO (por qué el rival puede romperlo) ----
  const contra = [];
  if (lesion && nom(lesion)) contra.push(L(`It doesn't help ${dN} that ${nom(lesion)} is ${esc(lesion.estado || 'banged up')}, and depth gets tested in exactly these spots.`, `No le ayuda a ${dN} que ${nom(lesion)} esté ${esc(lesion.estado || 'tocado')}, y el fondo se pone a prueba justo en estos partidos.`));
  if (estD && nom(estD)) contra.push(L(`If there's a way in for ${dN}, it runs through ${nom(estD)}${st(estD) ? ` (${st(estD)})` : ''}; get him going early and the tone shifts.`, `Si hay una vía para ${dN}, pasa por ${nom(estD)}${st(estD) ? ` (${st(estD)})` : ''}; que arranque temprano y el tono cambia.`));
  contra.push(L(`The trap for anyone on ${fN} is complacency; ${dN} is the type to punish a side that arrives expecting an easy night.`, `La trampa para quien va con ${fN} es la relajación; ${dN} es del tipo que castiga a quien llega esperando una noche fácil.`));
  contra.push(L(`${dN}'s cleanest path is chaos, drag it into a scrap early and let the pressure do the talking.`, `La vía más limpia de ${dN} es el caos: llevarlo a la pelea temprano y dejar que la presión hable.`));
  partes.push(pick(contra, 20));

  // ---- 5) OPINIÓN (el "wow", coherente) ----
  partes.push(pick([
    L(`Here's what a lot of people miss: edges like this don't appear by accident, they're the residue of one side doing the small things right for weeks.`, `Aquí está lo que muchos pasan por alto: ventajas así no aparecen por accidente, son el poso de un equipo haciendo bien las cosas pequeñas durante semanas.`),
    L(`Everyone loves an upset story until the numbers quietly remind them why favorites are favorites.`, `A todos les encanta la historia del batacazo hasta que los números, en voz baja, recuerdan por qué los favoritos son favoritos.`),
    L(`Call it boring, but I'll take the side that's been better over the side that "feels" due. Feelings don't move the scoreboard.`, `Llámalo aburrido, pero me quedo con el que ha sido mejor antes que con el que "toca" por sensación. Las sensaciones no mueven el marcador.`),
    L(`When the story and the data point the same way, I stop looking for a clever angle and respect what's in front of me.`, `Cuando la historia y el dato apuntan al mismo lado, dejo de buscar el ángulo ingenioso y respeto lo que tengo delante.`),
    L(`Strip the crests and the names, leave the numbers, and most honest observers land on the same side.`, `Quita los escudos y los nombres, deja los números, y la mayoría de observadores honestos caen en el mismo lado.`),
    L(`This is the unglamorous kind of good, the version that never makes a highlight but keeps showing up in the standings.`, `Este es del bueno sin glamour, el que nunca sale en un resumen pero sigue apareciendo en la tabla.`)], 24));

  // ---- 6) VEREDICTO ----
  const ver = pick({
    alto: [L(`Bottom line: the weight of evidence is with ${fN}. Short of one of those rare shocks, this has an owner.`, `En resumen: el peso de la evidencia está con ${fN}. Salvo uno de esos sustos raros, esto tiene dueño.`),
           L(`Bottom line: I'm not chasing a cute angle here. ${fN}, and I'd be genuinely surprised to be wrong.`, `En resumen: no persigo un ángulo rebuscado aquí. ${fN}, y me sorprendería de verdad estar equivocado.`),
           L(`Bottom line: everything that matters points one way. ${fN}, with conviction.`, `En resumen: todo lo que importa apunta a un lado. ${fN}, con convicción.`)],
    medio: [L(`Bottom line: ${fN} is the sound read, not a formality. Respect the matchup and you're in good shape.`, `En resumen: ${fN} es la lectura sensata, no un trámite. Respeta el cruce y estás bien.`),
            L(`Bottom line: lean ${fN} with your eyes open. A good spot, never a gift.`, `En resumen: inclínate por ${fN} con los ojos abiertos. Buen sitio, nunca un regalo.`),
            L(`Bottom line: I'd side with ${fN} and expect to sweat it a little. That's fine.`, `En resumen: me pondría del lado de ${fN} esperando sudarlo un poco. Está bien.`)],
    bajo: [L(`Bottom line: too close to call with a straight face. ${fN} by a whisker, and a draw is very much alive.`, `En resumen: demasiado parejo para cantarlo en serio. ${fN} por un suspiro, y el empate está muy vivo.`),
           L(`Bottom line: if you need a side, ${fN}, but this is one to watch, not to bank on.`, `En resumen: si necesitas un lado, ${fN}, pero este es para mirar, no para apostar la casa.`)]
  }[nivel], 28);

  const probLinea = `<div class="hd-ia-prob"><span>${L('Model read', 'Lectura del modelo')}</span><b>${fN} ${probFav}%</b>${empate != null ? `<em>${L('Draw', 'Empate')} ${empate}%</em>` : ''}</div>`;
  return `<div class="hd-ia">
    <div class="hd-ia-analyst">
      <div class="hd-ia-ava">${(typeof window !== 'undefined' && window.__jesusFoto) ? `<img src="${esc(window.__jesusFoto)}" alt="Jesús">` : 'J'}</div>
      <div class="hd-ia-who"><b>Jesús</b><span>${L('Sports statistics analyst', 'Especialista en análisis de estadísticas deportivas')}</span></div>
      <span class="hd-ia-tag"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z"/></svg>${L('Analysis', 'Análisis')}</span>
    </div>
    <p>${partes[0]}</p>
    <p>${partes[1]}</p>
    <p>${partes[2]}</p>
    <p>${partes[3]}</p>
    <p>${partes[4]}</p>
    ${probLinea}
    <p class="hd-ia-verdict">${ver}</p>
    <div class="hd-ia-foot">${L('Automated analysis from public data. A specialist opinion and an estimate, not a promise of results.', 'Análisis automatizado a partir de datos públicos. Una opinión especializada y una estimación, no una promesa de resultados.')}</div>
  </div>`;
}

export function detalle(p, opciones = {}) {
  if (!p) return `<div class="vacio"><div class="ic">${IC.grafico}</div>${t('det.vacio')}</div>`;
  const ES = idiomaActual() === 'es';
  const cargando = !!opciones.cargando;
  const cargTxt = ES ? 'Cargando…' : 'Loading…';
  const m = p.mercado || {};
  const tieneEmpate = m.empate != null && m.empate > 0;

  // Mapa nombre->foto TRANSPARENTE (recorte de ESPN, el del roster). Se reusa en
  // la tarjeta destacada y en los bateadores, para que el MISMO jugador se vea
  // sin fondo en todas las secciones (no la versión con fondo de otras fuentes).
  const normNom = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const fotoRoster = { local: {}, visita: {} };
  ['local', 'visita'].forEach(lado => {
    ((p.plantilla && p.plantilla[lado]) || []).forEach(j => {
      const f = fotoJugador(j, p.ligaId);
      if (f && j.nombre) fotoRoster[lado][normNom(j.nombre)] = f;
    });
  });
  const fotoConRoster = (jug, lado) => {
    if (!jug || !jug.nombre) return jug ? fotoJugador(jug, p.ligaId) : null;
    return fotoRoster[lado][normNom(jug.nombre)] || fotoJugador(jug, p.ligaId);
  };
  const avatarR = (jug, lado) => {
    if (!jug) return '';
    const ini = esc((jug.nombre || '?').trim().charAt(0).toUpperCase());
    const chain = [];
    const rm = jug.nombre ? fotoRoster[lado][normNom(jug.nombre)] : null;
    if (rm) chain.push(rm);
    cadenaFotoStr(jug, p.ligaId).forEach(u => { if (u && !chain.includes(u)) chain.push(u); });
    if (!chain.length) return `<span class="hd-av"><span class="hd-av-i" style="display:flex">${ini}</span></span>`;
    return `<span class="hd-av"><img src="${esc(chain[0])}" alt="" loading="lazy" data-fb="${esc(chain.slice(1).join('~~'))}" onerror="${FB_IMG}">
      <span class="hd-av-i" style="display:none">${ini}</span></span>`;
  };
  const favLocal = (m.local || 0) >= (m.visita || 0);
  const manoTxt = (mn) => mn === 'L' ? 'LHP' : (mn === 'R' ? 'RHP' : '');
  const anio = new Date().getFullYear();

  const confMap = {
    'alta': { es: 'Confianza alta', en: 'High confidence', c: 'alta' },
    'media': { es: 'Confianza media', en: 'Medium confidence', c: 'media' },
    'baja': { es: 'Confianza baja', en: 'Low confidence', c: 'baja' },
    'muy baja': { es: 'Confianza muy baja', en: 'Very low confidence', c: 'muybaja' },
  };
  const cf = confMap[p.confianza] || null;
  const confBadge = cf ? `<span class="conf ${cf.c}">${ES ? cf.es : cf.en}</span>` : '';

  function donut(pct) {
    const r = 24, c = 2 * Math.PI * r, dash = (c * (pct || 0) / 100).toFixed(2);
    return `<svg class="pd" viewBox="0 0 62 62">
      <circle cx="31" cy="31" r="${r}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="6"/>
      <circle cx="31" cy="31" r="${r}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${dash} ${(c - dash).toFixed(2)}" transform="rotate(-90 31 31)"/>
      <text x="31" y="37" text-anchor="middle" class="pd-t">${pct || 0}%</text></svg>`;
  }

  function headTeam(eq, lado) {
    const parts = String(eq.nombre || '').trim().split(/\s+/);
    const ciudad = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    const nombre = parts.length > 1 ? parts.slice(-1)[0] : eq.nombre;
    const rec = _recReal(eq.record) ? `${esc(eq.record)}${eq.division ? ` <em>| ${esc(eq.division)}</em>` : ''}` : (eq.division ? `<em>${esc(eq.division)}</em>` : '');
    const logo = `<img class="hd-hd-logo" src="${esc(eq.logo || '')}" alt="" onerror="this.style.visibility='hidden'">`;
    const txt = `<div class="hd-hd-tx">${ciudad ? `<span class="hd-hd-city">${esc(ciudad)}</span>` : ''}<span class="hd-hd-name">${esc(nombre)}</span>${rec ? `<span class="hd-hd-rec">${rec}</span>` : ''}</div>`;
    return `<div class="hd-hd-team ${lado}">${lado === 'l' ? logo + txt : txt + logo}</div>`;
  }

  /* Posición legible por deporte (evita la letra suelta M/F/D/G) y etiquetas
     de stats limpias. Así la tarjeta de destacado se ve bien en TODOS los
     deportes, no solo béisbol. No toca las fotos. */
  const ROL_MAP = {
    soccer: { F: 'Forward|Delantero', ST: 'Striker|Delantero', CF: 'Forward|Delantero', S: 'Striker|Delantero',
      W: 'Winger|Extremo', LW: 'Winger|Extremo', RW: 'Winger|Extremo', LM: 'Midfielder|Centrocampista', RM: 'Midfielder|Centrocampista',
      M: 'Midfielder|Centrocampista', MF: 'Midfielder|Centrocampista', AM: 'Att. Mid|Mediapunta', CM: 'Midfielder|Centrocampista', DM: 'Def. Mid|Mediocentro',
      D: 'Defender|Defensa', DF: 'Defender|Defensa', CB: 'Defender|Defensa', LB: 'Full-back|Lateral', RB: 'Full-back|Lateral', WB: 'Wing-back|Carrilero',
      G: 'Goalkeeper|Portero', GK: 'Goalkeeper|Portero', A: 'Attacker|Atacante' },
    nba: { PG: 'Point Guard|Base', SG: 'Shooting Guard|Escolta', G: 'Guard|Escolta', SF: 'Small Forward|Alero', PF: 'Power Forward|Ala-pívot', F: 'Forward|Alero', C: 'Center|Pívot' },
    nhl: { C: 'Center|Centro', LW: 'Left Wing|Ala izq.', RW: 'Right Wing|Ala der.', W: 'Winger|Extremo', D: 'Defenseman|Defensa', G: 'Goalie|Portero' },
    nfl: { QB: 'Quarterback|QB', RB: 'Running Back|RB', WR: 'Wide Receiver|WR', TE: 'Tight End|TE', K: 'Kicker|Pateador' },
  };
  const grupoLiga = (id) => (['epl', 'laliga', 'ucl', 'seriea', 'bundes', 'ligue1'].includes(id) ? 'soccer' : id);
  function rolLegible(pos) {
    const raw = String(pos || '').toUpperCase().trim(); if (!raw) return '';
    const g = ROL_MAP[grupoLiga(p.ligaId)] || {};
    if (g[raw]) { const [en, es] = g[raw].split('|'); return ES ? es : en; }
    return raw.length >= 3 ? raw : '';   // desconocido: nunca una letra suelta
  }
  function limpiarEtiqueta(et) {
    let s = (et && typeof et === 'object') ? (ES ? (et.es || et.en) : (et.en || et.es)) : et;
    s = String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    const low = s.toLowerCase();
    const map = { 'total shot': 'Shots', 'total shots': 'Shots', 'shots on target': ES ? 'A puerta' : 'On target',
      'goals': ES ? 'Goles' : 'Goals', 'assists': ES ? 'Asist.' : 'Assists', 'matches': ES ? 'Partidos' : 'Matches',
      'appearances': ES ? 'Partidos' : 'Matches', 'points': ES ? 'Puntos' : 'Points', 'rebounds': ES ? 'Rebotes' : 'Rebounds',
      'saves': ES ? 'Paradas' : 'Saves', 'goals against': ES ? 'Goles contra' : 'Goals ag.' };
    if (map[low] != null) return map[low];
    return s.length > 12 ? s.slice(0, 12) : s;
  }

  /* Tarjeta de abridor / jugador destacado con foto grande */
  function pitcher(lado) {
    const eq = p[lado];
    const a = eq.abridor;
    let jug, badgeT, fn = '', ln, meta = [], stats = [], num = '';
    if (a && a.nombre) {
      jug = a; badgeT = ES ? 'Pitcher abridor' : 'Starting pitcher';
      const parts = String(a.nombre).trim().split(/\s+/);
      fn = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
      ln = parts.length > 1 ? parts.slice(-1)[0] : a.nombre;
      if (a.mano) meta.push(manoTxt(a.mano));
      if (a.edad) meta.push(`${a.edad} ${ES ? 'AÑOS' : 'YRS'}`);
      if (a.altura) meta.push(esc(a.altura));
      if (a.peso) meta.push(`${a.peso} LBS`);
      if (a.num) num = `<em>#${esc(a.num)}</em>`;
      if (a.wl) stats.push({ v: a.wl, k: ES ? 'G-P' : 'W-L' });
      if (a.era) stats.push({ v: a.era, k: 'ERA' });
      if (a.so != null) stats.push({ v: a.so, k: 'SO' });
      if (a.whip != null) stats.push({ v: a.whip, k: 'WHIP' });
    } else {
      let lid = (p.jugadores && p.jugadores[lado]) || [];
      if (!lid.length && p.plantilla && p.plantilla[lado] && p.plantilla[lado].length) lid = p.plantilla[lado];
      const j0 = lid[0];
      badgeT = ES ? 'Jugador destacado' : 'Featured player';
      if (!j0) { jug = null; ln = ES ? 'Por confirmar' : 'TBD'; }
      else {
        jug = j0;
        const parts = String(j0.nombre).trim().split(/\s+/);
        fn = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        ln = parts.length > 1 ? parts.slice(-1)[0] : j0.nombre;
        if (j0.pos) { const rl = rolLegible(j0.pos); if (rl) meta.push(rl); }
        const vistos = new Set();
        stats = lid.filter(x => x.nombre === j0.nombre && x.dato != null && String(x.dato).length <= 6)
          .filter(x => { const k = JSON.stringify(x.etiqueta); if (vistos.has(k)) return false; vistos.add(k); return true; })
          .slice(0, 3).map(x => ({ v: x.dato, k: limpiarEtiqueta(x.etiqueta) }));
      }
    }
    const foto = jug ? fotoConRoster(jug, lado) : null;
    // Figura de respaldo: béisbol usa la de pie; el resto usa la distinta por lado.
    const fig = p.ligaId === 'mlb' ? figuraAbridor(p.ligaId) : figuraLado(p.ligaId, lado);
    // Cadena: match del roster -> fuentes de foto -> figura (siempre carga).
    const chain = [];
    if (jug) { const rm = jug.nombre ? fotoRoster[lado][normNom(jug.nombre)] : null; if (rm) chain.push(rm); cadenaFotoStr(jug, p.ligaId).forEach(u => { if (u && !chain.includes(u)) chain.push(u); }); }
    chain.push(fig);
    const esFig0 = chain[0] === fig;
    const photo = `<img class="hd-pit-photo${esFig0 ? ' is-figura' : ''}" src="${esc(chain[0])}" alt="" loading="lazy"
      data-fb="${esc(chain.slice(1).join('~~'))}" onerror="${FB_PIT}" onload="window.__bevelFoto&&window.__bevelFoto(this)">`;
    const sideC = lado === 'local' ? 'l' : 'r';
    const pitIco = `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><circle cx="12" cy="5" r="2.4"/><path d="M11 8c-1 2-3 3-5 3l.4 1.9c1.7-.1 3.3-.7 4.6-1.8l1 2.1-2.4 4.6 1.7.9 2.7-5.1c.3-.6.1-1.3-.4-1.7l-1.2-1 1.1-2.2c1.2 1.3 2.9 2 4.6 2.1l.2-1.9c-1.9 0-3.6-1.1-4.5-2.8z"/></svg>`;
    const badge = `<div class="hd-pit-badge">${pitIco} ${esc(badgeT)}</div>`;
    return `<div class="hd-pit ${sideC}">
      ${badge}
      <div class="hd-pit-inner">
        ${photo}
        <div class="hd-pit-info">
          <div class="hd-pit-sub">${a && a.nombre ? (ES ? 'Anunciado para hoy' : 'Announced for today') : (ES ? 'Líder del equipo' : 'Team leader')}</div>
          ${fn ? `<span class="hd-pit-fn">${esc(fn)}</span>` : ''}
          <span class="hd-pit-ln">${esc(ln)} ${num}</span>
          ${meta.length ? `<div class="hd-pit-meta">${meta.join(' · ')}</div>` : ''}
          ${stats.length ? `<div class="hd-pit-temp">${ES ? 'Temporada' : 'Season'} ${anio}</div><div class="hd-pit-st">${stats.map(s => `<div><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join('')}</div>` : ''}
        </div>
      </div></div>`;
  }

  function batters(lado) {
    let arr = (p.bateadores && p.bateadores[lado]) || [];
    let titulo = ES ? 'Mejores bateadores (AVG)' : 'Top batters (AVG)';
    if (!arr.length) {
      let lid = (p.jugadores && p.jugadores[lado]) || [];
      if (!lid.length && p.plantilla && p.plantilla[lado]) lid = p.plantilla[lado];
      const vistos = new Set();
      arr = lid.filter(x => { if (!x.nombre || vistos.has(x.nombre)) return false; vistos.add(x.nombre); return true; })
        .slice(0, 3).map(x => ({ nombre: x.nombre, pos: x.pos, avg: x.dato, id: x.id, foto: x.foto, et: x.etiqueta }));
      titulo = ES ? 'Líderes del equipo' : 'Team leaders';
    }
    if (!arr.length) return `<div><div class="hd-blk-t">${titulo}</div><div class="hd-empty">${cargando ? cargTxt : (ES ? 'Datos no disponibles todavía.' : 'No data yet.')}</div></div>`;
    const rows = arr.slice(0, 3).map((j, i) => `<div class="hd-bat">
      <span class="hd-bat-n">${i + 1}</span>${avatarR(j, lado)}
      <span class="hd-bat-nm">${esc(j.nombre)}</span>
      ${j.pos ? `<span class="hd-bat-pos">${esc(j.pos)}</span>` : ''}
      <b class="hd-bat-avg">${esc(j.avg || j.et || '')}</b></div>`).join('');
    return `<div><div class="hd-blk-t">${titulo}</div>${rows}</div>`;
  }

  function form(lado) {
    const eq = p[lado];
    const ult = eq.ultimos || [];
    if (ult.length) {
      const chips = ult.slice(0, 5).map(u => `<div class="hd-fm ${u.w ? 'w' : 'l'}">
        <span class="hd-fm-b">${u.w ? 'W' : 'L'}</span>
        <span class="hd-fm-x">${esc(u.rival || '')}</span>
        <span class="hd-fm-s">${esc(u.marcador || '')}</span></div>`).join('');
      return `<div><div class="hd-blk-t">${ES ? 'Rendimiento reciente' : 'Recent form'}</div><div class="hd-form">${chips}</div></div>`;
    }
    const casa = eq.recordCasa, fuera = eq.recordFuera;
    if (!casa && !fuera) return '';
    const col = lado === 'visita' ? 'var(--c-vis)' : 'var(--c-loc)';
    const IHome = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>`;
    const IAway = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l20-7-7 20-3-8-8-3z"/></svg>`;
    const chip = (etq, val, ic) => val ? `<div class="hd-fm hd-fm-hf"><span class="hd-fm-b" style="background:${col}">${ic}</span><span class="hd-fm-x">${etq}</span><span class="hd-fm-s">${esc(val)}</span></div>` : '';
    return `<div><div class="hd-blk-t">${ES ? 'Rendimiento' : 'Form'}</div><div class="hd-form" style="grid-template-columns:1fr 1fr">${chip(ES ? 'Casa' : 'Home', casa, IHome)}${chip(ES ? 'Fuera' : 'Away', fuera, IAway)}</div></div>`;
  }

  /* Filas de comparación: usa comparativa REAL (equipos-stats) si existe */
  function filasComparacion() {
    const filas = [];
    const pw = (r, fut) => {
      if (fut) { const mm = String(r || '').match(/(\d+)\D+(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], d = +mm[2], l = +mm[3], t2 = w + d + l; return t2 ? (w + d * 0.5) / t2 : null; }
      const mm = String(r || '').match(/(\d+)\D+(\d+)/); if (!mm) return null; const w = +mm[1], l = +mm[2]; return (w + l) ? w / (w + l) : null;
    };
    const rl = pw(p.local.record, p.futbol), rv = pw(p.visita.record, p.futbol);
    if (rl != null && rv != null && rl + rv > 0) filas.push(fila(p.local.record, p.visita.record, ES ? '% Victorias' : 'Win %', rl / (rl + rv) * 100));
    if (p.comparativa && p.comparativa.length) {
      p.comparativa.forEach(c => {
        const a = numDe(c.local), b = numDe(c.visita);
        if (a == null || b == null || (a + b) === 0) { filas.push(fila(c.local, c.visita, ES ? c.es || c.k : c.en || c.k, 50)); return; }
        let lp = a / (a + b) * 100; if (c.inv || INV_STAT.test(c.k)) lp = 100 - lp;
        filas.push(fila(c.local, c.visita, ES ? (c.es || c.k) : (c.en || c.k), lp));
      });
    } else {
      const cats = {};
      ((p.jugadores && p.jugadores.local) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).l = j; });
      ((p.jugadores && p.jugadores.visita) || []).forEach(j => { (cats[j.etiqueta] = cats[j.etiqueta] || {}).r = j; });
      Object.keys(cats).forEach(k => {
        const c = cats[k]; if (!c.l || !c.r) return;
        const a = numDe(c.l.dato), b = numDe(c.r.dato);
        if (a == null || b == null || (a + b) === 0) return;
        let lp = a / (a + b) * 100; if (INV_STAT.test(k)) lp = 100 - lp;
        filas.push(fila(c.l.dato, c.r.dato, k, lp));
      });
    }
    return filas;
  }
  function fila(vl, vr, k, lp) {
    const l = Math.max(3, Math.min(97, lp));
    return `<div class="hd-cmp-row"><span class="hd-cmp-v l">${esc(vl)}</span>
      <div class="hd-cmp-mid"><span class="hd-cmp-k">${esc(k)}</span>
        <div class="hd-cmp-bar"><i class="l" style="width:${l.toFixed(1)}%"></i><i class="r" style="width:${(100 - l).toFixed(1)}%"></i></div></div>
      <span class="hd-cmp-v r">${esc(vr)}</span></div>`;
  }

  /* Reloj tipo "miedo/codicia": semicírculo con aguja que apunta al equipo
     con mayor probabilidad. SVG nítido, sin librerías. */
  function gaugeHTML() {
    const L = m.local || 0, V = m.visita || 0;
    const total = L + V || 1;
    const tV = V / total;
    const ang = 180 * (1 - tV);
    const rad = ang * Math.PI / 180;
    const cx = 150, cy = 150, r = 116;
    const pt = (a, rr) => [cx + rr * Math.cos(a * Math.PI / 180), cy - rr * Math.sin(a * Math.PI / 180)];
    const arco = (a0, a1, rr) => { const [x0, y0] = pt(a0, rr), [x1, y1] = pt(a1, rr); const large = Math.abs(a0 - a1) > 180 ? 1 : 0; return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rr} ${rr} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const favLocal = L >= V;
    const favAb = favLocal ? p.local.abrev : p.visita.abrev;
    const favPct = Math.max(L, V);
    const favColor = favLocal ? '#38a9f0' : '#f0353a';
    // Aguja (gruesa->fina) con degradado
    const nx = cx + (r - 14) * Math.cos(rad), ny = cy - (r - 14) * Math.sin(rad);
    const bx1 = cx + 9 * Math.cos(rad + Math.PI / 2), by1 = cy - 9 * Math.sin(rad + Math.PI / 2);
    const bx2 = cx + 9 * Math.cos(rad - Math.PI / 2), by2 = cy - 9 * Math.sin(rad - Math.PI / 2);
    let ticks = '';
    for (let i = 0; i <= 20; i++) { const a = 180 - i * 9; const mayor = i % 5 === 0; const [x0, y0] = pt(a, r + 5), [x1, y1] = pt(a, r + (mayor ? 15 : 9)); ticks += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="rgba(255,255,255,${mayor ? .38 : .18})" stroke-width="${mayor ? 2.2 : 1.2}" stroke-linecap="round"/>`; }
    return `<div class="hd-gauge">
      <div class="hd-gauge-t">${ES ? 'Índice de probabilidad' : 'Probability index'}</div>
      <svg viewBox="0 0 300 180" class="hd-gauge-svg">
        <defs>
          <linearGradient id="ggArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#38a9f0"/><stop offset="0.42" stop-color="#4a7fb5"/>
            <stop offset="0.58" stop-color="#b5556a"/><stop offset="1" stop-color="#f0353a"/>
          </linearGradient>
          <linearGradient id="ggNeedle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c7d2de"/>
          </linearGradient>
          <radialGradient id="ggGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stop-color="${favColor}" stop-opacity="0.35"/><stop offset="1" stop-color="${favColor}" stop-opacity="0"/>
          </radialGradient>
          <filter id="ggShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2.5" stdDeviation="3.5" flood-color="#000" flood-opacity="0.6"/></filter>
        </defs>
        <ellipse cx="${cx}" cy="${cy}" rx="120" ry="86" fill="url(#ggGlow)"/>
        <path d="${arco(180, 0, r)}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="22" stroke-linecap="round"/>
        <path d="${arco(180, 0, r)}" fill="none" stroke="url(#ggArc)" stroke-width="13" stroke-linecap="round"/>
        <path d="${arco(180, 0, r - 13)}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
        ${ticks}
        <text x="20" y="170" class="hd-gauge-side" fill="#38a9f0">${esc(p.local.abrev)}</text>
        <text x="280" y="170" class="hd-gauge-side" fill="#f0353a" text-anchor="end">${esc(p.visita.abrev)}</text>
        <g filter="url(#ggShadow)">
          <polygon points="${nx.toFixed(1)},${ny.toFixed(1)} ${bx1.toFixed(1)},${by1.toFixed(1)} ${bx2.toFixed(1)},${by2.toFixed(1)}" fill="url(#ggNeedle)"/>
          <circle cx="${cx}" cy="${cy}" r="15" fill="#10151d" stroke="url(#ggNeedle)" stroke-width="3.5"/>
          <circle cx="${cx}" cy="${cy}" r="5" fill="${favColor}"/>
        </g>
      </svg>
      <div class="hd-gauge-chip" style="--fav:${favColor}">
        <div class="hd-gauge-chip-l"><span class="hd-gauge-chip-eq">${esc(favAb)}</span><span class="hd-gauge-chip-lb">${ES ? 'Favorito' : 'Favored'}</span></div>
        <div class="hd-gauge-chip-div"></div>
        <div class="hd-gauge-chip-pct">${favPct}%</div>
      </div>
    </div>`;
  }

  function donutsHTML() {
    return `<div class="hd-donuts">
      <div class="hd-donut l">${donut(m.local || 0)}<span>${esc(p.local.abrev)}</span></div>
      ${tieneEmpate ? `<div class="hd-conf"><div class="hd-h2h-n" style="color:#fff;font-size:16px">${m.empate}%</div><span class="hd-h2h-lbl">${t('prob.empate')}</span></div>` : `<div class="hd-conf">${confBadge}</div>`}
      <div class="hd-donut r">${donut(m.visita || 0)}<span>${esc(p.visita.abrev)}</span></div></div>`;
  }
  function h2hHTML() {
    const s = p.serie; if (!s || (s.local == null && s.visita == null)) return '';
    const jug = (s.local || 0) + (s.visita || 0) + (s.empates || 0);
    return `<div class="hd-h2h"><div class="hd-h2h-t">${ES ? 'Enfrentamientos' : 'Head to head'} ${esc(s.temporada || '')}</div>
      <div class="hd-h2h-row">
        <div class="hd-h2h-side l"><img src="${esc(p.local.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-h2h-n">${s.local || 0}</span><span class="hd-h2h-lbl">${ES ? 'Ganados' : 'Won'}</span></div>
        <div class="hd-h2h-side m"><span class="hd-h2h-n">${jug}</span><span class="hd-h2h-lbl">${ES ? 'Jugados' : 'Played'}</span></div>
        <div class="hd-h2h-side r"><img src="${esc(p.visita.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-h2h-n">${s.visita || 0}</span><span class="hd-h2h-lbl">${ES ? 'Ganados' : 'Won'}</span></div>
      </div>${s.ultimo ? `<div class="hd-h2h-last">${ES ? 'Último' : 'Last'}: ${esc(s.ultimo)}</div>` : ''}</div>`;
  }
  function analistaHTML() {
    if (!p.analista) return '';
    const a = p.analista, bl = !!opciones.bloquear;
    return `<div class="hd-analista ${bl ? 'bloqueado' : ''}">
      <div class="hd-an-t">${IC.estrella} ${t('analista.titulo')}</div>
      <div class="hd-an-v"><span>${esc(Lg(a.veredicto))}</span><b>${a.probabilidad}%</b></div>
      <div class="hd-an-txt">${esc(Lg(a.texto))}</div></div>`;
  }
  function factoresHTML() {
    const f = p.factores; if (!f) return '';
    return `<div class="hd-an-txt" style="margin-top:12px;color:var(--tinta-3)">${esc(ES ? f.es : f.en)}</div>`;
  }

  /* Roster completo de un equipo (todos los jugadores) — clicable */
  function rosterCol(lado) {
    const eq = p[lado];
    const sideC = lado === 'local' ? 'l' : 'r';
    const arr = (p.plantilla && p.plantilla[lado] && p.plantilla[lado].length ? p.plantilla[lado]
      : (p.jugadores && p.jugadores[lado]) || []);
    const vistos = new Set();
    const lista = arr.filter(j => { const n = j.nombre; if (!n || vistos.has(n)) return false; vistos.add(n); return true; });
    const rows = lista.map(j => {
      const foto = fotoJugador(j, p.ligaId) || '';
      return `<div class="hd-rp" role="button" tabindex="0" data-side="${sideC}" data-nm="${esc(j.nombre)}" data-pos="${esc(j.pos || '')}" data-foto="${esc(foto)}">${avatarR(j, lado)}
      <span class="hd-rp-nm">${esc(j.nombre)}</span>${j.pos ? `<span class="hd-rp-pos">${esc(j.pos)}</span>` : ''}</div>`;
    }).join('');
    return `<div class="hd-roster-col"><b>${esc(eq.abrev || eq.nombre)}</b>${rows || `<div class="hd-empty">${cargando ? cargTxt : (ES ? 'Roster no disponible.' : 'Roster unavailable.')}</div>`}</div>`;
  }
  function equiposHTML() {
    return `<div class="hd-roster">${rosterCol('local')}${rosterCol('visita')}</div>`;
  }

  /* ESTADÍSTICAS: distinta a Comparación — récord/casa/fuera + números crudos en tabla */
  function estadisticasHTML() {
    const filas = [];
    const fila = (k, l, r) => (l || r) ? filas.push(`<div class="hd-tb-row"><span class="hd-tb-l">${esc(l ?? '—')}</span><span class="hd-tb-k">${esc(k)}</span><span class="hd-tb-r">${esc(r ?? '—')}</span></div>`) : 0;
    const IHomeS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>`;
    const IAwayS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l20-7-7 20-3-8-8-3z"/></svg>`;
    const filaIc = (k, ic, l, r) => (l || r) ? filas.push(`<div class="hd-tb-row"><span class="hd-tb-l">${esc(l ?? '—')}</span><span class="hd-tb-k hd-tb-k-ic">${ic}<span>${esc(k)}</span></span><span class="hd-tb-r">${esc(r ?? '—')}</span></div>`) : 0;
    fila(ES ? 'Récord' : 'Record', _recReal(p.local.record) ? p.local.record : '—', _recReal(p.visita.record) ? p.visita.record : '—');
    filaIc(ES ? 'En casa' : 'At home', IHomeS, p.local.recordCasa, p.visita.recordCasa);
    filaIc(ES ? 'De visita' : 'Away', IAwayS, p.local.recordFuera, p.visita.recordFuera);
    let extras = '';
    if (p.comparativa && p.comparativa.length) {
      extras = `<div class="hd-tb-sep">${ES ? 'Temporada' : 'Season'}</div>` + p.comparativa.map(c =>
        `<div class="hd-tb-row"><span class="hd-tb-l">${esc(c.local)}</span><span class="hd-tb-k">${esc(ES ? (c.es || c.k) : (c.en || c.k))}</span><span class="hd-tb-r">${esc(c.visita)}</span></div>`).join('');
    }
    if (!filas.length && !extras) return `<div class="hd-cmp-nd">${ES ? 'Sin estadísticas todavía.' : 'No stats yet.'}</div>`;
    return `<div class="hd-tb"><div class="hd-tb-head"><span>${esc(p.local.abrev)}</span><span></span><span>${esc(p.visita.abrev)}</span></div>${filas.join('')}${extras}</div>`;
  }

  const cmp = filasComparacion();
  const cmpHTML = cmp.length ? `<div class="hd-cmp">${cmp.join('')}</div>` : `<div class="hd-cmp-nd">${cargando ? cargTxt : (ES ? 'La liga no publica estadísticas de temporada para este cruce (suele pasar en torneos de copa). Revisa la pestaña <b>Análisis</b> para la lectura completa del partido.' : 'This competition doesn\u2019t publish season stats for this matchup (common in cup ties). Check the <b>Analysis</b> tab for the full read.')}</div>`;

  /* --- Pestañas como la referencia: Resumen · Comparación · Equipos · Estadísticas · Enfrentamientos --- */
  const tieneSerie = p.serie && (p.serie.local != null || p.serie.visita != null);
  const panes = [];
  // Análisis: el informe escrito por partido (lo primero que se ve).
  panes.push({ id: 'analisis', txt: ES ? 'Análisis' : 'Analysis', on: true, html: informeIA(p, ES) });
  // Resumen: probabilidad + veredicto + factores.
  panes.push({ id: 'resumen', txt: ES ? 'Resumen' : 'Overview',
    html: `${donutsHTML()}${analistaHTML()}${factoresHTML() || `<div class="hd-an-txt" style="text-align:center;color:var(--tinta-3);padding:8px 0">${ES ? 'Probabilidad del modelo con las señales del partido.' : 'Model probability from the match signals.'}</div>`}${gaugeHTML()}` });
  // Comparación: barras + enfrentamientos.
  panes.push({ id: 'comparacion', txt: ES ? 'Comparación' : 'Comparison', html: `${cmpHTML}${tieneSerie ? h2hHTML() : ''}` });
  // Equipos: roster COMPLETO de ambos.
  panes.push({ id: 'equipos', txt: ES ? 'Equipos' : 'Teams', html: equiposHTML() });
  // Estadísticas: barras a pantalla completa.
  if (cmp.length || p.local.record) panes.push({ id: 'estadisticas', txt: ES ? 'Estadísticas' : 'Stats', html: estadisticasHTML() });
  // Enfrentamientos: solo si hay serie real.
  if (tieneSerie) panes.push({ id: 'enfrentamientos', txt: ES ? 'Enfrentamientos' : 'Head to head', html: h2hHTML() });

  const tabsHTML = panes.map(pane => `<button class="hd-tab ${pane.on ? 'on' : ''}" data-tab="${pane.id}">${esc(pane.txt)}</button>`).join('');
  const panesHTML = panes.map(pane => `<div class="hd-pane-c ${pane.on ? 'on' : ''}" data-pane="${pane.id}" ${pane.on ? '' : 'style="display:none"'}>${pane.html}</div>`).join('');

  const venueSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
  const shareSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>`;
  const xSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

  return `
  <div class="hd" data-liga="${esc(p.ligaId)}" data-id="${esc(p.id || '')}">
    <div class="hd-hd">
      ${headTeam(p.local, 'l')}
      <div class="hd-hd-c">
        <div class="hd-hd-day">${esc(Lg(p.inicio))}</div>
        ${p.sede ? `<div class="hd-hd-venue">${venueSVG} ${esc(Lg(p.sede))}</div>` : ''}
      </div>
      ${headTeam(p.visita, 'r')}
    </div>

    <div class="hd-bar">
      <div class="hd-tabs">${tabsHTML}</div>
      <div class="hd-acc">
        <div class="hd-menu" id="hd-menu">
          <button class="hd-menu-btn" id="hd-menu-btn" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span id="hd-menu-lbl">${esc((panes.find(x => x.on) || panes[0]).txt)}</span><svg class="hd-menu-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="hd-menu-pop" id="hd-menu-pop">${panes.map(pane => `<button class="hd-menu-item ${pane.on ? 'on' : ''}" data-goto="${pane.id}">${esc(pane.txt)}</button>`).join('')}</div>
        </div>
        <button class="hd-share" data-compartir="${esc(p.id || '')}">${shareSVG}<span>${ES ? 'Comparar' : 'Compare'}</span></button>
        <button class="hd-close x" data-cerrar>${xSVG}</button>
      </div>
    </div>

    <div class="hd-body">
      <aside class="hd-col l">${pitcher('local')}${batters('local')}${form('local')}</aside>
      <section class="hd-center">
        <div class="hd-c-head"><img src="${esc(p.local.logo || '')}" onerror="this.style.visibility='hidden'"><span class="hd-c-title">${ES ? 'Comparación de equipos' : 'Team comparison'}</span><img src="${esc(p.visita.logo || '')}" onerror="this.style.visibility='hidden'"></div>
        ${panesHTML}
      </section>
      <aside class="hd-col r">${pitcher('visita')}${batters('visita')}${form('visita')}</aside>
    </div>
  </div>`;
}
