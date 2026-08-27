/* ============================================================
   VISTA PARLAY (premium) — Top 9 bateadores con mayor P(≥1 hit) hoy.
   Datos: MLB Stats API (statsapi.mlb.com) DIRECTO desde el navegador
   (CORS abierto). Sin proxy, sin worker, sin configuración.
   Si no hay datos aún (o falla la red), muestra DEMOSTRACIÓN marcada.
   Estética rojo/azul de la plataforma, banner con imágenes de fondo.
   ============================================================ */
import { topParlayHits } from '../analisis/mlb-parlay.js';

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* --- Datos de demostración (mientras no haya lineups/datos en vivo) --- */
const DEMO = [
  { rank:1, nombre:'CJ Abrams', equipoAbrev:'WSH', rivalAbrev:'COL', pitcher:'Gabriel Hughes', pitcherMano:'R', pitcherEra:6.54, slot:1, prob:79, confianza:'media',
    factores:['Rival con 6.54 ERA, muy bateable','Tope del orden: más apariciones','Zurdo frente a derecho'], riesgos:['Lineup no confirmado'] },
  { rank:2, nombre:'Bobby Witt Jr.', equipoAbrev:'KC', rivalAbrev:'TOR', pitcher:'Spencer Arrighetti', pitcherMano:'R', pitcherEra:4.73, slot:2, prob:78, confianza:'media',
    factores:['Contacto élite y velocidad','Abridor rival con 4.73 ERA','Tope del orden'], riesgos:['Juego nocturno: lineup por confirmar'] },
  { rank:3, nombre:'Gabriel Moreno', equipoAbrev:'ARI', rivalAbrev:'SF', pitcher:'Landen Roupp', pitcherMano:'R', pitcherEra:4.34, slot:5, prob:77, confianza:'media',
    factores:['.303 AVG (7º de MLB)','Baja tasa de ponche','El rival permite contacto'], riesgos:['Suele batear 5º–6º','Oracle deprime la ofensiva'] },
  { rank:4, nombre:'Ernie Clement', equipoAbrev:'TOR', rivalAbrev:'KC', pitcher:'Noah Cameron', pitcherMano:'L', pitcherEra:4.02, slot:6, prob:76, confianza:'media',
    factores:['Contacto extremo (9.9 turnos por K)','Derecho frente a zurdo','Muchas bolas en juego'], riesgos:['Parte baja del orden'] },
  { rank:5, nombre:'Rafael Devers', equipoAbrev:'SF', rivalAbrev:'ARI', pitcher:'Jose Cabrera', pitcherMano:'R', pitcherEra:5.60, slot:3, prob:75, confianza:'media',
    factores:['Rival novato con 5.60 ERA','Puesto 3–4 del orden','Zurdo frente a derecho'], riesgos:['Oracle castiga a los zurdos'] },
  { rank:6, nombre:'Jake McCarthy', equipoAbrev:'COL', rivalAbrev:'WSH', pitcher:'Jake Irvin', pitcherMano:'R', pitcherEra:5.82, slot:1, prob:74, confianza:'media',
    factores:['Rival con 5.82 ERA','Velocidad para infield hits','Zurdo frente a derecho'], riesgos:['Ofensiva floja de visita'] },
  { rank:7, nombre:'James Wood', equipoAbrev:'WSH', rivalAbrev:'COL', pitcher:'Gabriel Hughes', pitcherMano:'R', pitcherEra:6.54, slot:3, prob:73, confianza:'media',
    factores:['Rival con 6.54 ERA','OBP de .393','Puesto 3–4 del orden'], riesgos:['Ponche alto (153 en la campaña)'] },
  { rank:8, nombre:'William Contreras', equipoAbrev:'MIL', rivalAbrev:'NYM', pitcher:'Sean Manaea', pitcherMano:'L', pitcherEra:4.31, slot:3, prob:72, confianza:'baja',
    factores:['Derecho frente a zurdo','Ofensiva potente (82-51)','Puesto 3–4 del orden'], riesgos:['Manaea puede dominar'] },
  { rank:9, nombre:'Masyn Winn', equipoAbrev:'STL', rivalAbrev:'BAL', pitcher:'Trevor Rogers', pitcherMano:'L', pitcherEra:4.14, slot:2, prob:71, confianza:'baja',
    factores:['Derecho frente a zurdo','Tope del orden'], riesgos:['Rogers es el más sólido del grupo'] },
];

