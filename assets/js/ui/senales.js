/* ============================================================
   ÁREA PREMIUM DE SEÑALES — "Analyst signals" / "Señales del analista"
   Donde los usuarios Premium ven las señales publicadas por el analista:
   equipo elegido, probabilidad, confianza, mercado y su análisis.
   Con descargo de responsabilidad y la nota de que no se publican
   todos los días (solo cuando hay oportunidad).
   Bilingüe (inglés por defecto). Responsivo.
   ============================================================ */
import { listarAnalisis, misSeguidos, seguirAnalista, dejarDeSeguir, contarSeguidores, misVotos, votarSenal, quitarVoto, contarVotos } from '../mesa/mesa-datos.js';
import { usuarioActual } from '../auth/auth.js';
import { planPorId } from '../datos/planes.js';
import { estiloAttrs } from './estilo-senal.js';
import { idiomaActual } from './idioma.js';

const ES = () => idiomaActual() === 'es';
const L = (en, es) => (ES() ? es : en);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

let _cache = null;   // señales cacheadas para el punto indicador

const MERCADO = {
  ml: () => L('Match winner', 'Ganador del partido'),
  ml_ot: () => L('Winner (incl. OT)', 'Ganador (incl. TE)'),
  spread: () => L('Spread / Handicap', 'Hándicap'),
  totals: () => L('Totals (O/U)', 'Totales (M/M)'),
};
const confTx = (c) => ({ alta: L('High', 'Alta'), media: L('Medium', 'Media'), baja: L('Low', 'Baja') }[c] || c);

/* Lee y cachea las señales publicadas (estado 'publicado' o sin estado antiguo). */
export async function cargarSenales() {
  try {
    const todas = await listarAnalisis();
    _cache = (todas || []).filter(a => a && (a.estado == null || a.estado === 'publicado') && (a.texto || a.favorito || a.veredicto));
  } catch (_) { _cache = []; }
  return _cache;
}
export function contarSenales() { return _cache ? _cache.length : 0; }

