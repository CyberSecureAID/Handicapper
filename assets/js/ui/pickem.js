/* =====================================================================
   PICK'EM — el constructor de combinaciones.
   El usuario arma su jugada con nuestros picks (2 a 6), ve la probabilidad
   combinada (deben cumplirse todas) y el multiplicador tipico de un pick'em,
   y comparte el slip como imagen de marca. NO somos casa de apuestas: es una
   herramienta de analisis; el usuario apuesta donde quiera.
   Identidad de la pagina: navy, dorado, Chakra Petch.

   IMPORTANTE (causa raiz de bugs antiguos): el CSS se inyecta SIEMPRE antes
   de crear el FAB o el toast, no solo al abrir el modal. Asi el boton flotante
   y los avisos nunca salen sin estilo ni rompen el fondo de la pagina.
   ===================================================================== */
import { idiomaActual } from './idioma.js';

const L = (en, es) => (idiomaActual() === 'es' ? es : en);
const LS = 'se-slip-v1';
const MAX = 6;
/* Multiplicador tipico "todas deben cumplirse" (estilo PrizePicks Power / Underdog). */
const MULT = { 2: 3, 3: 5, 4: 10, 5: 20, 6: 37.5 };

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function _load() { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (_) { return []; } }
function _save(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (_) {} }

/* ---------- COMBINADA DEL DIA ----------
   Lo que mas buscan los apostadores (combinada/parlay del dia, poco dinero y
   mucho pago). Se arma SOLA con el mejor pick de cada deporte que la app ya
   calculo (puente via localStorage 'se-mejores-v1', sin nuevas llamadas). Si no
   hay datos del dia, no se muestra: nunca estorba. */
const LS_DIA = 'se-mejores-v1';
function _hoyStr() { try { return new Date().toISOString().slice(0, 10); } catch (_) { return ''; } }
/* Transforma un pick de tarjeta en item listo para el slip (lo usa parlay.js). */
export function aSlipItem(p, cfg) { return aSlip(p, cfg); }
/* Devuelve los mejores picks del dia (uno por deporte), ordenados por prob. */
export function combinadaDelDia() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_DIA) || '{}');
    if (!raw || raw.fecha !== _hoyStr() || !raw.picks) return [];
    const arr = Object.values(raw.picks).filter(x => x && x.prob != null);
    arr.sort((a, b) => (b.prob || 0) - (a.prob || 0));
    const seen = new Set(); const out = [];
    for (const x of arr) { if (x.key && !seen.has(x.key)) { seen.add(x.key); out.push(x); } if (out.length >= 4) break; }
    return out;
  } catch (_) { return []; }
}
/* Carga una combinada completa en el slip (reemplaza lo que haya). */
export function cargarCombinada(items) {
  inyectar();
  if (!items || !items.length) return 0;
  const arr = items.slice(0, MAX);
  _save(arr);
  actualizarFAB();
  return arr.length;
}

export function pickKey(p, cfg) {
  cfg = cfg || {};
  const base = p.esPartido ? ((p.equipoAbrev || '') + '-' + (p.rivalAbrev || '')) : (p.nombre || '');
  return (cfg._sport || p.deporte || '') + ':' + base + ':' + (p.esPartido ? 'goals' : (cfg.metric || p._metric || ''));
}

function aSlip(p, cfg) {
  cfg = cfg || {};
  const linea = p.esPartido ? L('2+ goals', '2+ goles') : String(cfg.metricLabel || p.que || '').replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    key: pickKey(p, cfg),
    esPartido: !!p.esPartido,
    nombre: p.nombre || '',
    equipoAbrev: p.equipoAbrev || '', rivalAbrev: p.rivalAbrev || '',
    nomLocal: p.nomLocal || p.localNom || p.equipoAbrev || '', nomVisita: p.nomVisita || p.visitaNom || p.rivalAbrev || '',
    logoLocal: p.logoLocal || null, logoVisita: p.logoVisita || null,
    prob: p.esPartido ? (p.probOver15 != null ? p.probOver15 : p.prob) : p.prob,
    probOver05: p.probOver05 != null ? p.probOver05 : null,
    probOver15: p.probOver15 != null ? p.probOver15 : null,
    linea, deporte: cfg._sport || '',
  };
}

