/* ============================================================
   calendario-vacio.js — estado "sin juegos / fuera de temporada" con un
   calendario HORIZONTAL en web (y apilado en movil). UNA responsabilidad:
   devolver el HTML.

   Muestra HOY y el PROXIMO partido real (con cuenta regresiva). Si el proximo
   partido esta cerca (<= 12 dias), dibuja la tira de dias en cuadraditos de hoy
   hasta ese dia. Si esta lejos (receso), muestra hoy y la fecha del proximo
   partido como dos anclas, con los dias que faltan.

   Usa los tokens del tema (var(--...)), asi se adapta a claro/oscuro. Sin emojis.
   ============================================================ */

const MESES = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
};
const DIAS = {
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  es: ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'],
};

function _fecha(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && v) return new Date(v + 'T12:00:00');
  return new Date();
}
function _soloDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

const CSS = `
<style id="cal-vacio-css">
.calv{background:var(--tarjeta);border:1px solid var(--linea);border-radius:var(--r-xl,22px);
  box-shadow:var(--sombra-tarjeta);padding:20px 22px;font-family:var(--sans);color:var(--tinta)}
.calv-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:16px}
.calv-tit{font-family:var(--display);font-weight:700;font-size:1.05rem;letter-spacing:.3px;color:var(--tinta)}
.calv-sub{font-size:.78rem;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.8px;font-weight:600;text-align:right}
/* FILA HORIZONTAL (web): hoy -> conector -> proximo */
.calv-fila{display:flex;align-items:stretch;gap:18px}
.calv-dia{flex:0 0 auto;width:112px;border-radius:var(--r-lg,16px);background:var(--fondo-2);
  border:1px solid var(--linea);padding:14px 10px;text-align:center}
.calv-dia.hoy{background:var(--oro);border-color:var(--oro);color:#1a1205}
.calv-dia.prox{background:var(--verde-suave);border-color:rgba(46,158,87,.55)}
.calv-dia .d-sem{font-size:.72rem;font-weight:700;letter-spacing:.6px;text-transform:uppercase;opacity:.85}
.calv-dia .d-num{font-family:var(--display);font-weight:800;font-size:2.1rem;line-height:1.05;margin:2px 0}
.calv-dia .d-mes{font-size:.82rem;font-weight:700}
.calv-dia.prox .d-num,.calv-dia.prox .d-mes{color:var(--verde)}
.calv-dia .d-rot{font-size:.64rem;text-transform:uppercase;letter-spacing:.5px;opacity:.7;margin-top:3px}
.calv-con{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;position:relative}
.calv-con::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;
  background:linear-gradient(90deg,var(--oro),var(--verde));opacity:.5}
.calv-cuenta{position:relative;background:var(--tarjeta);border:1px solid var(--linea);border-radius:999px;
  padding:7px 16px;display:inline-flex;align-items:baseline;gap:7px;box-shadow:var(--sombra-boton)}
.calv-cuenta b{font-family:var(--display);font-weight:800;font-size:1.25rem;color:var(--oro);line-height:1}
.calv-cuenta i{font-style:normal;font-size:.72rem;text-transform:uppercase;letter-spacing:.6px;color:var(--tinta-3)}
.calv-ctx{position:relative;font-size:.76rem;color:var(--tinta-2);background:var(--tarjeta);padding:0 8px}
/* Tira de dias en cuadraditos (cuando el proximo esta cerca) */
.calv-tira{display:flex;gap:7px;flex-wrap:wrap}
.calv-sq{flex:0 0 auto;width:58px;aspect-ratio:1;border-radius:var(--r-sm,10px);background:var(--fondo-2);
  border:1px solid transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
.calv-sq .s-sem{font-size:.6rem;font-weight:700;text-transform:uppercase;color:var(--tinta-3);letter-spacing:.4px}
.calv-sq .s-num{font-family:var(--display);font-weight:800;font-size:1.15rem;color:var(--tinta-2)}
.calv-sq.hoy{background:var(--oro)}.calv-sq.hoy .s-num,.calv-sq.hoy .s-sem{color:#1a1205}
.calv-sq.prox{background:var(--verde-suave);border-color:rgba(46,158,87,.55)}
.calv-sq.prox .s-num,.calv-sq.prox .s-sem{color:var(--verde)}
.calv-sq.camino{background:var(--tarjeta-alta);border-color:var(--linea)}
.calv-pie{margin-top:14px;font-size:.84rem;color:var(--tinta-2);line-height:1.45}
.calv-pie b{color:var(--tinta)}
@media (max-width:620px){
  .calv{padding:16px}
  .calv-fila{flex-direction:column;gap:12px}         /* MOVIL: apilado/vertical */
  .calv-dia{width:auto}
  .calv-con{flex-direction:row;gap:12px;padding:4px 0}
  .calv-con::before{left:12px;right:12px}
  .calv-sq{width:calc((100% - 42px)/7)}
}
</style>`;