let _css = false;
function inyectarCSS() {
  if (_css) return; _css = true;
  const st = document.createElement('style'); st.id = 'senales-css';
  st.textContent = `
  .sn{--l:#38a9f0;--r:#f0353a;--g:#e8b84b;--card:#0f1622;--line:rgba(255,255,255,.08);--tx:#eef3f9;--tx2:#98a4b4;--tx3:#5c6879;max-width:1080px;margin:0 auto}
  .sn *{box-sizing:border-box}
  .sn-head{margin-bottom:16px}
  .sn-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#efe3c6;border:1px solid rgba(232,184,75,.35);border-radius:999px;padding:6px 13px;background:rgba(232,184,75,.06)}
  .sn-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--g);box-shadow:0 0 10px var(--g)}
  .sn-title{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:clamp(24px,4vw,32px);color:#fff;margin:14px 0 6px;letter-spacing:-.01em}
  .sn-sub{color:var(--tx2);font-size:14px;max-width:640px;line-height:1.5}
  .sn-note{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent);border-radius:14px;padding:14px 16px;margin:16px 0 20px}
  .sn-note svg{width:18px;height:18px;color:var(--g);flex:0 0 auto;margin-top:1px}
  .sn-note b{color:#fff;font-size:13px;display:block;margin-bottom:3px}
  .sn-note p{color:var(--tx2);font-size:12.5px;line-height:1.55;margin:0}
  .sn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
  .sn-card{position:relative;background:linear-gradient(180deg,rgba(20,27,38,.9),rgba(13,18,26,.95));border:1px solid var(--line);border-radius:16px;padding:18px;overflow:hidden}
  .sn-card{--acc:#e8b84b}
  .sn-card::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--acc),transparent 75%)}
  .sn-c-emblema{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;color:var(--acc);background:color-mix(in srgb, var(--acc) 12%, transparent);flex:0 0 auto}
  .sn-c-emblema svg{width:19px;height:19px}
  .sn-i-subtle.sn-card::before{height:2px;opacity:.6}
  .sn-i-strong.sn-card::before{height:4px}
  .sn-i-strong.sn-card{box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--acc) 34%, transparent)}
  .sn-c-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .sn-c-match{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:17px;color:#fff}
  .sn-c-conf{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:4px 10px;border-radius:20px}
  .sn-c-conf.alta{color:#48d17e;background:rgba(38,194,129,.14)}.sn-c-conf.media{color:var(--g);background:rgba(232,184,75,.14)}.sn-c-conf.baja{color:#ef9a5a;background:rgba(232,120,60,.14)}
  .sn-c-pick{display:flex;align-items:center;gap:10px;margin:6px 0 10px}
  .sn-c-pick-lbl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tx3);font-weight:700}
  .sn-c-team{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:15px;color:#fff;flex:1;min-width:0}
  .sn-c-prob{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:26px;background:linear-gradient(180deg,#f8e7ad,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#e8c46a}
  .sn-c-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden;margin-bottom:12px}
  .sn-c-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg, color-mix(in srgb, var(--acc) 80%, #000 8%), var(--acc))}
  .sn-c-txt{font-size:13px;color:#c3ccd6;line-height:1.55;margin:0 0 12px;white-space:pre-wrap}
  .sn-c-vote{display:inline-flex;align-items:center;gap:8px;margin-left:auto}
  .sn-v{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:999px;padding:5px 12px 5px 10px;color:var(--tx2);font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12.5px;cursor:pointer;transition:border-color .14s,color .14s,background .14s}
  .sn-v svg{width:15px;height:15px}
  .sn-v-n{color:#e9eff6;font-weight:800;min-width:8px;text-align:left}
  .sn-v:hover{border-color:rgba(255,255,255,.22);color:#cdd7e2}
  .sn-v.like.on{color:#2fd07f;border-color:rgba(47,208,127,.5);background:rgba(47,208,127,.1)}
  .sn-v.like.on .sn-v-n{color:#2fd07f}
  .sn-v.dis.on{color:#f0525a;border-color:rgba(240,82,90,.5);background:rgba(240,82,90,.1)}
  .sn-v.dis.on .sn-v-n{color:#f0525a}
  .sn-c-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:11px;border-top:1px solid rgba(255,255,255,.06)}
  .sn-c-market{font-size:11.5px;color:var(--tx2);font-weight:600}
  .sn-empty,.sn-lock{display:flex;flex-direction:column;align-items:center;text-align:center;padding:56px 24px;color:var(--tx2)}
  .sn-empty svg,.sn-lock svg{width:44px;height:44px;color:#3a4656;margin-bottom:14px}
  .sn-lock svg{color:var(--g)}
  .sn-empty b,.sn-lock b{font-family:"Chakra Petch",sans-serif;font-size:18px;color:#fff;margin-bottom:7px}
  .sn-empty span,.sn-lock span{font-size:13.5px;max-width:440px;line-height:1.55}
  .sn-cta{display:inline-flex;align-items:center;gap:8px;margin-top:20px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#241a06;background:linear-gradient(90deg,#e8c46a,#f6e2a6);border:0;border-radius:999px;padding:13px 26px;cursor:pointer;box-shadow:0 6px 20px rgba(199,154,60,.4)}
  .sn-cta:hover{filter:brightness(1.06)}
  .sn-c-by{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-2px 0 12px}
  .sn-c-fol{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--tx2)}
  .sn-c-fol svg{width:14px;height:14px;opacity:.85}
  .sn-c-fol b{color:#e9eff6;font-weight:800}
  .sn-follow{margin-left:auto;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:11.5px;letter-spacing:.02em;color:#0a0e15;background:linear-gradient(90deg,#38a9f0,#5cc0ff);border:0;border-radius:999px;padding:6px 14px;cursor:pointer;transition:filter .14s,transform .1s}
  .sn-follow:hover{filter:brightness(1.08)} .sn-follow:active{transform:scale(.97)}
  .sn-follow.on{color:#cfe0ee;background:transparent;border:1px solid rgba(120,150,180,.5)}
  .sn-newbanner{display:flex;align-items:center;gap:10px;border:1px solid rgba(56,169,240,.35);background:linear-gradient(180deg,rgba(56,169,240,.12),rgba(56,169,240,.03));border-radius:12px;padding:11px 15px;margin:0 0 16px;color:#dbeafe;font-size:13.5px;font-weight:600}
  .sn-newbanner svg{width:18px;height:18px;color:#5cc0ff;flex:0 0 auto}
  .sn-lock-badge{display:inline-block;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12px;letter-spacing:.04em;color:#0a0e15;background:linear-gradient(90deg,#e8c46a,#f6e2a6);border-radius:999px;padding:5px 14px;margin-bottom:12px}
  .sn-c-firma{display:inline-flex;align-items:center;gap:6px;font-family:'Chakra Petch',sans-serif;font-weight:800;font-size:13.5px;color:var(--acc);background:color-mix(in srgb, var(--acc) 12%, transparent);border:1px solid color-mix(in srgb, var(--acc) 34%, transparent);border-radius:999px;padding:4px 12px 4px 10px;letter-spacing:.01em}
  .sn-i-strong .sn-c-firma{color:#0a0e15;background:var(--acc);border-color:var(--acc)}
  .sn-c-firma svg{width:13px;height:13px}
  .sn-c-name{font-size:11.5px;color:var(--tx3,#7a8593);font-weight:600}
  @media(max-width:560px){.sn-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
}

const IC = {
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V5a1 1 0 011-1h11l-2 4 2 4H6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 20a2 2 0 003 0"/></svg>`,
};

