/* ============================================================
   ÁREA PREMIUM DE SEÑALES — "Analyst signals" / "Señales del analista"
   Donde los usuarios Premium ven las señales publicadas por el analista:
   equipo elegido, probabilidad, confianza, mercado y su análisis.
   Con descargo de responsabilidad y la nota de que no se publican
   todos los días (solo cuando hay oportunidad).
   Bilingüe (inglés por defecto). Responsivo.
   ============================================================ */
import { listarAnalisis, listarAnalistas, misSeguidos, seguirAnalista, dejarDeSeguir, contarSeguidores, misVotos, votarSenal, quitarVoto, contarVotos, misApoyos, apoyarAnalista, cancelarApoyo, contarApoyos, reportarSenal, miReporte } from '../mesa/mesa-datos.js';
import { BOTS, botPorUid, seguidoresBot } from '../datos/bots.js';
import { usuarioActual } from '../auth/auth.js';
import { planPorId } from '../datos/planes.js';
import { estiloAttrs } from './estilo-senal.js';
import { idiomaActual } from './idioma.js';

const ES = () => idiomaActual() === 'es';
const L = (en, es) => (ES() ? es : en);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

let _cache = null;   // señales cacheadas para el punto indicador
let _snTab = 'inicio';   // Fase 9: pestaña activa del feed (inicio | siguiendo | populares)

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
    const ahora = Date.now();
    const caducada = (a) => a.caducidad && new Date(a.caducidad).getTime() <= ahora;   // el partido ya empezó
    _cache = (todas || []).filter(a => a && (a.estado == null || a.estado === 'publicado') && (a.texto || a.favorito || a.veredicto) && !caducada(a));
    // Limpieza en 2º plano: borra las caducadas (solo el admin tiene permiso; para otros falla en silencio)
    const viejas = (todas || []).filter(caducada);
    if (viejas.length) { import('../mesa/mesa-datos.js').then(m => { viejas.forEach(a => { try { m.borrarAnalisis(a.matchId || a.id); } catch (_) {} }); }).catch(() => {}); }
  } catch (_) { _cache = []; }
  return _cache;
}
export function contarSenales() { return _cache ? _cache.length : 0; }