export function enSlip(key) { return _load().some(x => x.key === key); }

/* Agrega o quita un pick del slip. Devuelve true si quedo DENTRO. */
export function toggleSlip(p, cfg) {
  inyectar();
  const it = aSlip(p, cfg);
  const arr = _load();
  const i = arr.findIndex(x => x.key === it.key);
  let dentro;
  if (i >= 0) { arr.splice(i, 1); dentro = false; }
  else {
    if (arr.length >= MAX) { avisoMax(); return enSlip(it.key); }
    arr.push(it); dentro = true;
  }
  _save(arr);
  actualizarFAB();
  return dentro;
}

const IC_MAS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const IC_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;

/* Pinta el estado seleccionado/no de un boton "+" de tarjeta. */
function pintarBoton(boton, dentro, key) {
  if (!boton) return;
  boton.classList.toggle('on', !!dentro);
  boton.innerHTML = dentro ? IC_CHECK : IC_MAS;
  if (key) boton.setAttribute('data-slipkey', key);
}

/* PUNTO DE ENTRADA del "+" de cualquier tarjeta.
   La PRIMERA vez que se arma un slip (estaba vacio) sale un popup de marca que
   explica que es el pick'em y que hace el +. Despues agrega directo. */
export function clicMas(p, cfg, boton) {
  inyectar();
  const key = pickKey(p, cfg);
  const yaDentro = enSlip(key);
  const vacio = _load().length === 0;
  if (vacio && !yaDentro) {
    explicarPickem(() => { const dentro = toggleSlip(p, cfg); pintarBoton(boton, dentro, key); });
    return;
  }
  const dentro = toggleSlip(p, cfg);
  pintarBoton(boton, dentro, key);
}

function avisoMax() {
  inyectar();
  const t = document.createElement('div'); t.className = 'slip-toast';
  t.textContent = L('Max 6 picks in a pick’em.', 'Maximo 6 picks en una combinada.');
  document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, 2200);
}

function probComb(arr) { return arr.reduce((a, x) => a * ((x.prob || 0) / 100), 1); }
function multDe(n) { return MULT[n] || (n < 2 ? 0 : MULT[6]); }

/* ---------- Boton flotante (FAB) con el contador ---------- */
export function actualizarFAB() {
  inyectar();
  const n = _load().length;
  let fab = document.getElementById('slip-fab');
  if (!n) { if (fab) fab.remove(); return; }
  if (!fab) {
    fab = document.createElement('button'); fab.id = 'slip-fab'; fab.className = 'slip-fab';
    fab.type = 'button';
    fab.innerHTML = `<span class="slip-fab-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9h10M7 13h7"/></svg></span><span class="slip-fab-tx">${L('My pick’em', 'Mi combinada')}</span><b class="slip-fab-n"></b>`;
    fab.addEventListener('click', abrirSlip);
    document.body.appendChild(fab);
    requestAnimationFrame(() => fab.classList.add('on'));
  }
  fab.querySelector('.slip-fab-n').textContent = n;
}