function tarjeta(a, ctx = {}) {
  const conf = a.confianza || 'media';
  const prob = a.prob != null ? Math.max(1, Math.min(99, a.prob)) : null;
  const mk = (MERCADO[a.mercado] || MERCADO.ml)();
  const pick = a.favorito ? `${esc(a.favorito)} ${L('to win', 'gana')}` : esc(a.veredicto || '');
  const firma = a.firma || a.autor || '';
  const uid = a.autorUid || '';
  const est = estiloAttrs(a.estilo);   // color/intensidad/emblema saneados (límites)
  const IPen = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
  const IUsers = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.2 2.7-5 5.5-5s5.5 1.8 5.5 5"/><path d="M16 6.5a3 3 0 010 6M18.5 20c0-2.4-1-3.9-2.5-4.7"/></svg>`;
  // Botón seguir (solo Premium y si hay uid y no soy yo mismo)
  const puedeSeguir = ctx.premium && uid && uid !== ctx.me;
  const sigo = ctx.sigo && ctx.sigo.has(uid);
  const btn = puedeSeguir
    ? `<button class="sn-follow ${sigo ? 'on' : ''}" data-follow="${esc(uid)}" data-firma="${esc(firma)}">${sigo ? L('Following', 'Siguiendo') : L('+ Follow', '+ Seguir')}</button>`
    : '';
  const by = firma ? `<div class="sn-c-by">
      ${emblema}<span class="sn-c-firma">${IPen}${esc(firma)}</span>
      ${uid ? `<span class="sn-c-fol" data-fol="${esc(uid)}">${IUsers}<b>·</b> ${L('followers', 'seguidores')}</span>` : ''}
      ${btn}
    </div>` : '';
  const emblema = est.emblemaSVG ? `<span class="sn-c-emblema">${est.emblemaSVG}</span>` : '';
  const sid = a.id || a.matchId || '';
  const miV = (ctx.votos && ctx.votos[sid]) || 0;
  const IUp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V10M2 12v8a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 11H14V6a2.5 2.5 0 00-2.5-2.5c-.6 0-1.1.4-1.3 1L7 10"/></svg>`;
  const IDown = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2v12M22 12V4a2 2 0 00-2-2H6.6a2 2 0 00-2 1.6l-1.4 7A2 2 0 005.2 13H10v5a2.5 2.5 0 002.5 2.5c.6 0 1.1-.4 1.3-1L17 14"/></svg>`;
  const votos = sid ? `<div class="sn-c-vote" data-sid="${esc(sid)}">
      <button class="sn-v like ${miV === 1 ? 'on' : ''}" data-v="1" title="${L('Like', 'Me gusta')}">${IUp}<b class="sn-v-n" data-likes>·</b></button>
      <button class="sn-v dis ${miV === -1 ? 'on' : ''}" data-v="-1" title="${L('Dislike', 'No me gusta')}">${IDown}<b class="sn-v-n" data-dis>·</b></button>
    </div>` : '';
  return `<div class="sn-card ${est.cls}" style="${est.varCss}">
    <div class="sn-c-top"><div class="sn-c-match">${esc(a.equipos || a.matchId || '')}</div><span class="sn-c-conf ${conf}">${esc(confTx(conf))}</span></div>
    ${by}
    <div class="sn-c-pick"><span class="sn-c-pick-lbl">${L('Pick', 'Pronóstico')}</span><span class="sn-c-team">${pick}</span>${prob != null ? `<span class="sn-c-prob">${prob}%</span>` : ''}</div>
    ${prob != null ? `<div class="sn-c-bar"><i style="width:${prob}%"></i></div>` : ''}
    ${a.texto ? `<p class="sn-c-txt">${esc(a.texto)}</p>` : ''}
    <div class="sn-c-foot"><span class="sn-c-market">${esc(mk)}</span>${votos}</div>
  </div>`;
}

