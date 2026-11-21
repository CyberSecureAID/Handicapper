/* =====================================================================
   PICK'EM — el constructor de combinaciones.
   El usuario arma su jugada con nuestros picks (2 a 6), ve la probabilidad
   combinada (deben cumplirse todas) y el multiplicador tipico de un pick'em,
   y comparte el slip como imagen de marca. NO somos casa de apuestas: es una
   herramienta de analisis; el usuario apuesta donde quiera.
   Identidad de la pagina: navy, dorado, Chakra Petch.
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

function avisoMax() {
  const t = document.createElement('div'); t.className = 'slip-toast';
  t.textContent = L('Max 6 picks in a pick’em.', 'Maximo 6 picks en una combinada.');
  document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 300); }, 2200);
}

function probComb(arr) { return arr.reduce((a, x) => a * ((x.prob || 0) / 100), 1); }
function multDe(n) { return MULT[n] || (n < 2 ? 0 : MULT[6]); }

/* ---------- Boton flotante (FAB) con el contador ---------- */
export function actualizarFAB() {
  const n = _load().length;
  let fab = document.getElementById('slip-fab');
  if (!n) { if (fab) fab.remove(); return; }
  if (!fab) {
    fab = document.createElement('button'); fab.id = 'slip-fab'; fab.className = 'slip-fab';
    fab.innerHTML = `<span class="slip-fab-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v4H4zM4 10h16v10H4z"/><path d="M8 14h8M8 17h5"/></svg></span><span class="slip-fab-tx">${L('My pick’em', 'Mi combinada')}</span><b class="slip-fab-n"></b>`;
    fab.addEventListener('click', abrirSlip);
    document.body.appendChild(fab);
    requestAnimationFrame(() => fab.classList.add('on'));
  }
  fab.querySelector('.slip-fab-n').textContent = n;
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

function cuerpo(arr) {
  const n = arr.length;
  const pc = Math.round(probComb(arr) * 100);
  const mult = multDe(n);
  const legs = arr.length ? arr.map(legHTML).join('') : `<div class="slip-empty">${L('Add picks with the + on any card to build your pick’em.', 'Agrega picks con el + de cualquier tarjeta para armar tu combinada.')}</div>`;
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
    <div class="slip-note">${L('Analysis only. We are not a sportsbook — place your bets where you choose.', 'Solo analisis. No somos casa de apuestas: apuesta donde tu elijas.')}</div>
    <div class="slip-acts">
      <button class="slip-clear" id="slip-clear" ${n ? '' : 'disabled'}>${L('Clear', 'Vaciar')}</button>
      <button class="slip-share" id="slip-share" ${n >= 2 ? '' : 'disabled'}>${WA} ${L('Share pick’em', 'Compartir combinada')}</button>
    </div>`;
}

function refrescar() {
  const m = document.querySelector('#slip-ov .slip-modal');
  if (!m) return;
  m.innerHTML = cuerpo(_load());
  wire(document.getElementById('slip-ov'));
  actualizarFAB();
}

function wire(ov) {
  ov.onclick = (e) => { if (e.target === ov) cerrarSlip(); };
  ov.querySelector('#slip-x')?.addEventListener('click', cerrarSlip);
  ov.querySelector('#slip-clear')?.addEventListener('click', () => { _save([]); refrescar(); });
  ov.querySelectorAll('.slip-leg-x[data-rm]').forEach(b => b.addEventListener('click', () => {
    const arr = _load().filter(x => x.key !== b.dataset.rm); _save(arr);
    // actualizar el + de las tarjetas si estan visibles
    document.querySelectorAll(`.ply-slip[data-slipkey="${CSS.escape(b.dataset.rm)}"]`).forEach(btn => btn.classList.remove('on'));
    refrescar();
  }));
  ov.querySelector('#slip-share')?.addEventListener('click', async () => {
    try { const mod = await import('./compartir.js'); mod.compartirSlip(_load(), { pc: Math.round(probComb(_load()) * 100), mult: multDe(_load().length) }); } catch (_) {}
  });
}

const X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const WA = `<svg viewBox="0 0 32 32" fill="currentColor" width="17" height="17"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.1 1.6 5.9L4 29l8.3-2.2c1.7.9 3.6 1.4 5.5 1.4h.2C24.6 28.2 30 22.8 30 16.2 30 9.6 24.6 3 16 3z"/><path d="M22 18.3c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.8.6-.1 1.9-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" fill="#0b1f14"/></svg>`;

function inyectar() {
  if (document.getElementById('pickem-css')) return;
  const st = document.createElement('style'); st.id = 'pickem-css';
  st.textContent = `
  .slip-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0));z-index:1150;display:flex;align-items:center;gap:9px;padding:12px 16px;border:0;border-radius:40px;cursor:pointer;
    background:linear-gradient(135deg,var(--oro),#f6e2a6);color:#241a06;font-family:var(--display);font-weight:800;font-size:13.5px;letter-spacing:.02em;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 24px rgba(232,184,75,.4);transform:translateY(20px) scale(.9);opacity:0;transition:transform .25s,opacity .25s}
  .slip-fab.on{transform:none;opacity:1}
  .slip-fab-ic svg{width:18px;height:18px;display:block}
  .slip-fab-n{min-width:21px;height:21px;padding:0 5px;border-radius:11px;background:#241a06;color:var(--oro);display:flex;align-items:center;justify-content:center;font-size:12px}
  @media(max-width:760px){.slip-fab{bottom:calc(76px + env(safe-area-inset-bottom,0))}.slip-fab-tx{display:none}.slip-fab{padding:13px;border-radius:50%}}
  .slip-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%) translateY(10px);z-index:1300;background:var(--tarjeta-alta);border:1px solid var(--linea);color:var(--tinta);padding:10px 16px;border-radius:12px;font-size:13px;opacity:0;transition:all .25s;box-shadow:var(--sombra)}
  .slip-toast.on{opacity:1;transform:translateX(-50%)}
  .slip-ov{position:fixed;inset:0;z-index:1200;background:rgba(4,7,12,.74);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;transition:opacity .2s}
  .slip-ov.on{opacity:1}
  .slip-modal{width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;background:var(--tarjeta);border:1px solid var(--linea);border-radius:20px 20px 0 0;overflow-y:auto;box-shadow:var(--sombra);transform:translateY(24px);transition:transform .24s}
  .slip-ov.on .slip-modal{transform:none}
  @media(min-width:620px){.slip-ov{align-items:center;padding:18px}.slip-modal{border-radius:20px}}
  .slip-head{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--linea);position:relative}
  .slip-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--azul),var(--oro),var(--rojo))}
  .slip-eyebrow{font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--oro)}
  .slip-head h3{margin:3px 0 0;font-family:var(--display);font-weight:800;font-size:21px;color:var(--tinta)}
  .slip-count{margin-left:auto;font-family:var(--display);font-weight:700;font-size:13px;color:var(--tinta-2);background:var(--fondo-2);border:1px solid var(--linea);padding:4px 10px;border-radius:9px}
  .slip-x{flex:none;width:34px;height:34px;border-radius:10px;border:1px solid var(--linea);background:var(--fondo-2);color:var(--tinta-2);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .slip-x svg{width:16px;height:16px}.slip-x:hover{color:var(--oro);border-color:var(--oro)}
  .slip-legs{padding:6px 20px}
  .slip-leg{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--linea-suave)}
  .slip-leg:last-child{border-bottom:0}
  .slip-leg-n{flex:none;width:26px;height:26px;border-radius:8px;background:var(--oro-suave);color:var(--oro);font-family:var(--display);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
  .slip-leg-tx{flex:1;min-width:0}
  .slip-leg-tx b{display:block;font-size:14.5px;color:var(--tinta);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .slip-leg-tx span{display:block;font-size:12px;color:var(--tinta-2);margin-top:1px}
  .slip-leg-p{flex:none;font-family:var(--display);font-weight:800;font-size:16px}
  .slip-leg-x{flex:none;width:26px;height:26px;border-radius:7px;border:0;background:rgba(255,255,255,.05);color:var(--tinta-3);cursor:pointer;font-size:16px;line-height:1}
  .slip-leg-x:hover{color:var(--rojo);background:var(--rojo-suave)}
  .slip-empty,.slip-hint{padding:26px 8px;text-align:center;color:var(--tinta-3);font-size:13px}
  .slip-hint{padding:14px 8px}
  .slip-sum{display:flex;gap:12px;padding:14px 20px 4px}
  .slip-sum-b{flex:1;background:var(--fondo-2);border:1px solid var(--linea);border-radius:14px;padding:13px;text-align:center}
  .slip-sum-b span{display:block;font-size:11px;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.05em}
  .slip-sum-b b{display:block;font-family:var(--display);font-weight:800;font-size:30px;color:var(--tinta);margin:3px 0 1px}
  .slip-sum-b b.oro{color:var(--oro)}
  .slip-sum-b small{font-size:10.5px;color:var(--tinta-3)}
  .slip-note{padding:12px 20px 0;font-size:11px;color:var(--tinta-3);text-align:center;line-height:1.5}
  .slip-acts{display:flex;gap:10px;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0))}
  .slip-clear{flex:none;padding:13px 18px;border-radius:12px;border:1px solid var(--linea);background:var(--fondo-2);color:var(--tinta-2);font-family:var(--display);font-weight:700;font-size:13px;cursor:pointer}
  .slip-clear:disabled{opacity:.4;cursor:default}
  .slip-share{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:0;cursor:pointer;
    background:linear-gradient(150deg,#25d366,#11924c);color:#fff;font-family:var(--display);font-weight:800;font-size:13.5px;letter-spacing:.02em;box-shadow:0 4px 14px rgba(18,140,75,.34)}
  .slip-share:disabled{opacity:.45;cursor:default;box-shadow:none}
  `;
  document.head.appendChild(st);
}

/* Arranque: muestra el FAB si ya habia un slip guardado. */
export function initPickem() { try { actualizarFAB(); } catch (_) {} }