/* Fase 3 — feed del perfil: señales de los analistas que sigo (siempre claras, ya pagué) */
export async function feedSeguidosHTML() {
  inyectarCSS();
  const lista = await cargarSenales();
  let sigo = new Set();
  try { sigo = new Set(await misSeguidos()); } catch (_) {}
  const mias = lista
    .filter(a => a.autorUid && sigo.has(a.autorUid))
    .sort((x, y) => _tsMs(y.actualizado) - _tsMs(x.actualizado));
  const ctx = { premium: true, nivel: 'premium', nClaras: Infinity, me: null, sigo, votos: {}, apoyos: new Set(), conteos: {} };
  return { total: mias.length, html: mias.map((a, i) => tarjeta(a, ctx, i)).join('') };
}

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
  .sn-locked .sn-c-inner{filter:blur(7px);pointer-events:none;user-select:none;opacity:.85}
  .sn-c-lock{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px;gap:5px;background:rgba(8,12,18,.5);backdrop-filter:blur(1px);border-radius:16px}
  .sn-c-lock-ic{color:#e8b84b;margin-bottom:2px}
  .sn-c-lock-ic svg{width:28px;height:28px}
  .sn-c-lock b{font-family:"Chakra Petch",sans-serif;font-size:15px;color:#fff}
  .sn-c-lock span{font-size:12.5px;color:#c7d0dc;max-width:250px;line-height:1.5;margin-bottom:8px}
  .sn-c-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
  .sn-c-match{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:16px;color:#fff}
  .sn-c-teams{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
  .sn-c-team{display:flex;align-items:center;gap:8px;flex:1;min-width:0}
  .sn-c-team:last-of-type{flex-direction:row-reverse;text-align:right}
  .sn-c-team span{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:13.5px;color:#c7d0dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}
  .sn-c-team.fav span{color:#fff;font-weight:800}
  .sn-c-team.fav span::after{content:" ★";color:var(--acc);font-size:10px}
  .sn-c-logo{width:28px;height:28px;flex:none;object-fit:contain}
  .sn-c-logo.ph{border-radius:50%;background:rgba(255,255,255,.08)}
  .sn-c-vs2{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:11px;color:#6b7683;flex:none;letter-spacing:.05em}
  .sn-c-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}
  .sn-c-analyst{display:flex;align-items:center;gap:11px;min-width:0}
  .sn-c-ava2{width:44px;height:44px;border-radius:12px;overflow:hidden;flex:none;background:rgba(255,255,255,.06);display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--acc) 35%,transparent)}
  .sn-c-ava2 img{width:100%;height:100%;object-fit:cover}
  .sn-c-ava2 svg{width:22px;height:22px;color:var(--acc)}
  .sn-c-who{min-width:0}
  .sn-c-who > b{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:15px;color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sn-c-who .sn-c-fol{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#8a95a3;margin-top:1px}
  .sn-c-who .sn-c-fol svg{width:13px;height:13px}
  .sn-c-verdict{display:flex;align-items:center;gap:11px;margin:14px 0 9px}
  .sn-c-arrow{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:color-mix(in srgb,var(--acc) 16%,transparent);color:var(--acc);flex:none}
  .sn-c-arrow svg{width:18px;height:18px}
  .sn-c-verdict .sn-c-team{flex:1;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:15px;color:#fff;min-width:0}
  .sn-c-verdict .sn-c-prob{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:23px;color:var(--acc)}
  .sn-c-pick-lbl{font-family:"Chakra Petch",sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;color:#6b7683;text-transform:uppercase;flex:none}
  .sn-c-note{font-size:13px;color:#c3ccd8;line-height:1.55;margin:0 0 13px}
  .sn-c-conf{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:4px 10px;border-radius:20px}
  .sn-c-conf.alta{color:#48d17e;background:rgba(38,194,129,.14)}.sn-c-conf.media{color:var(--g);background:rgba(232,184,75,.14)}.sn-c-conf.baja{color:#ef9a5a;background:rgba(232,120,60,.14)}
  .sn-c-pick{display:flex;align-items:center;gap:10px;margin:6px 0 10px}
  .sn-c-pick-lbl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tx3);font-weight:700}
  .sn-c-team{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:15px;color:#fff;flex:1;min-width:0}
  .sn-c-prob{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:26px;background:linear-gradient(180deg,#f8e7ad,#d4a53f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#e8c46a}
  .sn-c-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden;margin-bottom:12px}
  .sn-c-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg, color-mix(in srgb, var(--acc) 80%, #000 8%), var(--acc))}
  .sn-c-txt{font-size:13px;color:#c3ccd6;line-height:1.55;margin:0 0 12px;white-space:pre-wrap}
  .sn-c-vote{display:inline-flex;align-items:center;gap:8px}
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
  .sn-c-ava{width:30px;height:30px;border-radius:9px;overflow:hidden;flex:none;border:1px solid color-mix(in srgb, var(--acc) 40%, transparent);display:block}
  .sn-c-ava img{width:100%;height:100%;object-fit:cover;display:block}
  .sn-c-fol{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--tx2)}
  .sn-c-fol svg{width:14px;height:14px;opacity:.85}
  .sn-c-fol b{color:#e9eff6;font-weight:800}
  .sn-c-actions{display:flex;gap:8px}
  .sn-follow{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12px;letter-spacing:.02em;color:#0a0e15;background:linear-gradient(90deg,#38a9f0,#5cc0ff);border:0;border-radius:10px;padding:8px 16px;cursor:pointer;transition:filter .14s,transform .1s}
  .sn-follow:hover{filter:brightness(1.08)} .sn-follow:active{transform:scale(.97)}
  .sn-follow.on{color:#cfe0ee;background:transparent;border:1px solid rgba(120,150,180,.5)}
  /* Suscripción al servicio del analista (profesional, sin corazón/rosa) */
  .sn-sub{display:inline-flex;align-items:center;gap:6px;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:11.5px;letter-spacing:.02em;color:#efe3c6;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.42);border-radius:999px;padding:7px 15px;cursor:pointer;transition:filter .14s,background .14s}
  .sn-sub svg{width:14px;height:14px}
  .sn-sub:hover{background:rgba(232,184,75,.18)}
  .sn-sub.on{color:#1a1206;background:linear-gradient(90deg,#e8b84b,#f6e2a6);border-color:transparent}
  /* Tabs del feed (Todas / Siguiendo) */
  /* Descubre analistas */
  .sn-disc{margin:0 0 18px}
  .sn-disc-head{display:flex;align-items:center;gap:8px;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:13px;letter-spacing:.02em;color:#eef3f9;margin-bottom:10px}
  .sn-disc-head svg{width:16px;height:16px;color:var(--g)}
  .sn-disc-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
  .sn-disc-row::-webkit-scrollbar{height:6px}.sn-disc-row::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:99px}
  .sn-disc-card{--acc:#e8b84b;flex:0 0 auto;width:164px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;background:rgba(8,12,20,.5);border:0;border-radius:0;padding:28px 20px 26px;position:relative}
  .sn-disc-card::before{content:'';position:absolute;inset:0;z-index:0;background:url('assets/imagenes/marco.webp') center/100% 100% no-repeat;pointer-events:none}
  .sn-disc-card>*{position:relative;z-index:1}
  .sn-disc-ava{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:var(--acc);background:color-mix(in srgb, var(--acc) 15%, transparent);border:1px solid color-mix(in srgb, var(--acc) 34%, transparent);margin-bottom:4px;overflow:hidden}
  .sn-disc-ava img{width:100%;height:100%;object-fit:cover;display:block}
  .sn-disc-ava svg{width:23px;height:23px}
  .sn-disc-firma{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:14px;color:var(--acc);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sn-disc-sport{font-size:11px;color:var(--tx2)}
  .sn-disc-fol{font-size:11px;color:var(--tx3);margin-bottom:8px}
  .sn-disc-follow{width:100%;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:11.5px;color:#0a0e15;background:linear-gradient(90deg,#38a9f0,#5cc0ff);border:0;border-radius:999px;padding:8px 12px;cursor:pointer;transition:filter .14s}
  .sn-disc-follow:hover{filter:brightness(1.08)}
  .sn-disc-follow.on{color:#cfe0ee;background:transparent;border:1px solid rgba(120,150,180,.5)}
  .sn-tabs{display:flex;gap:6px;margin:0 0 16px;border-bottom:1px solid var(--line);padding-bottom:0}
  .sn-tab{position:relative;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:13px;letter-spacing:.02em;color:var(--tx2);background:transparent;border:0;padding:10px 4px;margin-right:16px;cursor:pointer;border-bottom:2px solid transparent;transition:color .14s,border-color .14s}
  .sn-tab b{display:inline-block;margin-left:6px;font-size:11px;background:rgba(232,184,75,.16);color:#e8c46a;border-radius:999px;padding:1px 7px}
  .sn-tab:hover{color:#cdd7e2}
  .sn-tab.on{color:#fff;border-bottom-color:var(--g)}
  /* Desplegable del análisis (texto largo) */
  .sn-c-toggle{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin:2px 0 4px;font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.02em;color:#cbd5e2;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:10px;padding:10px;cursor:pointer;transition:background .14s,border-color .14s}
  .sn-c-toggle:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.18)}
  .sn-c-toggle svg{width:15px;height:15px;transition:transform .2s}
  .sn-c-toggle.on svg{transform:rotate(180deg)}
  .sn-c-an{margin:8px 0 4px;padding:14px 15px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.02);max-height:340px;overflow-y:auto}
  .sn-c-an p{margin:0;color:#c5d0dc;font-size:13.5px;line-height:1.62;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
  /* Modal de suscripción */
  .sn-sub-bg{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(2,4,8,.72);backdrop-filter:blur(4px)}
  .sn-sub-modal{position:relative;width:100%;max-width:440px;background:linear-gradient(180deg,#151c28,#0d1219);border:1px solid var(--line);border-radius:20px;padding:30px 28px 26px;box-shadow:0 30px 90px rgba(0,0,0,.65)}
  .sn-sub-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:#cdd6e2;font-size:20px;line-height:1;cursor:pointer}
  .sn-sub-x:hover{color:#fff;border-color:rgba(240,53,58,.5);background:rgba(240,53,58,.12)}
  .sn-sub-eyebrow{font-family:"Chakra Petch",sans-serif;font-weight:700;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#efe3c6;margin-bottom:8px}
  .sn-sub-t{font-size:17px;color:var(--tx2);line-height:1.4}.sn-sub-t b{color:#fff}
  .sn-sub-price{font-family:"Chakra Petch",sans-serif;font-weight:800;color:#fff;margin:12px 0 16px;line-height:1;font-size:52px;display:flex;align-items:flex-start;gap:2px}
  .sn-sub-price .cur{font-size:26px;margin-top:6px}.sn-sub-price .per{font-size:16px;color:var(--tx2);font-weight:700;margin-top:auto;margin-bottom:8px}
  .sn-sub-list{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:10px}
  .sn-sub-list li{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:#d3dce7;line-height:1.4}
  .sn-sub-list svg{width:16px;height:16px;color:#2fd07f;flex:0 0 auto;margin-top:1px}
  .sn-sub-note{font-size:11.5px;color:var(--tx3);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:10px;padding:10px 13px;line-height:1.55;margin-bottom:18px}
  .sn-sub-btn{width:100%;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:14px;letter-spacing:.03em;color:#1a1206;background:linear-gradient(90deg,#e8b84b,#f6e2a6);border:0;border-radius:12px;padding:15px;cursor:pointer}
  .sn-sub-btn:hover{filter:brightness(1.05)}
  .sn-sub-btn.cancel{color:#f7b3b6;background:transparent;border:1px solid rgba(240,82,90,.5)}
  .sn-newbanner{display:flex;align-items:center;gap:10px;border:1px solid rgba(56,169,240,.35);background:linear-gradient(180deg,rgba(56,169,240,.12),rgba(56,169,240,.03));border-radius:12px;padding:11px 15px;margin:0 0 16px;color:#dbeafe;font-size:13.5px;font-weight:600}
  .sn-newbanner svg{width:18px;height:18px;color:#5cc0ff;flex:0 0 auto}
  .sn-lock-badge{display:inline-block;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12px;letter-spacing:.04em;color:#0a0e15;background:linear-gradient(90deg,#e8c46a,#f6e2a6);border-radius:999px;padding:5px 14px;margin-bottom:12px}
  .sn-c-firma{display:inline-flex;align-items:center;gap:6px;font-family:'Chakra Petch',sans-serif;font-weight:800;font-size:13.5px;color:var(--acc);background:color-mix(in srgb, var(--acc) 12%, transparent);border:1px solid color-mix(in srgb, var(--acc) 34%, transparent);border-radius:999px;padding:4px 12px 4px 10px;letter-spacing:.01em}
  .sn-i-strong .sn-c-firma{color:#0a0e15;background:var(--acc);border-color:var(--acc)}
  .sn-c-firma svg{width:13px;height:13px}
  .sn-c-name{font-size:11.5px;color:var(--tx3,#7a8593);font-weight:600}
  /* Fase 2: barra superior con botón "What is this section?" + disclaimer del modal */
  .sn-topbar{display:flex;justify-content:flex-end;margin:-6px 0 8px}
  .sn-about{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid var(--line);color:var(--tx2);border-radius:999px;padding:7px 13px;font-family:inherit;font-weight:700;font-size:12px;cursor:pointer;transition:color .14s,border-color .14s,background .14s}
  .sn-about:hover{color:#fff;border-color:rgba(232,184,75,.42);background:rgba(232,184,75,.08)}
  .sn-about svg{width:14px;height:14px;flex:0 0 auto}
  .sni-disc{display:flex;gap:10px;align-items:flex-start;margin-top:14px;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.03)}
  .sni-disc svg{width:17px;height:17px;color:var(--g);flex:0 0 auto;margin-top:1px}
  .sni-disc p{margin:0;font-size:12.5px;color:var(--tx2);line-height:1.55}
  /* Bloque 5: animación de pulsación del voto + botón reportar + modal */
  .sn-v:active{transform:scale(.92)}
  .sn-v.bump{animation:snPop .28s ease}
  @keyframes snPop{0%{transform:scale(1)}35%{transform:scale(1.16)}100%{transform:scale(1)}}
  .sn-report{display:inline-flex;align-items:center;gap:6px;margin-left:auto;background:none;border:1px solid var(--line);border-radius:999px;padding:5px 12px;color:var(--tx2);font-family:inherit;font-weight:700;font-size:12px;cursor:pointer;transition:border-color .14s,color .14s,background .14s}
  .sn-report svg{width:14px;height:14px}
  .sn-report:hover{color:#ffb4ba;border-color:rgba(240,82,90,.45);background:rgba(240,82,90,.08)}
  .sn-report:active{transform:scale(.96)}
  @media(max-width:400px){.sn-report span{display:none}}
  .rep-bg{position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,6,11,.74);backdrop-filter:blur(5px)}
  .rep-card{width:100%;max-width:420px;background:linear-gradient(180deg,#151c28,#0d1219);border:1px solid var(--line);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden}
  .rep-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--line)}
  .rep-head h3{margin:0;font-family:"Chakra Petch",sans-serif;font-size:17px;color:#fff}
  .rep-x{width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:#cdd6e2;font-size:16px;cursor:pointer}
  .rep-x:hover{color:#fff;border-color:rgba(240,82,90,.5);background:rgba(240,82,90,.12)}
  .rep-body{padding:18px 20px}
  .rep-sub{margin:0 0 14px;font-size:13px;color:var(--tx2);line-height:1.5}
  .rep-motivos{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
  .rep-m{border:1px solid var(--line);background:rgba(255,255,255,.03);color:#cdd7e2;border-radius:999px;padding:9px 14px;font-family:inherit;font-weight:700;font-size:12.5px;cursor:pointer;transition:border-color .14s,background .14s,color .14s}
  .rep-m.on{border-color:var(--g,#e8b84b);background:rgba(232,184,75,.12);color:var(--g,#e8b84b)}
  .rep-txt{width:100%;box-sizing:border-box;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:11px;padding:11px 12px;color:#eaf1f9;font-family:inherit;font-size:13.5px;line-height:1.5;resize:vertical}
  .rep-txt:focus{outline:none;border-color:var(--g,#e8b84b)}
  .rep-msg{font-size:13px;margin-top:12px;min-height:1px}
  .rep-msg.ok{color:#48d17e;font-weight:600}.rep-msg.err{color:#ff8a94;font-weight:600}
  .rep-foot{display:flex;gap:10px;padding:16px 20px;border-top:1px solid var(--line)}
  .rep-cancel{flex:0 0 auto;border:1px solid var(--line);background:none;color:#c7d2de;border-radius:11px;padding:12px 18px;font-family:inherit;font-weight:700;cursor:pointer}
  .rep-send{flex:1;border:0;background:var(--g,#e8b84b);color:#1a1206;border-radius:11px;padding:12px;font-family:"Chakra Petch",sans-serif;font-weight:800;cursor:pointer}
  .rep-send:hover{filter:brightness(1.05)}
  .rep-tg{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;background:#2aabee;color:#fff}
  .rep-tg-ic{width:56px;height:56px;margin:6px auto 14px;border-radius:50%;background:rgba(42,171,238,.14);display:flex;align-items:center;justify-content:center}
  .rep-tg-ic svg{width:30px;height:30px;color:#2aabee}
  @media(max-width:480px){.rep-bg{padding:10px}}
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

/* Franja "Descubre analistas": una tarjeta por analista (a partir de las señales). */
function bloqueDescubrir(analistas, ctx) {
  const IComp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>`;
  const cards = analistas.map(an => {
    const est = estiloAttrs(an.estilo);
    const sigo = ctx.sigo && ctx.sigo.has(an.uid);
    const ini = (an.firma || '?').trim().charAt(0).toUpperCase();
    const puede = ctx.premium && an.uid && an.uid !== ctx.me;
    const ava = an.foto
      ? `<img src="assets/imagenes/analistas/${String(an.foto).toLowerCase()}.webp" alt="" loading="lazy">`
      : (est.emblemaSVG || ini);
    return `<div class="sn-disc-card${an.foto ? ' con-foto' : ''}" style="${est.varCss}">
      <div class="sn-disc-ava">${ava}</div>
      <div class="sn-disc-firma">${esc(an.firma || '')}</div>
      <div class="sn-disc-sport">${esc(depenNombre(an.deporte))}</div>
      <div class="sn-disc-fol" data-discfol="${esc(an.uid)}">…</div>
      ${puede ? `<button class="sn-disc-follow ${sigo ? 'on' : ''}" data-follow="${esc(an.uid)}" data-firma="${esc(an.firma || '')}">${sigo ? L('Following', 'Siguiendo') : L('Follow', 'Seguir')}</button>` : ''}
    </div>`;
  }).join('');
  return `<div class="sn-disc">
    <div class="sn-disc-head">${IComp}<span>${L('Discover analysts', 'Descubre analistas')}</span></div>
    <div class="sn-disc-row">${cards}</div>
  </div>`;
}

/* Nombre de deporte legible (mapa mínimo; cae al id si no está). */
const _DEP = { soccer: { en: 'Soccer', es: 'Fútbol' }, nba: { en: 'Basketball', es: 'Básquet' }, basketball: { en: 'Basketball', es: 'Básquet' }, mlb: { en: 'Baseball', es: 'Béisbol' }, baseball: { en: 'Baseball', es: 'Béisbol' }, nhl: { en: 'Hockey', es: 'Hockey' }, hockey: { en: 'Hockey', es: 'Hockey' }, nfl: { en: 'Football', es: 'Fútbol Am.' } };
function depenNombre(id) { const d = _DEP[id]; return d ? L(d.en, d.es) : (id || ''); }

function tarjeta(a, ctx = {}, idx = 0) {
  let conf = a.confianza || 'media'; if (conf === 'baja' || !['alta','media'].includes(conf)) conf = 'media';
  const prob = a.prob != null ? Math.max(1, Math.min(99, a.prob)) : null;
  const mk = (MERCADO[a.mercado] || MERCADO.ml)();
  const pick = a.favorito ? `${esc(a.favorito)} ${L('to win', 'gana')}` : esc(a.veredicto || '');
  const firma = a.firma || a.autor || '';
  const uid = a.autorUid || '';
  const sid = a.id || a.matchId || '';
  const est = estiloAttrs(a.estilo);
  const emblema = est.emblemaSVG ? `<span class="sn-c-emblema">${est.emblemaSVG}</span>` : '';
  const IPen = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>`;
  const IUsers = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.2 2.7-5 5.5-5s5.5 1.8 5.5 5"/><path d="M16 6.5a3 3 0 010 6M18.5 20c0-2.4-1-3.9-2.5-4.7"/></svg>`;
  const ICheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;

  const puede = uid && uid !== ctx.me;   // seguir/suscribir disponible en todos los planes (pagar para recibir)
  const sigo = ctx.sigo && ctx.sigo.has(uid);
  const bloqueada = !sigo && uid !== ctx.me && idx >= (ctx.nClaras != null ? ctx.nClaras : Infinity);
  const suscrito = ctx.apoyos && ctx.apoyos.has(uid);
  const btnFollow = puede
    ? `<button class="sn-follow ${sigo ? 'on' : ''}" data-follow="${esc(uid)}" data-firma="${esc(firma)}">${sigo ? L('Following', 'Siguiendo') : L('Follow', 'Seguir')}</button>`
    : '';
  const acciones = btnFollow ? `<div class="sn-c-actions">${btnFollow}</div>` : '';
  const fotoUid = (ctx.fotoPorUid && ctx.fotoPorUid[uid]) || null;
  const avaHdr = fotoUid ? `<img src="assets/imagenes/analistas/${String(fotoUid).toLowerCase()}.webp" alt="" loading="lazy">` : (est.emblemaSVG || IPen);
  const header = `<div class="sn-c-hdr">
      <div class="sn-c-analyst"><span class="sn-c-ava2">${avaHdr}</span>
        <div class="sn-c-who"><b>${esc(firma || 'Analyst')}</b>${uid ? `<span class="sn-c-fol" data-fol="${esc(uid)}">${IUsers}<b>·</b> ${L('followers', 'seguidores')}</span>` : ''}</div></div>
      <span class="sn-c-conf ${conf}">${esc(confTx(conf))}</span>
    </div>`;

  const miV = (ctx.votos && ctx.votos[sid]) || 0;
  let _h = 0; for (let i = 0; i < sid.length; i++) _h = (_h * 31 + sid.charCodeAt(i)) >>> 0;
  const likesRnd = 7 + (_h % 58);                          // likes variados por señal
  const disRnd = (_h % 4 === 0) ? (_h % 3) : 0;            // casi sin dislikes
  const cReal = (ctx.conteos && ctx.conteos[sid]) || { likes: 0, dislikes: 0 };
  const cVot = { likes: (cReal.likes || 0) + likesRnd, dislikes: (cReal.dislikes || 0) + disRnd };
  const IUp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V10M2 12v8a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 11H14V6a2.5 2.5 0 00-2.5-2.5c-.6 0-1.1.4-1.3 1L7 10"/></svg>`;
  const IDown = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2v12M22 12V4a2 2 0 00-2-2H6.6a2 2 0 00-2 1.6l-1.4 7A2 2 0 005.2 13H10v5a2.5 2.5 0 002.5 2.5c.6 0 1.1-.4 1.3-1L17 14"/></svg>`;
  const IFlag = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/></svg>`;
  const votos = sid ? `<div class="sn-c-vote" data-sid="${esc(sid)}">
      <button class="sn-v like ${miV === 1 ? 'on' : ''}" data-v="1" title="${L('Like', 'Me gusta')}">${IUp}<b class="sn-v-n" data-likes>${(cVot.likes || 0).toLocaleString()}</b></button>
      <button class="sn-v dis ${miV === -1 ? 'on' : ''}" data-v="-1" title="${L('Dislike', 'No me gusta')}">${IDown}<b class="sn-v-n" data-dis>${(cVot.dislikes || 0).toLocaleString()}</b></button>
    </div>` : '';

  // Análisis largo (hasta ~1000 palabras): desplegable centrado y responsivo
  const IArrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12 6l6 6-6 6"/></svg>`;
  const IChev = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
  const explica = (a.analisis && String(a.analisis).trim()) ? `<p class="sn-c-note">${esc(a.analisis)}</p>` : '';
  const analisis = a.texto ? `<button class="sn-c-toggle" data-an="${esc(sid)}"><span>${L('Read analysis', 'Ver análisis')}</span>${IChev}</button>
    <div class="sn-c-an" id="an-${esc(sid)}" hidden><p>${esc(a.texto)}</p></div>` : '';

  const _eq = String(a.equipos || '').split(/\s+vs\.?\s+/i);
  const _local = a.local || _eq[0] || '';
  const _visita = a.visita || _eq[1] || '';
  const _favLocal = a.favLocal != null ? a.favLocal : (a.favorito ? String(a.favorito).toLowerCase() === String(_local).toLowerCase() : null);
  const logoImg = (src) => src ? `<img class="sn-c-logo" src="${esc(src)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="sn-c-logo ph"></span>`;
  const cabezal = (_local && _visita)
    ? `<div class="sn-c-teams">
        <div class="sn-c-team ${_favLocal === true ? 'fav' : ''}">${logoImg(a.logoLocal)}<span>${esc(_local)}</span></div>
        <span class="sn-c-vs2">VS</span>
        <div class="sn-c-team ${_favLocal === false ? 'fav' : ''}">${logoImg(a.logoVisita)}<span>${esc(_visita)}</span></div>
      </div>`
    : `<div class="sn-c-match">${esc(a.equipos || a.matchId || '')}</div>`;
  const overlay = bloqueada ? `<div class="sn-c-lock"><div class="sn-c-lock-ic">${IC.lock || '🔒'}</div><b>${L('Unlock this signal', 'Desbloquea esta señal')}</b><span>${L('Follow this analyst to see the pick and get it in your feed.', 'Sigue a este analista para ver el pick y recibirlo en tu feed.')}</span>${uid ? `<button class="sn-follow" data-follow="${esc(uid)}" data-firma="${esc(firma)}">${L('Follow', 'Seguir')}</button>` : ''}</div>` : '';
  return `<div class="sn-card ${est.cls} ${bloqueada ? 'sn-locked' : ''}" style="${est.varCss}">
    ${overlay}
    <div class="sn-c-inner">
    ${header}
    ${cabezal}
    <div class="sn-c-verdict"><span class="sn-c-pick-lbl">${L('Pick', 'Pronóstico')}</span><span class="sn-c-team">${pick}</span>${prob != null ? `<span class="sn-c-prob">${prob}%</span>` : ''}</div>
    ${prob != null ? `<div class="sn-c-bar"><i style="width:${prob}%"></i></div>` : ''}
    ${explica}
    ${analisis}
    <div class="sn-c-foot">${votos}${acciones}</div>
    </div>
  </div>`;
}

/* Para el editor del panel: inyecta el CSS de señales y devuelve una tarjeta
   de MUESTRA con el estilo dado (WYSIWYG idéntico a lo que ve el usuario). */
export function prepararEstilosSenal() { inyectarCSS(); }
export function tarjetaMuestra(estilo, firma, datos = {}) {
  return tarjeta({
    equipos: datos.equipos || 'Lakers vs Celtics', firma: firma || 'Falcón', autorUid: '',
    favorito: datos.favorito || 'Lakers',
    prob: datos.prob != null ? datos.prob : 68,
    confianza: datos.confianza || 'alta',
    mercado: datos.mercado || 'ml',
    texto: datos.texto != null ? datos.texto : L('Better recent form and home edge. High chance of winning.', 'Mejor forma reciente y ventaja de local. Alta probabilidad de ganar.'),
    estilo,
  }, {});
}

/* Convierte un timestamp de Firestore (o fecha) a milisegundos. */
function _tsMs(ts) {  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') { try { return ts.toMillis(); } catch (_) { return 0; } }
  if (ts.seconds != null) return ts.seconds * 1000;
  const d = new Date(ts); return isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function pintarSenales(cont, { esPremium = false, nivel = 'basic', abrirPlanes } = {}) {
  inyectarCSS();
  const IHelp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.4 2.4 0 013.6-1.6c1.3.8 1.2 2.4 0 3.1-.7.4-1.2.9-1.2 1.8M12 17h.01"/></svg>`;
  const topbar = `<div class="sn-topbar"><button class="sn-about" id="sn-about">${IHelp}<span>${L('What is this section?', '¿Qué es esta sección?')}</span></button></div>`;

  // Cuántas señales se ven CLARAS sin seguir: Basic 0, Pro 2, Premium/admin todas.
  const nivelReal = nivel === 'admin' ? 'admin' : (esPremium ? 'premium' : nivel);
  const nClaras = (nivelReal === 'admin' || nivelReal === 'premium') ? Infinity : (nivelReal === 'pro' ? 1 : 0);

  cont.innerHTML = `<div class="sn">${topbar}<div class="sn-empty"><div class="sn-spin"></div>${L('Loading signals…', 'Cargando señales…')}</div></div>`;
  const lista = await cargarSenales();

  // Fase 3 — a quién sigo + notificaciones de nuevas señales
  const me = (usuarioActual() && usuarioActual().uid) || null;
  let sigo = new Set();
  try { sigo = new Set(await misSeguidos()); } catch (_) {}
  let votos = {};
  try { votos = await misVotos(); } catch (_) {}
  let apoyos = new Set();
  try { apoyos = new Set(await misApoyos()); } catch (_) {}
  let yaReporte = false;
  try { yaReporte = !!(await miReporte()); } catch (_) {}
  let fotoPorUid = {}; let analistasLista = []; let analistaPorUid = {};
  try { analistasLista = await listarAnalistas(); analistasLista.forEach(an => { if (an.foto) fotoPorUid[an.uid] = an.foto; analistaPorUid[an.uid] = an; }); } catch (_) {}
  const ctx = { premium: esPremium, nivel: nivelReal, nClaras, me, sigo, votos, apoyos, conteos: {}, yaReporte, fotoPorUid };

  // Conteos de like/dislike de todas las señales (para mostrar y para ordenar "Populares")
  const sids = [...new Set(lista.map(a => a.id || a.matchId).filter(Boolean))];
  try { await Promise.all(sids.map(async sid => { ctx.conteos[sid] = await contarVotos(sid); })); } catch (_) {}
  const score = (a) => { const c = ctx.conteos[a.id || a.matchId] || { likes: 0, dislikes: 0 }; return (c.likes || 0) - (c.dislikes || 0); };

  // Notificación: señales de analistas que sigo, más nuevas que mi última visita
  const VISTO = 'sn_visto_' + (me || 'anon');
  const lastSeen = Number(localStorage.getItem(VISTO) || 0);
  const nuevas = lista.filter(a => a.autorUid && sigo.has(a.autorUid) && _tsMs(a.actualizado) > lastSeen).length;
  const banner = nuevas > 0
    ? `<div class="sn-newbanner">${IC.bell}<span>${nuevas} ${nuevas === 1 ? L('new signal from analysts you follow', 'nueva señal de analistas que sigues') : L('new signals from analysts you follow', 'nuevas señales de analistas que sigues')}</span></div>`
    : '';

  // Órdenes por pestaña
  const porFecha = (x, y) => _tsMs(y.actualizado) - _tsMs(x.actualizado);
  const inicio = lista.slice().sort((x, y) => {
    const sx = sigo.has(x.autorUid) ? 1 : 0, sy = sigo.has(y.autorUid) ? 1 : 0;
    if (sx !== sy) return sy - sx;                 // seguidos primero
    return porFecha(x, y);
  });
  const deSeguidos = inicio.filter(a => sigo.has(a.autorUid));
  const populares = lista.slice().sort((x, y) => (score(y) - score(x)) || porFecha(x, y));

  const visibles = inicio;   // una sola vista (se quitaron Following/Popular)
  // Premium ve solo el 50% de las señales del día (el resto, siguiendo a analistas).
  if (nivelReal === 'premium') ctx.nClaras = Math.max(1, Math.ceil(visibles.length / 2));

  // Descubrir analistas: uno por firma, a partir de las señales
  const vistos = new Set(); const analistas = [];
  inicio.forEach(a => { if (a.autorUid && !vistos.has(a.autorUid)) { vistos.add(a.autorUid); analistas.push({ uid: a.autorUid, firma: a.firma || a.autor || '', deporte: a.deporte, estilo: a.estilo, foto: fotoPorUid[a.autorUid] || null }); } });
  // Incluir también analistas/bots registrados aunque aún no tengan señales publicadas
  analistasLista.forEach(an => { if (an.uid && an.activo !== false && !vistos.has(an.uid)) { vistos.add(an.uid); analistas.push({ uid: an.uid, firma: an.firma || an.nombre || '', deporte: an.deporte, estilo: an.estilo, foto: an.foto || null }); } });
  const discover = analistas.length ? bloqueDescubrir(analistas, ctx) : '';

  const tabs = '';   // sin pestañas

  const grid = visibles.length
    ? `<div class="sn-grid">${visibles.map((a, i) => tarjeta(a, ctx, i)).join('')}</div>`
    : `<div class="sn-empty">${IC.flag}<b>${L('Nothing here yet', 'Nada aquí todavía')}</b><span>${tab === 'siguiendo' ? L('Follow analysts to see their signals gathered here.', 'Sigue analistas para ver sus señales reunidas aquí.') : L('No signals right now. New calls appear only when there is a clear opportunity.', 'No hay señales ahora. Los nuevos pronósticos aparecen solo cuando hay una oportunidad clara.')}</span></div>`;

  const cuerpo = lista.length
    ? `${topbar}${discover}${banner}${tabs}${grid}`
    : `${topbar}<div class="sn-empty">${IC.flag}<b>${L('No signals right now', 'No hay señales ahora')}</b><span>${L('The analyst hasn\u2019t published today. New calls appear here only when there is a clear opportunity. Check back later.', 'El analista no ha publicado hoy. Los nuevos pronósticos aparecen aquí solo cuando hay una oportunidad clara. Vuelve más tarde.')}</span></div>`;
  cont.innerHTML = `<div class="sn">${cuerpo}</div>`;

  cont.querySelector('#sn-about')?.addEventListener('click', () => abrirModalInfoSenales());
  // Aviso (descargo de responsabilidad) emergente la primera vez, se puede cerrar
  try { if (!localStorage.getItem('sn_info_visto')) { abrirModalInfoSenales(); localStorage.setItem('sn_info_visto', '1'); } } catch (_) {}

  cont.querySelectorAll('[data-sntab]').forEach(b => b.onclick = () => { _snTab = b.dataset.sntab; pintarSenales(cont, { esPremium, abrirPlanes }); });

  // Marcar como visto (la última fecha entre las señales cargadas)
  try {
    const maxTs = lista.reduce((m, a) => Math.max(m, _tsMs(a.actualizado)), lastSeen);
    localStorage.setItem(VISTO, String(Math.max(maxTs, Date.now() - 1)));
  } catch (_) {}

  // Hidratar nº de seguidores (tarjetas + franja de descubrir)
  const uids = [...new Set([...lista.map(a => a.autorUid), ...BOTS.map(b => b.uid)].filter(Boolean))];
  const pintarSeguidores = async (uid) => {
    let n = 0; try { n = await contarSeguidores(uid); } catch (_) {}
    n = seguidoresBot(analistaPorUid[uid], n);   // suma base figurativa + ajuste admin + reales (0 si no es analista listado)
    cont.querySelectorAll(`.sn-c-fol[data-fol="${CSS.escape(uid)}"]`).forEach(el => {
      el.innerHTML = `${el.querySelector('svg') ? el.querySelector('svg').outerHTML : ''}<b>${n.toLocaleString()}</b> ${L('followers', 'seguidores')}`;
    });
    cont.querySelectorAll(`[data-discfol="${CSS.escape(uid)}"]`).forEach(el => { el.textContent = `${n.toLocaleString()} ${L('followers', 'seguidores')}`; });
  };
  uids.forEach(uid => pintarSeguidores(uid));

  // Seguir / Siguiendo: sincroniza TODOS los botones del mismo analista (tarjeta + descubrir)
  const syncFollow = (uid, seguir) => cont.querySelectorAll(`[data-follow="${CSS.escape(uid)}"]`).forEach(b => {
    b.classList.toggle('on', seguir);
    b.textContent = seguir ? L('Following', 'Siguiendo') : L('Follow', 'Seguir');
  });
  cont.querySelectorAll('[data-follow]').forEach(btn => btn.onclick = async () => {
    const uid = btn.dataset.follow, firma = btn.dataset.firma || null;
    const seguir = !ctx.sigo.has(uid);
    const grupo = cont.querySelectorAll(`[data-follow="${CSS.escape(uid)}"]`);
    grupo.forEach(b => b.disabled = true);
    try {
      if (seguir) { await seguirAnalista(uid, firma); try { await apoyarAnalista(uid, firma); } catch (_) {} ctx.sigo.add(uid); }
      else { await dejarDeSeguir(uid); try { await cancelarApoyo(uid); } catch (_) {} ctx.sigo.delete(uid); }
      syncFollow(uid, seguir);
      await pintarSeguidores(uid);
    } catch (_) {}
    grupo.forEach(b => b.disabled = false);
  });

  // Votos: los conteos ya se pintaron desde ctx.conteos; aquí solo el toggle
  const pintarVotos = async (sid) => {
    let c = ctx.conteos[sid] || { likes: 0, dislikes: 0 };
    try { c = await contarVotos(sid); ctx.conteos[sid] = c; } catch (_) {}
    const box = cont.querySelector(`.sn-c-vote[data-sid="${CSS.escape(sid)}"]`);
    if (!box) return;
    const l = box.querySelector('[data-likes]'), d = box.querySelector('[data-dis]');
    if (l) l.textContent = (c.likes || 0).toLocaleString();
    if (d) d.textContent = (c.dislikes || 0).toLocaleString();
  };

  cont.querySelectorAll('.sn-c-vote').forEach(box => {
    const sid = box.dataset.sid;
    box.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
      const val = Number(b.dataset.v);
      const actual = ctx.votos[sid] || 0;
      const nuevo = (actual === val) ? 0 : val;      // volver a pulsar quita el voto
      // Actualización optimista de los conteos (respuesta visual inmediata)
      const c = ctx.conteos[sid] || { likes: 0, dislikes: 0 };
      if (actual === 1) c.likes = Math.max(0, (c.likes || 0) - 1);
      if (actual === -1) c.dislikes = Math.max(0, (c.dislikes || 0) - 1);
      if (nuevo === 1) c.likes = (c.likes || 0) + 1;
      if (nuevo === -1) c.dislikes = (c.dislikes || 0) + 1;
      ctx.conteos[sid] = c; ctx.votos[sid] = nuevo;
      // Pintar al instante: estado, números y animación de pulsación
      box.querySelectorAll('[data-v]').forEach(x => x.classList.remove('on'));
      if (nuevo !== 0) b.classList.add('on');
      const l = box.querySelector('[data-likes]'), d = box.querySelector('[data-dis]');
      if (l) l.textContent = (c.likes || 0).toLocaleString();
      if (d) d.textContent = (c.dislikes || 0).toLocaleString();
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      try {
        if (nuevo === 0) await quitarVoto(sid); else await votarSenal(sid, nuevo);
      } catch (_) {}
      pintarVotos(sid);
    });
  });

  // Reportar señal (soporte). Un solo reporte por usuario; después, grupo de Telegram.
  cont.querySelectorAll('[data-report]').forEach(b => b.onclick = () => {
    if (ctx.yaReporte) { abrirModalTelegram(); return; }
    abrirModalReporte({ sid: b.dataset.report, firma: b.dataset.rfirma || '', autorUid: b.dataset.rautor || '' }, () => { ctx.yaReporte = true; });
  });

  // Desplegable del análisis (texto largo) sin romper la tarjeta
  cont.querySelectorAll('[data-an]').forEach(b => b.onclick = () => {
    const body = cont.querySelector(`#an-${CSS.escape(b.dataset.an)}`);
    if (!body) return;
    const abierto = !body.hasAttribute('hidden');
    if (abierto) { body.setAttribute('hidden', ''); b.classList.remove('on'); }
    else { body.removeAttribute('hidden'); b.classList.add('on'); }
  });

  // Suscripción al servicio del analista ($2/mes)
  cont.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => {
    const uid = b.dataset.sub, firma = b.dataset.firma || '';
    const ya = b.classList.contains('on');
    abrirModalSuscripcion(firma, ya, async (accion) => {
      b.disabled = true;
      try {
        if (accion === 'suscribir') { await apoyarAnalista(uid, firma); b.classList.add('on'); b.innerHTML = `${ICheckMini}${L('Subscribed', 'Suscrito')}`; ctx.apoyos.add(uid); }
        else if (accion === 'cancelar') { await cancelarApoyo(uid); b.classList.remove('on'); b.textContent = L('Signals for $2/mo', 'Señales por $2/mes'); ctx.apoyos.delete(uid); }
      } catch (_) {}
      b.disabled = false;
    });
  });
}

const ICheckMini = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;

/* Modal de suscripción al servicio del analista (Fase 8). Servicio profesional,
   no caridad: compras las señales de ese analista por $2/mes. */
function abrirModalInfoSenales() {
  const es = idiomaActual() === 'es';
  const L = (en, esx) => es ? esx : en;
  document.getElementById('rep-bg')?.remove();
  const bg = document.createElement('div'); bg.id = 'rep-bg'; bg.className = 'rep-bg';
  const cerrar = () => bg.remove();
  bg.innerHTML = `<div class="rep-card" role="dialog" aria-modal="true" style="max-width:430px">
    <div class="rep-head"><h3>${L('Analyst signals', 'Señales del analista')}</h3><button class="rep-x" aria-label="close">✕</button></div>
    <div class="rep-body">
      <p class="rep-sub">${L('Follow analysts, see who is hot, and get their published calls first. Signals are posted only when there is a real edge, not every day.', 'Sigue analistas, mira quién está en racha y recibe sus pronósticos primero. Las señales se publican solo cuando hay una ventaja real, no todos los días.')}</p>
      <div class="sni-disc">${IC.info}<p>${L('These are the analyst\u2019s opinions for informational purposes, not betting advice. High variance: a high probability is never a guarantee.', 'Son opiniones del analista con fines informativos, no asesoría de apuestas. Alta varianza: una probabilidad alta nunca es garantía.')}</p></div>
    </div>
    <div class="rep-foot"><button class="rep-send" style="flex:1">${L('Got it', 'Entendido')}</button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.rep-x').onclick = cerrar;
  bg.querySelector('.rep-send').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
}

function abrirModalTelegram() {
  const es = idiomaActual() === 'es';
  const L = (en, esx) => es ? esx : en;
  const URL_TG = 'https://t.me/TraderRecord';
  document.getElementById('rep-bg')?.remove();
  const bg = document.createElement('div'); bg.id = 'rep-bg'; bg.className = 'rep-bg';
  const cerrar = () => bg.remove();
  const ITg = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3l-3 14.1c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.4 13 2.9 11.6c-1-.3-1-1 .2-1.4L20.6 3c.8-.3 1.5.2 1.3 1.3z"/></svg>`;
  bg.innerHTML = `<div class="rep-card" role="dialog" aria-modal="true" style="max-width:400px">
    <div class="rep-head"><h3>${L('Need more help?', '¿Necesitas más ayuda?')}</h3><button class="rep-x" aria-label="close">✕</button></div>
    <div class="rep-body" style="text-align:center">
      <div class="rep-tg-ic">${ITg}</div>
      <p class="rep-sub" style="text-align:center">${L('You have already sent your report. For any other issue, join our Telegram group and tell us there.', 'Ya enviaste tu reporte. Para cualquier otra reclamación, únete a nuestro grupo de Telegram y cuéntanos ahí.')}</p>
    </div>
    <div class="rep-foot"><button class="rep-cancel">${L('Close', 'Cerrar')}</button><a class="rep-send rep-tg" href="${URL_TG}" target="_blank" rel="noopener">${L('Join Telegram', 'Unirme a Telegram')}</a></div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.rep-x').onclick = cerrar; bg.querySelector('.rep-cancel').onclick = cerrar;
  bg.querySelector('.rep-tg').onclick = () => setTimeout(cerrar, 200);
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
}

function abrirModalReporte(info, onSuccess) {
  const es = idiomaActual() === 'es';
  const L = (en, esx) => es ? esx : en;
  document.getElementById('rep-bg')?.remove();
  const bg = document.createElement('div'); bg.id = 'rep-bg'; bg.className = 'rep-bg';
  const cerrar = () => bg.remove();
  const motivos = [
    ['enganoso', L('Misleading content', 'Contenido engañoso')],
    ['spam', L('Spam or advertising', 'Spam o publicidad')],
    ['ofensivo', L('Offensive language', 'Lenguaje ofensivo')],
    ['otro', L('Other', 'Otro')],
  ];
  let motivo = 'enganoso';
  bg.innerHTML = `<div class="rep-card" role="dialog" aria-modal="true">
    <div class="rep-head"><h3>${L('Report signal', 'Reportar señal')}</h3><button class="rep-x" aria-label="close">✕</button></div>
    <div class="rep-body">
      <p class="rep-sub">${L('Tell us what\u2019s wrong with this signal. Our team will review it. You can send one report; after that you can reach us on Telegram.', 'Cuéntanos qué pasa con esta señal. Nuestro equipo la revisará. Puedes enviar un reporte; después podrás escribirnos por Telegram.')}</p>
      <div class="rep-motivos">${motivos.map(([v, t]) => `<button class="rep-m ${v === motivo ? 'on' : ''}" data-m="${v}">${esc(t)}</button>`).join('')}</div>
      <textarea class="rep-txt" id="rep-txt" rows="3" maxlength="500" placeholder="${L('Add details (optional)', 'Agrega detalles (opcional)')}"></textarea>
      <div class="rep-msg" id="rep-msg"></div>
    </div>
    <div class="rep-foot"><button class="rep-cancel">${L('Cancel', 'Cancelar')}</button><button class="rep-send">${L('Send report', 'Enviar reporte')}</button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.rep-x').onclick = cerrar; bg.querySelector('.rep-cancel').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { motivo = b.dataset.m; bg.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('.rep-send').onclick = async () => {
    const msg = bg.querySelector('#rep-msg'); msg.className = 'rep-msg';
    const send = bg.querySelector('.rep-send'); send.disabled = true; const orig = send.textContent; send.textContent = '…';
    try {
      await reportarSenal(info.sid, { firma: info.firma, autorUid: info.autorUid, motivo, comentario: bg.querySelector('#rep-txt').value.trim() });
      if (typeof onSuccess === 'function') onSuccess();
      msg.classList.add('ok'); msg.textContent = L('Thanks. Your report was sent.', 'Gracias. Tu reporte fue enviado.');
      setTimeout(cerrar, 1100);
    } catch (_) {
      send.disabled = false; send.textContent = orig;
      msg.classList.add('err'); msg.textContent = L('Could not send the report. Try again.', 'No se pudo enviar el reporte. Inténtalo de nuevo.');
    }
  };
}

function abrirModalSuscripcion(firma, yaSuscrito, onAccion) {
  document.getElementById('sn-sub-bg')?.remove();
  const bg = document.createElement('div');
  bg.className = 'sn-sub-bg'; bg.id = 'sn-sub-bg';
  const cerrar = () => bg.remove();
  const nombre = esc(firma || L('this analyst', 'este analista'));
  bg.innerHTML = `<div class="sn-sub-modal" role="dialog" aria-modal="true">
    <button class="sn-sub-x" aria-label="close">&times;</button>
    <div class="sn-sub-eyebrow">${L('Analyst service', 'Servicio del analista')}</div>
    <div class="sn-sub-t">${yaSuscrito ? L('You receive the signals from', 'Recibes las señales de') : L('Receive the signals from', 'Recibe las señales de')} <b>${nombre}</b></div>
    <div class="sn-sub-price"><span class="cur">$</span>2<span class="per">/${L('mo', 'mes')}</span></div>
    <ul class="sn-sub-list">
      <li>${ICheckMini}${L('Every signal this analyst publishes', 'Todas las señales que publique este analista')}</li>
      <li>${ICheckMini}${L('Pinned to the top of your feed', 'Fijadas arriba en tu feed')}</li>
      <li>${ICheckMini}${L('Cancel whenever you want', 'Cancela cuando quieras')}</li>
    </ul>
    <div class="sn-sub-note">${L('Card payments arrive soon. For now this activates a preview so you can try the flow. No real charge is made yet.', 'Los pagos con tarjeta llegan pronto. Por ahora esto activa una vista previa para probar el flujo. Todavía no se hace ningún cobro real.')}</div>
    ${yaSuscrito
      ? `<button class="sn-sub-btn cancel" data-act="cancelar">${L('Cancel subscription', 'Cancelar suscripción')}</button>`
      : `<button class="sn-sub-btn" data-act="suscribir">${L('Subscribe for $2/mo', 'Suscribirme por $2/mes')}</button>`}
  </div>`;
  document.body.appendChild(bg);
  bg.querySelector('.sn-sub-x').onclick = cerrar;
  bg.onclick = (e) => { if (e.target === bg) cerrar(); };
  bg.querySelector('[data-act]').onclick = async (e) => { const acc = e.currentTarget.dataset.act; await onAccion(acc); cerrar(); };
}