/* ---------- Popup EXPLICATIVO (obligatorio al primer +) ---------- */
function explicarPickem(onConfirm) {
  inyectar();
  if (document.getElementById('pe-ov')) return;
  const ov = document.createElement('div'); ov.className = 'slip-ov pe-ov'; ov.id = 'pe-ov';
  ov.innerHTML = `<div class="slip-modal pe-modal" role="dialog" aria-modal="true">
    <div class="pe-head">
      <span class="pe-badge">${BADGE}</span>
      <div><div class="slip-eyebrow">${L('Sports Expectations', 'Sports Expectations')}</div>
      <h3>${L('Build your pick’em', 'Arma tu combinada')}</h3></div>
      <button class="slip-x" id="pe-x" aria-label="Close">${X}</button>
    </div>
    <div class="pe-body">
      <p>${L('The <b>+</b> adds this pick to your pick’em: your own combo of 2 to 6 of our picks.',
            'El <b>+</b> suma este pick a tu combinada: tu propia jugada con 2 a 6 de nuestros picks.')}</p>
      <ul class="pe-list">
        <li>${L('Pick 2 to 6 of our plays and stack them.', 'Elige de 2 a 6 de nuestros picks y combinalos.')}</li>
        <li>${L('We show the <b>combined chance</b> (all must hit) and the <b>typical multiplier</b>.', 'Te mostramos la <b>probabilidad combinada</b> (deben cumplirse todas) y el <b>multiplicador tipico</b>.')}</li>
        <li>${L('Share it as an image to WhatsApp or download it.', 'Compartela como imagen por WhatsApp o descargala.')}</li>
      </ul>
      <div class="pe-dis">${L('We analyze; we are not a sportsbook. You bet where you choose.', 'Nosotros analizamos; no somos casa de apuestas. Tu apuestas donde elijas.')}</div>
    </div>
    <div class="pe-acts">
      <button class="slip-clear" id="pe-cancel">${L('Cancel', 'Cancelar')}</button>
      <button class="pe-go" id="pe-go">${IC_MAS}<span>${L('Add pick', 'Agregar pick')}</span></button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  const cerrar = () => { ov.classList.remove('on'); setTimeout(() => ov.remove(), 200); };
  ov.onclick = (e) => { if (e.target === ov) cerrar(); };
  ov.querySelector('#pe-x').addEventListener('click', cerrar);
  ov.querySelector('#pe-cancel').addEventListener('click', cerrar);
  ov.querySelector('#pe-go').addEventListener('click', () => { cerrar(); try { onConfirm && onConfirm(); } catch (_) {} });
}

/* ---------- Modal del slip ---------- */
export function abrirSlip() {
  inyectar();
  if (document.getElementById('slip-ov')) return;
  const arr = _load();
  const ov = document.createElement('div'); ov.className = 'slip-ov'; ov.id = 'slip-ov';
  ov.innerHTML = `<div class="slip-modal" role="dialog" aria-modal="true">${cuerpo(arr)}</div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  wire(ov);
}

function cerrarSlip() { const o = document.getElementById('slip-ov'); if (o) { o.classList.remove('on'); setTimeout(() => o.remove(), 200); } }

function legHTML(x, i) {
  const dueloP = x.esPartido ? `${esc(x.nomLocal)} vs ${esc(x.nomVisita)}` : '';
  const titulo = x.esPartido ? dueloP : esc(x.nombre);
  const sub = x.esPartido ? x.linea : `${esc(x.linea)}${(x.equipoAbrev && x.rivalAbrev) ? ` · ${esc(x.equipoAbrev)} vs ${esc(x.rivalAbrev)}` : ''}`;
  const col = x.prob >= 66 ? 'var(--verde)' : (x.prob >= 55 ? 'var(--oro)' : 'var(--tinta-2)');
  return `<div class="slip-leg">
    <span class="slip-leg-n">${i + 1}</span>
    <div class="slip-leg-tx"><b>${titulo}</b><span>${sub}</span></div>
    <b class="slip-leg-p" style="color:${col}">${x.prob != null ? x.prob + '%' : '—'}</b>
    <button class="slip-leg-x" data-rm="${esc(x.key)}" aria-label="Remove">&times;</button>
  </div>`;
}

/* Fila compacta de un pick dentro de la sugerencia "combinada del dia". */
function legDiaHTML(x, i) {
  const titulo = x.esPartido ? `${esc(x.nomLocal)} vs ${esc(x.nomVisita)}` : esc(x.nombre);
  const col = x.prob >= 66 ? 'var(--verde)' : (x.prob >= 55 ? 'var(--oro)' : 'var(--tinta-2)');
  return `<div class="slip-dia-leg">
    <span class="slip-dia-n">${i + 1}</span>
    <div class="slip-dia-tx"><b>${titulo}</b><span>${esc(x.linea || '')}</span></div>
    <b style="color:${col}">${x.prob != null ? x.prob + '%' : '—'}</b>
  </div>`;
}

