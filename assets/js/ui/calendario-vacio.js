/* ============================================================
   calendario-vacio.js — estado "sin juegos / fuera de temporada" con
   un calendario bonito y responsivo (web y movil). UNA responsabilidad:
   devolver el HTML de ese calendario.

   Marca HOY y, si se conoce la fecha del proximo partido, dibuja el
   camino de dias hasta el y una cuenta regresiva. Si no se conoce
   (receso largo), muestra el mes actual con hoy marcado y un aviso.

   Usa los tokens del tema (var(--...)), asi se adapta a claro/oscuro.
   Sin emojis.
   ============================================================ */

const MESES = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};
const SEMANA = {
  en: ['Su','Mo','Tu','We','Th','Fr','Sa'],
  es: ['Do','Lu','Ma','Mi','Ju','Vi','Sa'],
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
.calv{max-width:420px;margin:0 auto;background:var(--tarjeta);border:1px solid var(--linea);
  border-radius:var(--r-xl,22px);box-shadow:var(--sombra-tarjeta);padding:18px 18px 16px;
  font-family:var(--sans);color:var(--tinta)}
.calv-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:14px}
.calv-mes{font-family:var(--display);font-weight:700;font-size:1.18rem;letter-spacing:.3px;color:var(--tinta)}
.calv-tit{font-size:.72rem;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.9px;font-weight:600;text-align:right}
.calv-sem{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}
.calv-sem span{text-align:center;font-size:.68rem;color:var(--tinta-3);font-weight:700;letter-spacing:.5px}
.calv-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.calv-d{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  border-radius:var(--r-sm,8px);font-size:.9rem;color:var(--tinta-2);background:var(--fondo-2);
  border:1px solid transparent;transition:transform .15s ease}
.calv-d.vacia{background:transparent}
.calv-d.camino{color:var(--tinta);background:var(--tarjeta-alta);border-color:var(--linea)}
.calv-d.hoy{background:var(--oro);color:#1a1205;font-weight:800;box-shadow:0 0 0 3px var(--oro-suave)}
.calv-d.prox{background:var(--verde-suave);color:var(--verde);font-weight:800;border-color:rgba(46,158,87,.55)}
.calv-d.prox::after{content:"";position:absolute;bottom:5px;width:5px;height:5px;border-radius:50%;background:var(--verde)}
.calv-foot{margin-top:15px;padding-top:13px;border-top:1px solid var(--linea-suave);display:flex;align-items:center;gap:12px}
.calv-cta{flex:0 0 auto;min-width:54px;text-align:center}
.calv-cta b{display:block;font-family:var(--display);font-weight:800;font-size:1.5rem;line-height:1;color:var(--oro)}
.calv-cta i{font-style:normal;font-size:.64rem;text-transform:uppercase;letter-spacing:.6px;color:var(--tinta-3)}
.calv-nota{font-size:.85rem;color:var(--tinta-2);line-height:1.45}
.calv-nota b{color:var(--tinta);font-weight:700}
.calv-ley{display:flex;gap:14px;margin-top:12px;flex-wrap:wrap}
.calv-ley span{display:inline-flex;align-items:center;gap:6px;font-size:.7rem;color:var(--tinta-3)}
.calv-ley i{width:11px;height:11px;border-radius:3px;display:inline-block}
.calv-ley .l-hoy{background:var(--oro)}
.calv-ley .l-prox{background:var(--verde)}
@media (max-width:520px){
  .calv{padding:14px 14px 13px;border-radius:var(--r-lg,16px)}
  .calv-mes{font-size:1.05rem}
  .calv-sem,.calv-dias{gap:5px}
  .calv-d{font-size:.8rem;border-radius:7px}
  .calv-cta b{font-size:1.3rem}
}
</style>`;

/* opciones: { titulo, hoy, proxima, nota, idioma } */
export function calendarioVacioHTML(opts = {}) {
  const idioma = opts.idioma === 'es' ? 'es' : 'en';
  const hoy = _soloDia(_fecha(opts.hoy));
  const prox = opts.proxima ? _soloDia(_fecha(opts.proxima)) : null;

  // Mes a dibujar: el de hoy (si el proximo partido cae este mes, se marca y
  // se dibuja el camino; si cae en otro mes, se marca solo la cuenta abajo).
  const anio = hoy.getFullYear(), mes = hoy.getMonth();
  const primero = new Date(anio, mes, 1);
  const dias = new Date(anio, mes + 1, 0).getDate();
  const offset = primero.getDay();   // 0=domingo

  const proxEsteMes = prox && prox.getFullYear() === anio && prox.getMonth() === mes;
  const diasHasta = prox ? Math.round((prox - hoy) / 86400000) : null;

  let celdas = '';
  for (let i = 0; i < offset; i++) celdas += '<div class="calv-d vacia"></div>';
  for (let d = 1; d <= dias; d++) {
    const esHoy = d === hoy.getDate();
    const esProx = proxEsteMes && d === prox.getDate();
    const enCamino = proxEsteMes && d > hoy.getDate() && d < prox.getDate();
    let cls = 'calv-d';
    if (esHoy) cls += ' hoy'; else if (esProx) cls += ' prox'; else if (enCamino) cls += ' camino';
    celdas += `<div class="${cls}">${d}</div>`;
  }

  const semana = SEMANA[idioma].map(s => `<span>${s}</span>`).join('');
  const titulo = opts.titulo ? `<div class="calv-tit">${_esc(opts.titulo)}</div>` : '';

  // Pie: cuenta regresiva si se conoce el proximo partido; si no, el aviso.
  const L = (en, es) => idioma === 'es' ? es : en;
  let pie;
  if (prox && diasHasta != null && diasHasta >= 0) {
    const etiqueta = diasHasta === 0 ? L('today', 'hoy') : diasHasta === 1 ? L('day', 'dia') : L('days', 'dias');
    const fechaProx = `${SEMANA[idioma][prox.getDay()]} ${prox.getDate()} ${MESES[idioma][prox.getMonth()]}`;
    pie = `<div class="calv-foot">
      <div class="calv-cta"><b>${diasHasta}</b><i>${etiqueta}</i></div>
      <div class="calv-nota">${L('Next games', 'Proximos juegos')}: <b>${_esc(fechaProx)}</b>.
      ${opts.nota ? _esc(opts.nota) : ''}</div>
    </div>
    <div class="calv-ley"><span><i class="l-hoy"></i>${L('Today','Hoy')}</span><span><i class="l-prox"></i>${L('Next game day','Dia de juego')}</span></div>`;
  } else {
    pie = `<div class="calv-foot">
      <div class="calv-nota">${opts.nota ? _esc(opts.nota) : L('No games scheduled right now. The day in gold is today.', 'No hay juegos programados ahora mismo. El dia en oro es hoy.')}</div>
    </div>
    <div class="calv-ley"><span><i class="l-hoy"></i>${L('Today','Hoy')}</span></div>`;
  }

  return `${CSS}<div class="calv">
    <div class="calv-top"><div class="calv-mes">${MESES[idioma][mes]} ${anio}</div>${titulo}</div>
    <div class="calv-sem">${semana}</div>
    <div class="calv-dias">${celdas}</div>
    ${pie}
  </div>`;
}
