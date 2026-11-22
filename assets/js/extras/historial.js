/* ============================================================
   historial.js (EXTRA, 100% modular) — HISTORIAL / TRACK RECORD
   publico de cada analista: cuantas senales ha acertado y fallado,
   con sus ultimos picks ya resueltos. Datos REALES del marcador
   publico (marcador.js), llenado por la resolucion de predicciones.
   Sin placeholder: si un analista no ha resuelto picks, se dice honesto.

   No toca el render existente: se auto-inyecta su CSS y se engancha al
   DOM por observacion (MutationObserver). Dos accesos:

   1) Ventana del boton "Signals" (directorio .sd-modal): se agrega un
      boton "History". Al activarlo entra el MODO HISTORIAL: los botones
      Follow pasan a "History" (naranja 3D), el cursor es una manito en
      toda la fila del analista, y un clic en cualquier parte del
      analista abre su historial. Sale con el mismo boton o con la X.

   2) Analytics Signals (barra .sn-fs): boton "History" que abre esa
      misma ventana con el modo historial ya activado (no recrea nada).
   ============================================================ */
import { idiomaActual } from '../ui/idioma.js';
import { leerMarcador, precargarMarcadores } from '../datos/marcador.js';

let _pendingHist = false;   // activar modo historial al abrir el directorio

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ES = () => idiomaActual() === 'es';
const L = (en, es) => ES() ? es : en;