function cuerpo(arr) {
  const n = arr.length;
  const pc = Math.round(probComb(arr) * 100);
  const mult = multDe(n);
  let legs;
  if (arr.length) {
    legs = arr.map(legHTML).join('');
  } else {
    const dia = combinadaDelDia();
    if (dia.length >= 2) {
      const dpc = Math.round(probComb(dia) * 100);
      legs = `<div class="slip-dia">
        <div class="slip-dia-h"><span class="slip-dia-eye">${L('Today’s combo', 'Combinada del día')}</span><b>${dia.length} picks · ${dpc}%</b></div>
        ${dia.map(legDiaHTML).join('')}
        <button class="slip-dia-go" id="slip-dia-go">${L('Build this combo', 'Armar esta combinada')}</button>
        <div class="slip-dia-or">${L('or add your own with the + on any card', 'o agrega los tuyos con el + de cualquier tarjeta')}</div>
      </div>`;
    } else {
      legs = `<div class="slip-empty">${L('Add picks with the + on any card to build your pick’em.', 'Agrega picks con el + de cualquier tarjeta para armar tu combinada.')}</div>`;
    }
  }
  const resumen = n >= 2 ? `
    <div class="slip-sum">
      <div class="slip-sum-b"><span>${L('Combined chance', 'Probabilidad combinada')}</span><b>${pc}%</b><small>${L('all must hit', 'deben cumplirse todas')}</small></div>
      <div class="slip-sum-b"><span>${L('Typical multiplier', 'Multiplicador tipico')}</span><b class="oro">${mult}x</b><small>${L('pick’em payout', 'pago de pick’em')}</small></div>
    </div>` : (n === 1 ? `<div class="slip-hint">${L('Add one more pick to see the combined odds.', 'Agrega un pick mas para ver la combinada.')}</div>` : '');
  return `
    <div class="slip-head">
      <div><div class="slip-eyebrow">${L('Sports Expectations', 'Sports Expectations')}</div><h3>${L('My pick’em', 'Mi combinada')}</h3></div>
      <span class="slip-count">${n}/${MAX}</span>
      <button class="slip-x" id="slip-x" aria-label="Close">${X}</button>
    </div>
    <div class="slip-legs">${legs}</div>
    ${resumen}
    <div class="slip-acts">
      <button class="slip-clear" id="slip-clear" ${n ? '' : 'disabled'}>${L('Clear', 'Vaciar')}</button>
      <button class="slip-dl" id="slip-dl" ${n >= 2 ? '' : 'disabled'} aria-label="${L('Download image', 'Descargar imagen')}" title="${L('Download', 'Descargar')}">${DL}<span>${L('Download', 'Descargar')}</span></button>
      <button class="slip-wa" id="slip-wa" ${n >= 2 ? '' : 'disabled'} aria-label="${L('Share on WhatsApp', 'Compartir por WhatsApp')}" title="WhatsApp">${WA}</button>
    </div>`;
}

function refrescar() {
  const m = document.querySelector('#slip-ov .slip-modal');
  if (!m) return;
  m.innerHTML = cuerpo(_load());
  wire(document.getElementById('slip-ov'));
  actualizarFAB();
}

async function compartirSlipImg(modo) {
  try {
    const mod = await import('./compartir.js');
    const arr = _load();
    mod.compartirSlip(arr, { pc: Math.round(probComb(arr) * 100), mult: multDe(arr.length), modo });
  } catch (_) {}
}