function _bloqueDia(d, idioma, clase, rotulo) {
  return `<div class="calv-dia ${clase}">
    <div class="d-sem">${DIAS[idioma][d.getDay()]}</div>
    <div class="d-num">${d.getDate()}</div>
    <div class="d-mes">${MESES[idioma][d.getMonth()]}${clase === 'prox' ? ' ' + d.getFullYear() : ''}</div>
    ${rotulo ? `<div class="d-rot">${_esc(rotulo)}</div>` : ''}
  </div>`;
}

/* opciones: { titulo, hoy, proxima, nota, contexto, idioma } */
export function calendarioVacioHTML(opts = {}) {
  const idioma = opts.idioma === 'es' ? 'es' : 'en';
  const L = (en, es) => idioma === 'es' ? es : en;
  const hoy = _soloDia(_fecha(opts.hoy));
  const prox = opts.proxima ? _soloDia(_fecha(opts.proxima)) : null;
  const dias = prox ? Math.round((prox - hoy) / 86400000) : null;
  const titulo = opts.titulo ? `<div class="calv-sub">${_esc(opts.titulo)}</div>` : '';
  const encabezado = L('Next game', 'Proximo partido');

  let cuerpo;
  if (prox && dias != null && dias >= 0 && dias <= 12) {
    // Cerca: tira de cuadraditos de hoy hasta el proximo partido.
    let sq = '';
    for (let i = 0; i <= dias; i++) {
      const d = new Date(hoy); d.setDate(hoy.getDate() + i);
      const cls = i === 0 ? 'hoy' : (i === dias ? 'prox' : 'camino');
      sq += `<div class="calv-sq ${cls}"><div class="s-sem">${DIAS[idioma][d.getDay()]}</div><div class="s-num">${d.getDate()}</div></div>`;
    }
    const cuando = `${DIAS[idioma][prox.getDay()]} ${prox.getDate()} ${MESES[idioma][prox.getMonth()]}`;
    cuerpo = `<div class="calv-tira">${sq}</div>
      <div class="calv-pie">${L('Next game', 'Proximo partido')}: <b>${_esc(cuando)}</b> ${dias === 0 ? '' : `· ${L('in', 'en')} ${dias} ${dias === 1 ? L('day','dia') : L('days','dias')}`}${opts.contexto ? ' · ' + _esc(opts.contexto) : ''}.</div>`;
  } else if (prox && dias != null && dias >= 0) {
    // Lejos (receso): hoy -> proximo, horizontal, con cuenta regresiva.
    cuerpo = `<div class="calv-fila">
        ${_bloqueDia(hoy, idioma, 'hoy', L('Today', 'Hoy'))}
        <div class="calv-con">
          <div class="calv-cuenta"><b>${dias}</b><i>${dias === 1 ? L('day','dia') : L('days','dias')}</i></div>
          ${opts.contexto ? `<div class="calv-ctx">${_esc(opts.contexto)}</div>` : ''}
        </div>
        ${_bloqueDia(prox, idioma, 'prox', encabezado)}
      </div>
      ${opts.nota ? `<div class="calv-pie">${_esc(opts.nota)}</div>` : ''}`;
  } else {
    // Sin fecha de proximo partido conocida: hoy y un aviso.
    cuerpo = `<div class="calv-fila">
        ${_bloqueDia(hoy, idioma, 'hoy', L('Today', 'Hoy'))}
        <div class="calv-con"><div class="calv-ctx">${opts.nota ? _esc(opts.nota) : L('No games scheduled right now.', 'No hay partidos programados ahora mismo.')}</div></div>
      </div>`;
  }

  return `${CSS}<div class="calv">
    <div class="calv-top"><div class="calv-tit">${L('Match calendar', 'Calendario de partidos')}</div>${titulo}</div>
    ${cuerpo}
  </div>`;
}