const I_HIST = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l3 2"/></svg>`;
const I_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>`;
const I_PER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.4 2.9-5.3 6.5-5.3s6.5 1.9 6.5 5.3"/></svg>`;
const I_CHART = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="13" y="8" width="3" height="10"/></svg>`;

const DEP = () => ({ futbol: L('Soccer', 'Fútbol'), beisbol: L('Baseball', 'Béisbol'), basket: L('Basketball', 'Básquet'), hockey: L('Ice hockey', 'Hockey'), americano: L('Am. football', 'F. americano') });
const _depName = (d) => (DEP()[d] || d || '');
function _fecha(cuando) {
  if (!cuando) return '';
  try { const dt = new Date(cuando); if (isNaN(dt.getTime())) return ''; return dt.toLocaleDateString(ES() ? 'es' : 'en', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return ''; }
}

/* ---------------- CSS auto-inyectado ---------------- */
function _css() {
  if (document.getElementById('hist-css')) return;
  const st = document.createElement('style');
  st.id = 'hist-css';
  st.textContent = `
  .hist-tgl,.hist-fs-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:42px;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e7edf5;font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12.5px;letter-spacing:.02em;cursor:pointer;transition:border-color .15s,background .15s;white-space:nowrap}
  .hist-tgl:hover,.hist-fs-btn:hover{border-color:rgba(240,169,58,.55)}
  .hist-tgl svg,.hist-fs-btn svg{width:15px;height:15px;flex:none}
  .hist-tgl.on{background:linear-gradient(180deg,#f0a93a,#c9781a);border-color:#ffcf7a;color:#241503;box-shadow:0 7px 16px -5px rgba(201,120,26,.6),inset 0 1px 0 rgba(255,255,255,.45)}

  .sd-modal .sd-tools{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px}
  .sd-modal .sd-search{width:auto;flex:1 1 220px;max-width:300px;min-width:150px}
  .sd-modal.sd-hist .sd-card{cursor:pointer}
  .sd-modal.sd-hist .sd-card *{cursor:pointer}
  .sd-modal.sd-hist .sd-card:hover{outline:1.5px solid rgba(240,169,58,.6);outline-offset:-1px;border-radius:16px}
  /* Mismo boton Follow (mismo tamano): solo se recolorea y se le pone "History"
     con el texto un poco mas pequeno para que quepa sin desfasarse. No se cambia
     ni ancho, ni alto, ni padding: queda identico al Follow por defecto. */
  .sd-modal.sd-hist .sd-follow{position:relative;pointer-events:none;color:transparent !important;background:linear-gradient(180deg,#f0a93a,#c9781a) !important;border-color:#ffcf7a !important;box-shadow:0 5px 13px -5px rgba(201,120,26,.5),inset 0 1px 0 rgba(255,255,255,.4);animation:histPulse 1.5s ease-in-out infinite}
  .sd-modal.sd-hist .sd-follow::after{content:'History';position:absolute;inset:0;display:grid;place-items:center;white-space:nowrap;font-family:"Chakra Petch",sans-serif;font-size:10px;font-weight:800;letter-spacing:.01em;color:#241503}
  @keyframes histPulse{0%,100%{transform:scale(1);box-shadow:0 5px 13px -5px rgba(201,120,26,.5),inset 0 1px 0 rgba(255,255,255,.4)}50%{transform:scale(1.045);box-shadow:0 9px 22px -4px rgba(240,169,58,.8),inset 0 1px 0 rgba(255,255,255,.55)}}
  @media(prefers-reduced-motion:reduce){.sd-modal.sd-hist .sd-follow{animation:none}}

  .sn-fs .sn-fs-search{min-width:150px}
  .hist-fs-btn{height:40px;padding:0 14px;font-size:12px}

  .hist-toast{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:360;max-width:calc(100% - 32px);display:flex;align-items:center;gap:9px;padding:13px 18px;border-radius:13px;background:linear-gradient(180deg,rgba(20,27,40,.98),rgba(13,18,28,.99));border:1px solid rgba(240,169,58,.42);box-shadow:0 20px 50px -16px rgba(0,0,0,.8);color:#eef3f9;font-size:13.5px;font-weight:600;animation:histToast .25s ease}
  .hist-toast svg{width:18px;height:18px;color:#f0a93a;flex:none}
  .hist-toast.out{opacity:0;transition:opacity .3s}
  @keyframes histToast{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}

  .hist-modal{max-width:560px !important}
  .hist-hd{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-right:38px}
  .hist-ava{width:58px;height:58px;border-radius:15px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;flex:none}
  .hist-ava img{width:100%;height:100%;object-fit:cover}
  .hist-ava svg{width:26px;height:26px;color:#8a95a3}
  .hist-hd-tx{min-width:0}
  .hist-name{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:19px;color:#fff;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hist-sport{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--acc,#e8b84b);margin-top:3px}
  .hist-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px}
  .hist-tile{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .hist-tile b{font-family:"Chakra Petch",sans-serif;font-size:22px;line-height:1;color:#fff}
  .hist-tile em{font-style:normal;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#8a95a3}
  .hist-tile.ok b{color:#34d399}.hist-tile.no b{color:#f87171}.hist-tile.eq b{color:#9aa6b2}.hist-tile.net b{color:#f0c040}
  .hist-acc{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);margin-bottom:16px;font-size:13px;color:#cbd4de}
  .hist-acc b{font-family:"Chakra Petch",sans-serif;color:#fff;font-size:15px}
  .hist-sec{font-family:"Chakra Petch",sans-serif;font-weight:800;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a95a3;margin:0 0 10px}
  .hist-list{display:flex;flex-direction:column;gap:7px}
  .hist-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07)}
  .hist-badge{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:15px;font-weight:800;flex:none;line-height:1}
  .hist-badge.ok{background:rgba(52,211,153,.16);color:#34d399;border:1px solid rgba(52,211,153,.35)}
  .hist-badge.no{background:rgba(248,113,113,.16);color:#f87171;border:1px solid rgba(248,113,113,.35)}
  .hist-badge.eq{background:rgba(154,166,178,.16);color:#9aa6b2;border:1px solid rgba(154,166,178,.3)}
  .hist-row-tx{min-width:0;flex:1}
  .hist-row-tx b{display:block;font-size:13.5px;color:#eef3f9;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hist-row-tx span{font-size:11px;color:#8a95a3}
  .hist-row-dt{font-size:11px;font-weight:700;flex:none;white-space:nowrap}
  .hist-row-dt.ok{color:#34d399}.hist-row-dt.no{color:#f87171}.hist-row-dt.eq{color:#9aa6b2}
  .hist-empty{text-align:center;padding:26px 16px;color:#9aa6b2}
  .hist-empty svg{width:34px;height:34px;color:#5a6472;margin-bottom:10px}
  .hist-empty b{display:block;font-family:"Chakra Petch",sans-serif;font-size:15px;color:#cbd4de;margin-bottom:6px}
  .hist-empty p{font-size:12.5px;line-height:1.55;margin:0 auto;max-width:360px}
  .hist-load{text-align:center;padding:34px 16px;color:#8a95a3;font-size:13px}
  .hist-load .sn-spin{margin:0 auto 12px}
  @media(max-width:560px){.hist-stats{grid-template-columns:repeat(2,1fr)}.hist-modal{max-width:100% !important}}
  `;
  document.head.appendChild(st);
}

/* ---------------- Modo historial en el directorio ---------------- */
function _setHist(modal, btn, on) {
  if (!modal) return;
  modal.classList.toggle('sd-hist', on);
  if (btn) {
    btn.classList.toggle('on', on);
    const l = btn.querySelector('.hist-tgl-lbl');
    if (l) l.textContent = on ? 'Exit' : 'History';   // etiqueta siempre en ingles
  }
  if (on) _mostrarPrompt();
}

function _mostrarPrompt() {
  const t = document.createElement('div');
  t.className = 'hist-toast';
  t.innerHTML = `${I_INFO}<span>${L('Please select an analyst to see their history.', 'Toca a un analista para ver su historial.')}</span>`;
  document.body.appendChild(t);
  const kill = () => { t.classList.add('out'); setTimeout(() => { try { t.remove(); } catch (_) {} }, 320); };
  t.addEventListener('click', kill);
  setTimeout(kill, 2800);
}

function _mejorarDirectorio(modal) {
  if (!modal || modal.dataset.histReady) return;
  modal.dataset.histReady = '1';
  const tools = modal.querySelector('.sd-tools');
  if (tools && !tools.querySelector('.hist-tgl')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hist-tgl';
    b.innerHTML = `${I_HIST}<span class="hist-tgl-lbl">History</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); _setHist(modal, b, !modal.classList.contains('sd-hist')); });
    tools.appendChild(b);
    modal._histBtn = b;
  }
  // Clic en una fila de analista (en modo historial) abre su historial.
  modal.addEventListener('click', (e) => {
    if (!modal.classList.contains('sd-hist')) return;
    if (e.target.closest('.hist-tgl') || e.target.closest('.sd-tools') || e.target.closest('.sd-x')) return;
    const card = e.target.closest('.sd-card');
    if (!card) return;
    e.preventDefault(); e.stopPropagation();
    _abrirHistDesdeCard(card);
  }, true);
  // Si venimos de Analytics Signals, entrar directo en modo historial.
  if (_pendingHist) { _pendingHist = false; _setHist(modal, modal._histBtn, true); }
}

/* ---------------- Boton en Analytics Signals ---------------- */
function _mejorarAnalytics(fs) {
  if (!fs || fs.dataset.histReady) return;
  fs.dataset.histReady = '1';
  if (fs.querySelector('.hist-fs-btn')) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hist-fs-btn';
  b.innerHTML = `${I_HIST}<span>History</span>`;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    _pendingHist = true;
    const sb = document.getElementById('signals-btn');
    if (sb) sb.click(); else _pendingHist = false;
  });
  fs.appendChild(b);
}

/* ---------------- Ventana del historial de un analista ---------------- */
function _abrirHistDesdeCard(card) {
  const fb = card.querySelector('[data-sdfollow]');
  const uid = (fb && fb.dataset.sdfollow) || card.dataset.uid || '';
  if (!uid) return;
  _abrirHistorial({
    uid,
    firma: (card.querySelector('.sd-nom')?.textContent || '').trim(),
    sport: (card.querySelector('.sd-sport')?.textContent || '').trim(),
    foto: card.querySelector('.sd-ava img')?.getAttribute('src') || null,
    color: (card.style.getPropertyValue('--acc') || '').trim() || '#e8b84b',
    prest: (card.querySelector('.sd-prest')?.textContent || '').trim(),
  });
}

function _vacioHTML() {
  return `<div class="hist-empty">${I_CHART}
    <b>${L('No resolved signals yet', 'Aún sin señales resueltas')}</b>
    <p>${L("This analyst's record builds here as their signals settle. Each correct call adds a point to their prestige; each miss subtracts one.", 'El historial se construye aquí a medida que sus señales se resuelven. Cada acierto suma un punto de prestigio; cada fallo resta uno.')}</p>
  </div>`;
}

function _rowHTML(it) {
  const r = it && it.resultado;
  const cls = r === 'acierto' ? 'ok' : (r === 'fallo' ? 'no' : 'eq');
  const glyph = r === 'acierto' ? '✓' : (r === 'fallo' ? '✕' : '—');
  const lbl = r === 'acierto' ? L('Hit', 'Acierto') : (r === 'fallo' ? L('Miss', 'Fallo') : L('Push', 'Empate'));
  const dep = _depName(it.deporte);
  const dt = _fecha(it.cuando);
  const sub = [dep, dt].filter(Boolean).join(' · ');
  return `<div class="hist-row">
    <div class="hist-badge ${cls}" title="${lbl}">${glyph}</div>
    <div class="hist-row-tx"><b>${esc(it.favorito || L('Pick', 'Pick'))}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>
    <div class="hist-row-dt ${cls}">${lbl}</div>
  </div>`;
}

function _render(m) {
  const A = m ? (Number(m.aciertos) || 0) : 0;
  const F = m ? (Number(m.fallos) || 0) : 0;
  const E = m ? (Number(m.empates) || 0) : 0;
  const tot = A + F + E;
  if (!m || tot === 0) return _vacioHTML();
  const neto = (m.neto != null) ? Number(m.neto) : (A - F - E);
  const dec = A + F;
  const acc = dec ? Math.round((A / dec) * 100) : 0;
  const tiles = `<div class="hist-stats">
    <div class="hist-tile ok"><b>${A}</b><em>${L('Hits', 'Aciertos')}</em></div>
    <div class="hist-tile no"><b>${F}</b><em>${L('Misses', 'Fallos')}</em></div>
    <div class="hist-tile eq"><b>${E}</b><em>${L('Pushes', 'Empates')}</em></div>
    <div class="hist-tile net"><b>${neto > 0 ? '+' : ''}${neto}</b><em>${L('Net', 'Neto')}</em></div>
  </div>`;
  const accLine = dec ? `<div class="hist-acc"><span>${L('Accuracy on decided signals', 'Acierto en señales decididas')}</span><b>${acc}% <em style="font-style:normal;color:#8a95a3;font-size:12px;font-weight:600">(${A}/${dec})</em></b></div>` : '';
  const items = (Array.isArray(m.ultimos) ? m.ultimos : []).slice(0, 20).map(_rowHTML).join('');
  const list = items ? `<div class="hist-sec">${L('Recent resolved signals', 'Señales resueltas recientes')}</div><div class="hist-list">${items}</div>` : '';
  return tiles + accLine + list;
}

function _abrirHistorial(meta) {
  const ov = document.createElement('div');
  ov.className = 'sd-ov';
  ov.innerHTML = `<div class="sd-modal hist-modal" style="--acc:${esc(meta.color || '#e8b84b')}">
    <button class="sd-x" type="button" aria-label="${L('Close', 'Cerrar')}">✕</button>
    <div class="hist-hd">
      <div class="hist-ava">${meta.foto ? `<img src="${esc(meta.foto)}" alt="">` : I_PER}</div>
      <div class="hist-hd-tx">
        <div class="hist-name">${esc(meta.firma || L('Analyst', 'Analista'))}</div>
        <div class="hist-sport">${esc(meta.sport || '')}${meta.prest ? `<span style="color:#8a95a3"> · ${L('Prestige', 'Prestigio')} ${esc(meta.prest)}</span>` : ''}</div>
      </div>
    </div>
    <div id="hist-body"><div class="hist-load"><div class="sn-spin"></div>${L('Loading record…', 'Cargando historial…')}</div></div>
  </div>`;
  document.body.appendChild(ov);
  const cerrar = () => { try { ov.remove(); } catch (_) {} };
  ov.querySelector('.sd-x').onclick = cerrar;
  ov.addEventListener('click', (e) => { if (e.target === ov) cerrar(); });

  leerMarcador(meta.uid).then((m) => {
    const body = ov.querySelector('#hist-body');
    if (body) body.innerHTML = _render(m);
  }).catch(() => {
    const body = ov.querySelector('#hist-body');
    if (body) body.innerHTML = _vacioHTML();
  });
}

/* ---------------- Observacion del DOM (engancha sin tocar el render) ---------------- */
function _scan(root) {
  if (!root || root.nodeType !== 1) return;
  const mods = root.matches && root.matches('.sd-modal') ? [root] : Array.from((root.querySelectorAll && root.querySelectorAll('.sd-modal')) || []);
  mods.forEach((m) => { if (!m.classList.contains('hist-modal') && m.querySelector('.sd-tools')) _mejorarDirectorio(m); });
  const fss = root.matches && root.matches('.sn-fs') ? [root] : Array.from((root.querySelectorAll && root.querySelectorAll('.sn-fs')) || []);
  fss.forEach((f) => _mejorarAnalytics(f));
}

export function initHistorial() {
  _css();
  try { precargarMarcadores(); } catch (_) {}
  try {
    const obs = new MutationObserver((muts) => {
      muts.forEach((mu) => { if (mu.addedNodes) mu.addedNodes.forEach(_scan); });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
  _scan(document.body);
}