function wire(ov) {
  ov.onclick = (e) => { if (e.target === ov) cerrarSlip(); };
  ov.querySelector('#slip-x')?.addEventListener('click', cerrarSlip);
  ov.querySelector('#slip-clear')?.addEventListener('click', () => { _save([]); refrescar(); });
  ov.querySelectorAll('.slip-leg-x[data-rm]').forEach(b => b.addEventListener('click', () => {
    const arr = _load().filter(x => x.key !== b.dataset.rm); _save(arr);
    // actualizar el + de las tarjetas si estan visibles
    document.querySelectorAll(`.ply-slip[data-slipkey="${CSS.escape(b.dataset.rm)}"]`).forEach(btn => { btn.classList.remove('on'); btn.innerHTML = IC_MAS; });
    refrescar();
  }));
  ov.querySelector('#slip-dl')?.addEventListener('click', () => compartirSlipImg('descargar'));
  ov.querySelector('#slip-wa')?.addEventListener('click', () => compartirSlipImg('whatsapp'));
  ov.querySelector('#slip-dia-go')?.addEventListener('click', () => {
    cargarCombinada(combinadaDelDia());
    // reflejar el estado "on" en los + de las tarjetas visibles
    _load().forEach(x => document.querySelectorAll(`.ply-slip[data-slipkey="${CSS.escape(x.key)}"]`).forEach(btn => { btn.classList.add('on'); btn.innerHTML = IC_CHECK; }));
    refrescar();
  });
}

const X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 4 5-4M5 20h14"/></svg>`;
const WA = `<svg viewBox="0 0 32 32" fill="currentColor" width="17" height="17"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.1 1.6 5.9L4 29l8.3-2.2c1.7.9 3.6 1.4 5.5 1.4h.2C24.6 28.2 30 22.8 30 16.2 30 9.6 24.6 3 16 3z"/><path d="M22 18.3c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.8.6-.1 1.9-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" fill="#0b1f14"/></svg>`;
const BADGE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9h10M7 13h7"/></svg>`;