/* --------- CSS (inyectado una vez) --------- */
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

  /* HERO con imágenes rojo/azul en split diagonal + velo */
  .ply-hero{position:relative;border-radius:20px;overflow:hidden;margin-bottom:20px;isolation:isolate;border:1px solid var(--line)}
  .ply-hero-bg{position:absolute;inset:0;z-index:0}
  .ply-hero-bg::before,.ply-hero-bg::after{content:"";position:absolute;inset:0;background-size:cover;background-position:center}
  .ply-hero-bg::before{background-image:url('${AZUL}');clip-path:polygon(0 0,62% 0,42% 100%,0 100%)}
  .ply-hero-bg::after{background-image:url('${ROJO}');clip-path:polygon(62% 0,100% 0,100% 100%,42% 100%)}
  .ply-hero-veil{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(6,9,15,.60),rgba(6,9,15,.84)),radial-gradient(120% 100% at 50% 0,transparent,rgba(6,9,15,.5))}
  .ply-hero-in{position:relative;z-index:2;padding:30px 30px 26px}
  .ply-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;
    font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#dfeaf6;
    border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:6px 13px;background:rgba(0,0,0,.28)}
  .ply-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--az);box-shadow:0 0 10px var(--az)}
  .ply-title{font-family:"Chakra Petch",sans-serif;font-weight:800;letter-spacing:-.01em;line-height:1.04;
    font-size:clamp(26px,5vw,44px);color:#fff;margin:16px 0 8px;text-shadow:0 2px 20px rgba(0,0,0,.55)}
  .ply-title em{font-style:normal;background:linear-gradient(90deg,var(--az),#bfe0fb);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .ply-lead{color:#cbd4e0;font-size:14.5px;max-width:600px;line-height:1.55;text-shadow:0 1px 12px rgba(0,0,0,.6)}
  .ply-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .ply-meta span{font-size:11.5px;color:#d3dbe6;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:6px 11px;background:rgba(0,0,0,.32)}
  .ply-meta b{color:#fff}

  .ply-note{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(243,177,61,.28);
    background:rgba(243,177,61,.07);color:#f3cd8a;font-size:13px;line-height:1.5;padding:12px 15px;border-radius:12px;margin-bottom:18px}
  .ply-note b{color:#f7dca7;flex:0 0 auto}

  /* GRID de tarjetas */
  .ply-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
  .ply-c{position:relative;background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);
    border-radius:16px;padding:18px 18px 16px;overflow:hidden}
  .ply-c::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--az),transparent 70%);opacity:.65}
  .ply-c.r1::before,.ply-c.r2::before,.ply-c.r3::before{opacity:1;height:4px}

  .ply-c-top{display:flex;align-items:center;gap:12px;margin-bottom:13px}
  .ply-rank{flex:0 0 auto;width:40px;height:40px;border-radius:11px;display:grid;place-items:center;
    font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:#0a1017;
    background:linear-gradient(135deg,var(--az),#8fd0fb);box-shadow:0 4px 14px rgba(31,143,224,.35)}
  .ply-c.r4 .ply-rank,.ply-c.r5 .ply-rank,.ply-c.r6 .ply-rank,.ply-c.r7 .ply-rank,.ply-c.r8 .ply-rank,.ply-c.r9 .ply-rank{
    background:linear-gradient(135deg,#2a3646,#1a2431);color:#9fb0c2;box-shadow:none;border:1px solid var(--line)}
  .ply-idn{min-width:0;flex:1}
  .ply-nm{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:var(--tx);line-height:1.1;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ply-mt{font-size:12px;color:var(--tx2);font-weight:600;margin-top:2px}
  .ply-mt b{color:var(--tx)}

  .ply-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:15px}
  .ply-tag{font-size:11px;font-weight:600;color:var(--tx2);border:1px solid var(--line);border-radius:7px;
    padding:4px 8px;background:rgba(255,255,255,.02);white-space:nowrap}
  .ply-tag b{color:var(--tx)}
  .ply-tag.h{color:var(--az);border-color:rgba(77,180,247,.3)}

  /* Medidor de probabilidad — número de ALTO contraste sobre fondo oscuro */
  .ply-meter{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
  .ply-pct{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:40px;line-height:1;color:var(--az)}
  .ply-plab{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);font-weight:700;text-align:right;line-height:1.35}
  .ply-track{height:9px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden;margin:2px 0 14px}
  .ply-fill{height:100%;border-radius:6px;width:0;transition:width 1s cubic-bezier(.2,.7,.2,1);
    background:linear-gradient(90deg,var(--az2),var(--az));box-shadow:0 0 14px rgba(77,180,247,.45)}

  .ply-conf{display:inline-flex;align-items:center;gap:7px;font-family:"Chakra Petch",sans-serif;font-weight:700;
    font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:5px 12px}
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

  /* CANDADO premium */
  .ply-lock{position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--line);isolation:isolate}
  .ply-lock-in{position:relative;z-index:2;padding:56px 26px;text-align:center}
  .ply-lock h3{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:clamp(21px,3.6vw,30px);color:#fff;margin:16px 0 10px;text-shadow:0 2px 18px rgba(0,0,0,.55)}
  .ply-lock p{color:#cdd6e2;max-width:440px;margin:0 auto 20px;font-size:14px;line-height:1.55;text-shadow:0 1px 10px rgba(0,0,0,.5)}
  .ply-cta{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;
    font-size:13px;letter-spacing:.04em;color:#08111c;background:linear-gradient(90deg,var(--az),#9ad4fb);border:0;
    border-radius:999px;padding:13px 26px;cursor:pointer;text-transform:uppercase;box-shadow:0 6px 20px rgba(31,143,224,.4)}
  .ply-cta:hover{filter:brightness(1.06)}

  @media(max-width:560px){
    .ply-hero-in{padding:24px 20px 22px}
    .ply-grid{grid-template-columns:1fr}
    .ply-pct{font-size:34px}
    .ply-hero-bg::before{clip-path:polygon(0 0,70% 0,52% 100%,0 100%)}
    .ply-hero-bg::after{clip-path:polygon(70% 0,100% 0,100% 100%,52% 100%)}
  }
  `;
  document.head.appendChild(st);
}

/* --------- Render --------- */
function heroHTML(meta, demo, cargando) {
  const chips = [
    `<span>Fecha · <b>${esc(meta.fecha)}</b></span>`,
    `<span>Fuente · <b>MLB Stats API</b></span>`,
    `<span>Métrica · <b>P(≥1 hit)</b></span>`,
    demo ? `<span>Modo · <b>Demostración</b></span>` : `<span>Candidatos · <b>${meta.candidatosEvaluados || '—'}</b></span>`,
  ].join('');
  return `<div class="ply-hero">
    <div class="ply-hero-bg"></div><div class="ply-hero-veil"></div>
    <div class="ply-hero-in">
      <span class="ply-eyebrow"><i></i>${cargando ? 'Cargando análisis…' : 'Servicio Premium · Proyección'}</span>
      <div class="ply-title">Top 9 · Probabilidad de <em>≥1 Hit</em></div>
      <div class="ply-lead">Los nueve bateadores con mayor probabilidad estimada de conectar al menos un imparable hoy. Modelo propio sobre datos oficiales: pitcher confirmado, splits por mano, forma reciente y orden de bateo.</div>
      <div class="ply-meta">${chips}</div>
    </div>
  </div>`;
}

function cardHTML(p) {
  const fav = (p.factores || []).map(f => `<li>${esc(f)}</li>`).join('');
  const rsk = (p.riesgos || []).map(f => `<li>${esc(f)}</li>`).join('');
  return `<article class="ply-c r${p.rank}">
    <div class="ply-c-top">
      <div class="ply-rank">${p.rank}</div>
      <div class="ply-idn">
        <div class="ply-nm">${esc(p.nombre)}</div>
        <div class="ply-mt"><b>${esc(p.equipoAbrev || '')}</b> vs ${esc(p.rivalAbrev || '')}</div>
      </div>
    </div>
    <div class="ply-tags">
      <span class="ply-tag h">${esc(p.pitcherMano || 'R')}HP</span>
      <span class="ply-tag"><b>${esc(p.pitcher || '')}</b>${p.pitcherEra != null ? ' · ' + (+p.pitcherEra).toFixed(2) : ''}</span>
      <span class="ply-tag">Turno ${esc(p.slot || '—')}</span>
    </div>
    <div class="ply-meter">
      <div class="ply-pct">${p.prob}%</div>
      <div class="ply-plab">Probabilidad<br>de ≥1 hit</div>
    </div>
    <div class="ply-track"><div class="ply-fill" data-w="${p.prob}"></div></div>
    <span class="ply-conf ${p.confianza}"><i></i>Confianza ${esc(p.confianza)}</span>
    <div class="ply-split">
      ${fav ? `<div class="ply-blk f"><div class="ply-blk-t">Factores favorables</div><ul>${fav}</ul></div>` : ''}
      ${rsk ? `<div class="ply-blk r"><div class="ply-blk-t">Riesgos</div><ul>${rsk}</ul></div>` : ''}
    </div>
  </article>`;
}

function animar(cont) {
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; io.unobserve(e.target); } }), { threshold: .25 });
  cont.querySelectorAll('.ply-fill').forEach(b => io.observe(b));
}

/* API pública */
export async function pintarParlay(cont, { esPremium = false, abrirPlanes } = {}) {
  inyectarCSS();

  if (!esPremium) {
    cont.innerHTML = `<div class="ply"><div class="ply-lock">
      <div class="ply-hero-bg"></div><div class="ply-hero-veil"></div>
      <div class="ply-lock-in">
        <span class="ply-eyebrow"><i></i>Servicio Premium</span>
        <h3>Proyección de Hits</h3>
        <p>Cada día, los 9 bateadores con mayor probabilidad de conectar al menos un hit. Modelo propio sobre datos oficiales de MLB. Exclusivo del plan Premium.</p>
        <button class="ply-cta" id="ply-cta">Ver plan Premium</button>
      </div>
    </div></div>`;
    const b = cont.querySelector('#ply-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }

  cont.innerHTML = `<div class="ply">${heroHTML({ fecha: hoyISO() }, false, true)}</div>`;

  let jugadores = [], meta = { fecha: hoyISO() }, demo = false, nota = '';
  try {
    const r = await topParlayHits({ fecha: hoyISO(), n: 9 });   // directo, sin proxy
    if (r?.jugadores?.length) { jugadores = r.jugadores; meta = r.meta; }
    else { demo = true; nota = 'Los lineups de hoy aún no están publicados. Se muestra una demostración; el ranking en vivo aparece cuando MLB confirma las alineaciones, normalmente por la mañana del juego.'; }
  } catch (_) {
    demo = true; nota = 'No se pudo consultar la fuente en este momento. Se muestra una demostración.';
  }
  if (demo) { jugadores = DEMO; meta = { fecha: hoyISO(), candidatosEvaluados: DEMO.length }; }

  cont.innerHTML = `<div class="ply">
    ${heroHTML(meta, demo, false)}
    ${nota ? `<div class="ply-note"><b>Nota</b><span>${esc(nota)}</span></div>` : ''}
    <div class="ply-grid">${jugadores.map(cardHTML).join('')}</div>
    <div class="ply-foot">Estimaciones probabilísticas del modelo, no datos oficiales ni asesoría de apuestas. El béisbol es de alta varianza: una probabilidad alta no es certeza.</div>
  </div>`;
  animar(cont);
}