/* Para el editor del panel: inyecta el CSS de señales y devuelve una tarjeta
   de MUESTRA con el estilo dado (WYSIWYG idéntico a lo que ve el usuario). */
export function prepararEstilosSenal() { inyectarCSS(); }
export function tarjetaMuestra(estilo, firma) {
  return tarjeta({
    equipos: 'Lakers vs Celtics', firma: firma || 'Falcón', autorUid: '',
    favorito: 'Lakers', prob: 68, confianza: 'alta', mercado: 'ml',
    texto: L('Better recent form and home edge. High chance of winning.', 'Mejor forma reciente y ventaja de local. Alta probabilidad de ganar.'),
    estilo,
  }, {});
}

/* Convierte un timestamp de Firestore (o fecha) a milisegundos. */
function _tsMs(ts) {  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') { try { return ts.toMillis(); } catch (_) { return 0; } }
  if (ts.seconds != null) return ts.seconds * 1000;
  const d = new Date(ts); return isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function pintarSenales(cont, { esPremium = false, abrirPlanes } = {}) {
  inyectarCSS();
  const head = `<div class="sn-head">
      <span class="sn-eyebrow"><i></i>${L('Analyst signals', 'Señales del analista')}</span>
      <div class="sn-title">${L('Analyst signals', 'Señales del analista')}</div>
      <div class="sn-sub">${L('Curated calls from our analyst — published only when there is a clear opportunity.', 'Pronósticos escogidos por nuestro analista — publicados solo cuando hay una oportunidad clara.')}</div>
    </div>
    <div class="sn-note">${IC.info}<div><b>${L('Please read', 'Ten en cuenta')}</b><p>${L('These are the analyst\u2019s opinions for informational purposes, not betting advice. Signals are not posted every day — only when there is a real edge. High variance: a high probability is never a guarantee.', 'Son opiniones del analista con fines informativos, no asesoría de apuestas. No se publican todos los días — solo cuando hay una ventaja real. Alta varianza: una probabilidad alta nunca es garantía.')}</p></div></div>`;

  if (!esPremium) {
    const pr = planPorId('premium');
    const precio = pr ? `$${pr.mensual}/${L('mo', 'mes')}` : `$8.99/${L('mo', 'mes')}`;
    cont.innerHTML = `<div class="sn">${head}
      <div class="sn-lock">${IC.lock}
        <span class="sn-lock-badge">${L('Premium', 'Premium')} · ${precio}</span>
        <b>${L('Analyst signals are Premium', 'Las señales son Premium')}</b>
        <span>${L('Following analysts and seeing every published call with the full reasoning is included in the Premium plan only. Lower plans don\u2019t have access to signals.', 'Seguir analistas y ver cada pronóstico publicado con el análisis completo está incluido solo en el plan Premium. Los planes inferiores no tienen acceso a las señales.')}</span>
        <button class="sn-cta" id="sn-cta">${L('Get Premium', 'Obtener Premium')} · ${precio}</button></div></div>`;
    const b = cont.querySelector('#sn-cta'); if (b && abrirPlanes) b.onclick = abrirPlanes;
    return;
  }

  cont.innerHTML = `<div class="sn">${head}<div class="sn-empty"><div class="sn-spin"></div>${L('Loading signals…', 'Cargando señales…')}</div></div>`;
  const lista = await cargarSenales();

  // Fase 3 — a quién sigo + notificaciones de nuevas señales
  const me = (usuarioActual() && usuarioActual().uid) || null;
  let sigo = new Set();
  try { sigo = new Set(await misSeguidos()); } catch (_) {}
  let votos = {};
  try { votos = await misVotos(); } catch (_) {}
  const ctx = { premium: esPremium, me, sigo, votos };

  // Notificación: señales de analistas que sigo, más nuevas que mi última visita
  const VISTO = 'sn_visto_' + (me || 'anon');
  const lastSeen = Number(localStorage.getItem(VISTO) || 0);
  const nuevas = lista.filter(a => a.autorUid && sigo.has(a.autorUid) && _tsMs(a.actualizado) > lastSeen).length;
  const banner = nuevas > 0
    ? `<div class="sn-newbanner">${IC.bell}<span>${nuevas} ${nuevas === 1 ? L('new signal from analysts you follow', 'nueva señal de analistas que sigues') : L('new signals from analysts you follow', 'nuevas señales de analistas que sigues')}</span></div>`
    : '';

  const cuerpo = lista.length
    ? `${banner}<div class="sn-grid">${lista.map(a => tarjeta(a, ctx)).join('')}</div>`
    : `<div class="sn-empty">${IC.flag}<b>${L('No signals right now', 'No hay señales ahora')}</b><span>${L('The analyst hasn\u2019t published today. New calls appear here only when there\u2019s a clear opportunity — check back later.', 'El analista no ha publicado hoy. Los nuevos pronósticos aparecen aquí solo cuando hay una oportunidad clara — vuelve más tarde.')}</span></div>`;
  cont.innerHTML = `<div class="sn">${head}${cuerpo}</div>`;

  // Marcar como visto (la última fecha entre las señales cargadas)
  try {
    const maxTs = lista.reduce((m, a) => Math.max(m, _tsMs(a.actualizado)), lastSeen);
    localStorage.setItem(VISTO, String(Math.max(maxTs, Date.now() - 1)));
  } catch (_) {}

  // Hidratar nº de seguidores por analista (agregación) — sin bloquear el render
  const uids = [...new Set(lista.map(a => a.autorUid).filter(Boolean))];
  uids.forEach(async uid => {
    let n = 0; try { n = await contarSeguidores(uid); } catch (_) {}
    cont.querySelectorAll(`.sn-c-fol[data-fol="${CSS.escape(uid)}"]`).forEach(el => {
      el.innerHTML = `${el.querySelector('svg') ? el.querySelector('svg').outerHTML : ''}<b>${n.toLocaleString()}</b> ${L('followers', 'seguidores')}`;
    });
  });

  // Cablear botones Seguir / Siguiendo
  cont.querySelectorAll('[data-follow]').forEach(btn => btn.onclick = async () => {
    const uid = btn.dataset.follow, firma = btn.dataset.firma || null;
    const seguir = !btn.classList.contains('on');
    btn.disabled = true;
    try {
      if (seguir) { await seguirAnalista(uid, firma); ctx.sigo.add(uid); }
      else { await dejarDeSeguir(uid); ctx.sigo.delete(uid); }
      btn.classList.toggle('on', seguir);
      btn.textContent = seguir ? L('Following', 'Siguiendo') : L('+ Follow', '+ Seguir');
      // refrescar el contador de ese analista
      let n = 0; try { n = await contarSeguidores(uid); } catch (_) {}
      cont.querySelectorAll(`.sn-c-fol[data-fol="${CSS.escape(uid)}"]`).forEach(el => {
        el.innerHTML = `${el.querySelector('svg') ? el.querySelector('svg').outerHTML : ''}<b>${n.toLocaleString()}</b> ${L('followers', 'seguidores')}`;
      });
    } catch (_) {}
    btn.disabled = false;
  });

  // Fase 7 — hidratar conteos de like/dislike por señal y cablear el toggle
  const pintarVotos = async (sid) => {
    let c = { likes: 0, dislikes: 0 };
    try { c = await contarVotos(sid); } catch (_) {}
    const box = cont.querySelector(`.sn-c-vote[data-sid="${CSS.escape(sid)}"]`);
    if (!box) return;
    const l = box.querySelector('[data-likes]'), d = box.querySelector('[data-dis]');
    if (l) l.textContent = c.likes.toLocaleString();
    if (d) d.textContent = c.dislikes.toLocaleString();
  };
  const sids = [...new Set(lista.map(a => a.id || a.matchId).filter(Boolean))];
  sids.forEach(sid => pintarVotos(sid));

  cont.querySelectorAll('.sn-c-vote').forEach(box => {
    const sid = box.dataset.sid;
    box.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
      const val = Number(b.dataset.v);
      const actual = ctx.votos[sid] || 0;
      const nuevo = (actual === val) ? 0 : val;      // volver a pulsar quita el voto
      box.querySelectorAll('[data-v]').forEach(x => x.classList.remove('on'));
      if (nuevo !== 0) b.classList.add('on');
      ctx.votos[sid] = nuevo;
      try {
        if (nuevo === 0) await quitarVoto(sid); else await votarSenal(sid, nuevo);
      } catch (_) {}
      pintarVotos(sid);
    });
  });
}