function inyectar() {
  if (document.getElementById('pickem-css')) return;
  const st = document.createElement('style'); st.id = 'pickem-css';
  st.textContent = `
  .slip-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0));z-index:1150;display:flex;align-items:center;gap:9px;padding:12px 18px 12px 16px;border:0;border-radius:40px;cursor:pointer;
    background:linear-gradient(135deg,var(--oro,#e8c46a),#f6e2a6);color:#241a06;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:13.5px;letter-spacing:.02em;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 24px rgba(232,184,75,.4);transform:translateY(20px) scale(.9);opacity:0;transition:transform .25s,opacity .25s}
  .slip-fab.on{transform:none;opacity:1}
  .slip-fab:hover{filter:brightness(1.04)}
  .slip-fab:active{transform:scale(.97)}
  .slip-fab-ic{display:flex}.slip-fab-ic svg{width:19px;height:19px;display:block}
  .slip-fab-n{position:absolute;top:-7px;right:-6px;min-width:22px;height:22px;padding:0 6px;border-radius:12px;background:#241a06;color:var(--oro,#e8c46a);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid var(--fondo,#0a0d13);box-shadow:0 2px 6px rgba(0,0,0,.35)}
  @media(max-width:760px){.slip-fab{bottom:calc(80px + env(safe-area-inset-bottom,0));padding:14px;border-radius:50%}.slip-fab-tx{display:none}}
  .slip-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%) translateY(10px);z-index:1300;background:var(--tarjeta-alta,#141a24);border:1px solid var(--linea,rgba(255,255,255,.1));color:var(--tinta,#eef2f7);padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:all .25s;box-shadow:0 10px 30px rgba(0,0,0,.4)}
  .slip-toast.on{opacity:1;transform:translateX(-50%)}
  .slip-ov{position:fixed;inset:0;z-index:1200;background:rgba(4,7,12,.74);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;transition:opacity .2s}
  .slip-ov.on{opacity:1}
  .slip-modal{width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;background:var(--tarjeta,#10151d);border:1px solid var(--linea,rgba(255,255,255,.1));border-radius:20px 20px 0 0;overflow-y:auto;box-shadow:0 -10px 40px rgba(0,0,0,.5);transform:translateY(24px);transition:transform .24s}
  .slip-ov.on .slip-modal{transform:none}
  @media(min-width:620px){.slip-ov{align-items:center;padding:18px}.slip-modal{border-radius:20px}}
  .slip-head{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--linea,rgba(255,255,255,.1));position:relative}
  .slip-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--azul,#1d9bf0),var(--oro,#e8c46a),var(--rojo,#e23b3f))}
  .slip-eyebrow{font-family:var(--mono,"Chakra Petch",sans-serif);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--oro,#e8c46a)}
  .slip-head h3{margin:3px 0 0;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:21px;color:var(--tinta,#eef2f7)}
  .slip-count{margin-left:auto;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:700;font-size:13px;color:var(--tinta-2,#9aa6b2);background:var(--fondo-2,#0e131c);border:1px solid var(--linea,rgba(255,255,255,.1));padding:4px 10px;border-radius:9px}
  .slip-x{flex:none;width:34px;height:34px;border-radius:10px;border:1px solid var(--linea,rgba(255,255,255,.1));background:var(--fondo-2,#0e131c);color:var(--tinta-2,#9aa6b2);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .slip-x svg{width:16px;height:16px}.slip-x:hover{color:var(--oro,#e8c46a);border-color:var(--oro,#e8c46a)}
  .slip-legs{padding:6px 20px}
  .slip-leg{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--linea-suave,rgba(255,255,255,.06))}
  .slip-leg:last-child{border-bottom:0}
  .slip-leg-n{flex:none;width:26px;height:26px;border-radius:8px;background:var(--oro-suave,rgba(232,184,75,.14));color:var(--oro,#e8c46a);font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
  .slip-leg-tx{flex:1;min-width:0}
  .slip-leg-tx b{display:block;font-size:14.5px;color:var(--tinta,#eef2f7);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .slip-leg-tx span{display:block;font-size:12px;color:var(--tinta-2,#9aa6b2);margin-top:1px}
  .slip-leg-p{flex:none;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:16px}
  .slip-leg-x{flex:none;width:26px;height:26px;border-radius:7px;border:0;background:rgba(255,255,255,.05);color:var(--tinta-3,#6b7686);cursor:pointer;font-size:16px;line-height:1}
  .slip-leg-x:hover{color:var(--rojo,#e23b3f);background:var(--rojo-suave,rgba(226,59,63,.14))}
  .slip-empty,.slip-hint{padding:26px 8px;text-align:center;color:var(--tinta-3,#6b7686);font-size:13px}
  .slip-hint{padding:14px 8px}
  .slip-dia{margin:8px 0 2px;padding:14px;border-radius:16px;background:var(--fondo-2,#0e131c);border:1px solid rgba(232,184,75,.28)}
  .slip-dia-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .slip-dia-eye{font-family:var(--mono,"Chakra Petch",sans-serif);font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--oro,#e8c46a)}
  .slip-dia-h b{font-family:var(--display,"Chakra Petch",sans-serif);font-size:13px;color:var(--tinta,#eef2f7)}
  .slip-dia-leg{display:flex;align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid var(--linea-suave,rgba(255,255,255,.06))}
  .slip-dia-leg:last-of-type{border-bottom:0}
  .slip-dia-n{flex:none;width:22px;height:22px;border-radius:7px;background:var(--oro-suave,rgba(232,184,75,.14));color:var(--oro,#e8c46a);font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
  .slip-dia-tx{flex:1;min-width:0}
  .slip-dia-tx b{display:block;font-size:13.5px;color:var(--tinta,#eef2f7);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .slip-dia-tx span{display:block;font-size:11.5px;color:var(--tinta-2,#9aa6b2)}
  .slip-dia-leg>b{flex:none;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:15px}
  .slip-dia-go{width:100%;margin-top:12px;padding:12px;border-radius:11px;border:0;cursor:pointer;background:linear-gradient(135deg,var(--oro,#e8c46a),#f6e2a6);color:#241a06;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:13.5px}
  .slip-dia-go:hover{filter:brightness(1.04)}
  .slip-dia-or{margin-top:9px;text-align:center;font-size:11px;color:var(--tinta-3,#6b7686)}
  .slip-sum{display:flex;gap:12px;padding:14px 20px 4px}
  .slip-sum-b{flex:1;background:var(--fondo-2,#0e131c);border:1px solid var(--linea,rgba(255,255,255,.1));border-radius:14px;padding:13px;text-align:center}
  .slip-sum-b span{display:block;font-size:11px;color:var(--tinta-2,#9aa6b2);text-transform:uppercase;letter-spacing:.05em}
  .slip-sum-b b{display:block;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:30px;color:var(--tinta,#eef2f7);margin:3px 0 1px}
  .slip-sum-b b.oro{color:var(--oro,#e8c46a)}
  .slip-sum-b small{font-size:10.5px;color:var(--tinta-3,#6b7686)}
  .slip-acts{display:flex;gap:10px;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0))}
  .slip-clear{flex:none;padding:13px 16px;border-radius:12px;border:1px solid var(--linea,rgba(255,255,255,.1));background:var(--fondo-2,#0e131c);color:var(--tinta-2,#9aa6b2);font-family:var(--display,"Chakra Petch",sans-serif);font-weight:700;font-size:13px;cursor:pointer}
  .slip-clear:disabled{opacity:.4;cursor:default}
  .slip-dl{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:1px solid rgba(232,184,75,.5);cursor:pointer;background:var(--oro-suave,rgba(232,184,75,.12));color:var(--oro,#e8c46a);font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:13.5px}
  .slip-dl svg{width:18px;height:18px}
  .slip-dl:hover{background:rgba(232,184,75,.18)}
  .slip-dl:disabled{opacity:.45;cursor:default}
  .slip-wa{flex:none;width:52px;display:flex;align-items:center;justify-content:center;padding:13px;border-radius:12px;border:0;cursor:pointer;
    background:linear-gradient(150deg,#25d366,#11924c);box-shadow:0 4px 14px rgba(18,140,75,.34)}
  .slip-wa svg{width:21px;height:21px}
  .slip-wa:disabled{opacity:.45;cursor:default;box-shadow:none}
  /* ---- Popup explicativo ---- */
  .pe-head{display:flex;align-items:center;gap:13px;padding:20px 20px 14px;border-bottom:1px solid var(--linea,rgba(255,255,255,.1));position:relative}
  .pe-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--azul,#1d9bf0),var(--oro,#e8c46a),var(--rojo,#e23b3f))}
  .pe-badge{flex:none;width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--oro,#e8c46a),#f6e2a6);color:#241a06;box-shadow:0 6px 16px rgba(232,184,75,.34)}
  .pe-badge svg{width:23px;height:23px}
  .pe-head h3{margin:3px 0 0;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:20px;color:var(--tinta,#eef2f7)}
  .pe-head .slip-x{margin-left:auto}
  .pe-body{padding:16px 20px 4px}
  .pe-body>p{margin:0 0 12px;font-size:14px;line-height:1.55;color:var(--tinta,#eef2f7)}
  .pe-body>p b,.pe-list b{color:var(--oro,#e8c46a)}
  .pe-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
  .pe-list li{position:relative;padding-left:26px;font-size:13px;line-height:1.5;color:var(--tinta-2,#9aa6b2)}
  .pe-list li::before{content:"";position:absolute;left:4px;top:7px;width:8px;height:8px;border-radius:50%;background:var(--oro,#e8c46a)}
  .pe-dis{margin:14px 0 2px;padding:11px 13px;border-radius:12px;background:var(--fondo-2,#0e131c);border:1px solid var(--linea,rgba(255,255,255,.1));font-size:11.5px;line-height:1.5;color:var(--tinta-3,#6b7686)}
  .pe-acts{display:flex;gap:10px;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0))}
  .pe-acts .slip-clear{flex:1}
  .pe-go{flex:2;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:0;cursor:pointer;background:linear-gradient(135deg,var(--oro,#e8c46a),#f6e2a6);color:#241a06;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:14px}
  .pe-go svg{width:18px;height:18px}.pe-go:hover{filter:brightness(1.04)}
  `;
  document.head.appendChild(st);
}

/* Arranque: inyecta el estilo y muestra el FAB si ya habia un slip guardado. */
export function initPickem() { try { inyectar(); actualizarFAB(); } catch (_) {} }
