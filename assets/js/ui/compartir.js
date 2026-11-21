/* ============================================================
   COMPARTIR — imagen premium de marca (1254x1254) para WhatsApp/redes.
   Tres formatos, todos con la marca y el enlace sportsexpectations.com:
     - compartirPartido(p)  -> comparacion de equipos (local vs visita + stats)
     - compartirJugador(p,cfg) -> prop de jugador (linea + probabilidad + ult. 10)
     - compartirGoles(p)    -> mercado de goles (1+ gol y 2+ goles)
   En movil usa la hoja nativa con el ARCHIVO (WhatsApp/TikTok/IG). En escritorio
   descarga la imagen y abre WhatsApp con el enlace.
   ============================================================ */
import { t, Lg, idiomaActual } from './idioma.js';

const ORO = '#E8B84B', ORO2 = '#c79426', AZUL = '#1d9bf0', ROJO = '#e23b3f', GRIS = '#9aa6b2', VERDE = '#2fbf71';
const TPL = 'assets/imagenes/compartir.jpg';
const VS = 'assets/imagenes/vs.png';
const SITIO = 'sportsexpectations.com';
const N = 1254;
const L = (en, es) => (idiomaActual() === 'es' ? es : en);

const EQ = { izq: 305, der: 949, logoY: 250, logoR: 80, nomY: 372 };
const VSC = { x: 627, y: 250, w: 240 };

function cargarImg(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
}
function fit(g, s, maxW, base, fam, w = 800) {
  let sz = base; g.font = `${w} ${sz}px ${fam}`;
  while (g.measureText(s).width > maxW && sz > 11) { sz--; g.font = `${w} ${sz}px ${fam}`; }
  return sz;
}
function C(g, s, x, y, font, color) {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
function plateado(g, s, x, y, sz) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${sz}px "Chakra Petch", sans-serif`;
  const grad = g.createLinearGradient(0, y - sz * 0.6, 0, y + sz * 0.6);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(.5, '#d6dde6'); grad.addColorStop(1, '#9aa6b3');
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
  g.fillStyle = grad; g.fillText(s, x, y);
  g.restore();
}
function logoCirc(g, im, cx, cy, r, ab) {
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath();
  const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e9edf2');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
  g.clip();
  if (im) g.drawImage(im, cx - r * 0.74, cy - r * 0.74, r * 1.48, r * 1.48);
  else C(g, ab, cx, cy, `800 ${Math.round(r * 0.6)}px "Chakra Petch", sans-serif`, '#20262e');
  g.restore();
}
function marca(g) { C(g, 'SPORTS EXPECTATIONS', 627, 74, '800 42px "Chakra Petch", sans-serif', ORO); }
function pie(g) {
  const y = 1194;
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(210, y - 34); g.lineTo(1044, y - 34); g.stroke();
  C(g, SITIO, 627, y, '800 30px "Chakra Petch", sans-serif', ORO);
}
function barra(g, pct, color, y, bx0 = 185, bx1 = 1069, bh = 26) {
  const w = bx1 - bx0;
  g.fillStyle = '#1a212c'; g.beginPath(); g.roundRect(bx0, y, w, bh, 13); g.fill();
  const wl = Math.max(0, Math.min(w, w * (pct || 0) / 100));
  const gl = g.createLinearGradient(bx0, 0, bx0 + wl, 0); gl.addColorStop(0, color[0]); gl.addColorStop(1, color[1]);
  g.fillStyle = gl; g.beginPath(); g.roundRect(bx0, y, wl, bh, 13); g.fill();
  g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(bx0, y, w, bh * 0.45, 13); g.fill();
}
function envolver(g, texto, maxW, font) {
  g.font = font;
  const palabras = String(texto || '').split(/\s+/); const lineas = []; let linea = '';
  palabras.forEach(p => { const prueba = linea ? linea + ' ' + p : p; if (g.measureText(prueba).width > maxW && linea) { lineas.push(linea); linea = p; } else linea = prueba; });
  if (linea) lineas.push(linea);
  return lineas.slice(0, 3);
}

/* ---- Mecanismo de compartir ----
   modo:
     'descargar' -> descarga el PNG al dispositivo.
     'whatsapp'  -> movil: hoja nativa con el ARCHIVO (el usuario elige WhatsApp y
                    manda la imagen); escritorio: descarga el PNG y abre WhatsApp
                    con el texto (WhatsApp Web no recibe archivos por URL).
     'elegir' (por defecto) -> popup de marca para que el usuario elija entre
                    WhatsApp o Descargar. Lo pide el usuario: desde escritorio la
                    hoja nativa sola es confusa, asi que damos las dos opciones. */
function _descargarBlob(blob, nombreArchivo) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (nombreArchivo || 'sports-expectations') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (_) {}
}
async function _whatsappBlob(blob, texto, nombreArchivo) {
  const file = new File([blob], (nombreArchivo || 'sports-expectations') + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: texto });   // movil: adjunta la imagen
      return;
    }
  } catch (_) { return; }   // el usuario cancelo la hoja nativa
  _descargarBlob(blob, nombreArchivo);
  try { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); } catch (_) {}
}
async function compartirImagen(canvas, texto, nombreArchivo, modo) {
  const blob = await new Promise(res => { try { canvas.toBlob(res, 'image/png'); } catch (_) { res(null); } });
  if (!blob) return;
  modo = modo || 'elegir';
  if (modo === 'descargar') return _descargarBlob(blob, nombreArchivo);
  if (modo === 'whatsapp') return _whatsappBlob(blob, texto, nombreArchivo);
  _hojaElegir(blob, texto, nombreArchivo);
}

/* ---- Popup de marca: elegir WhatsApp o Descargar (responsivo) ---- */
const _IC_WA = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.1 1.6 5.9L4 29l8.3-2.2c1.7.9 3.6 1.4 5.5 1.4h.2C24.6 28.2 30 22.8 30 16.2 30 9.6 24.6 3 16 3z"/><path d="M22 18.3c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.8.6-.1 1.9-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" fill="#0b1f14"/></svg>`;
const _IC_DL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 4 5-4M5 20h14"/></svg>`;
const _IC_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
function _inyCssHoja() {
  if (document.getElementById('share-sheet-css')) return;
  const st = document.createElement('style'); st.id = 'share-sheet-css';
  st.textContent = `
  .share-ov{position:fixed;inset:0;z-index:1400;background:rgba(4,7,12,.76);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}
  .share-ov.on{opacity:1}
  .share-modal{width:100%;max-width:440px;background:var(--tarjeta,#10151d);border:1px solid var(--linea,rgba(255,255,255,.1));border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.5);transform:translateY(24px);transition:transform .24s;overflow:hidden}
  .share-ov.on .share-modal{transform:none}
  @media(min-width:620px){.share-ov{align-items:center;padding:18px}.share-modal{border-radius:20px}}
  .share-head{display:flex;align-items:center;gap:12px;padding:17px 18px 13px;border-bottom:1px solid var(--linea,rgba(255,255,255,.1));position:relative}
  .share-head::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,var(--azul,#1d9bf0),var(--oro,#e8c46a),var(--rojo,#e23b3f))}
  .share-eyebrow{font-family:var(--mono,"Chakra Petch",sans-serif);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--oro,#e8c46a)}
  .share-head h3{margin:2px 0 0;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:19px;color:var(--tinta,#eef2f7)}
  .share-x{margin-left:auto;flex:none;width:34px;height:34px;border-radius:10px;border:1px solid var(--linea,rgba(255,255,255,.1));background:var(--fondo-2,#0e131c);color:var(--tinta-2,#9aa6b2);cursor:pointer;display:flex;align-items:center;justify-content:center}
  .share-x svg{width:16px;height:16px}.share-x:hover{color:var(--oro,#e8c46a);border-color:var(--oro,#e8c46a)}
  .share-prev{display:flex;justify-content:center;padding:16px 18px 4px}
  .share-prev img{width:148px;height:148px;object-fit:cover;border-radius:14px;border:1px solid var(--linea,rgba(255,255,255,.12));box-shadow:0 8px 22px rgba(0,0,0,.4)}
  .share-acts{display:flex;gap:10px;padding:14px 18px calc(18px + env(safe-area-inset-bottom,0))}
  .share-acts button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:13px;border:0;cursor:pointer;font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:14px}
  .share-acts button svg{width:20px;height:20px}
  .share-wa{background:linear-gradient(150deg,#25d366,#11924c);color:#fff;box-shadow:0 4px 14px rgba(18,140,75,.34)}
  .share-dl{background:var(--oro-suave,rgba(232,184,75,.12));color:var(--oro,#e8c46a);border:1px solid rgba(232,184,75,.5)!important}
  .share-acts button:hover{filter:brightness(1.05)}
  .share-acts button:active{transform:scale(.98)}
  `;
  document.head.appendChild(st);
}
function _hojaElegir(blob, texto, nombreArchivo) {
  _inyCssHoja();
  if (document.getElementById('share-ov')) return;
  let url = ''; try { url = URL.createObjectURL(blob); } catch (_) {}
  const ov = document.createElement('div'); ov.className = 'share-ov'; ov.id = 'share-ov';
  ov.innerHTML = `<div class="share-modal" role="dialog" aria-modal="true">
    <div class="share-head">
      <div><div class="share-eyebrow">Sports Expectations</div><h3>${L('Share this image', 'Compartir esta imagen')}</h3></div>
      <button class="share-x" id="share-x" aria-label="Close">${_IC_X}</button>
    </div>
    ${url ? `<div class="share-prev"><img src="${url}" alt=""></div>` : ''}
    <div class="share-acts">
      <button class="share-wa" id="share-wa">${_IC_WA}<span>WhatsApp</span></button>
      <button class="share-dl" id="share-dl">${_IC_DL}<span>${L('Download', 'Descargar')}</span></button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  const cerrar = () => { ov.classList.remove('on'); setTimeout(() => { try { if (url) URL.revokeObjectURL(url); } catch (_) {} ov.remove(); }, 200); };
  ov.onclick = (e) => { if (e.target === ov) cerrar(); };
  ov.querySelector('#share-x').addEventListener('click', cerrar);
  ov.querySelector('#share-wa').addEventListener('click', () => { _whatsappBlob(blob, texto, nombreArchivo); cerrar(); });
  ov.querySelector('#share-dl').addEventListener('click', () => { _descargarBlob(blob, nombreArchivo); cerrar(); });
}

function base(conLogos, dibujar) {
  // Reintenta sin logos si el canvas queda "manchado" (CORS) para poder exportar.
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const g = cv.getContext('2d');
  dibujar(g, conLogos);
  if (conLogos) { try { g.getImageData(0, 0, 1, 1); } catch (_) { return base(false, dibujar); } }
  return cv;
}

/* ===== 1) COMPARACION DE EQUIPOS (partido / invernales) ===== */
export async function compartirPartido(p) {
  const [tpl, vs, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(VS), cargarImg(p.local.logo), cargarImg(p.visita.logo)]);
  const m = p.mercado || {};
  const localFav = (m.local || 0) >= (m.visita || 0);
  const cv = base(true, (g, conLogos) => {
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle = '#0a0d11'; g.fillRect(0, 0, N, N); }
    marca(g);
    logoCirc(g, conLogos ? ll : null, EQ.izq, EQ.logoY, EQ.logoR, p.local.abrev);
    logoCirc(g, conLogos ? lv : null, EQ.der, EQ.logoY, EQ.logoR, p.visita.abrev);
    if (vs) { const h = VSC.w * (vs.height / vs.width); g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.drawImage(vs, VSC.x - VSC.w / 2, VSC.y - h / 2, VSC.w, h); g.restore(); }
    else C(g, 'VS', VSC.x, VSC.y, '800 70px "Chakra Petch", sans-serif', '#eef5fb');
    let sz = fit(g, p.local.nombre.toUpperCase(), 330, 40, '"Chakra Petch", sans-serif'); plateado(g, p.local.nombre.toUpperCase(), EQ.izq, EQ.nomY, sz);
    sz = fit(g, p.visita.nombre.toUpperCase(), 330, 40, '"Chakra Petch", sans-serif'); plateado(g, p.visita.nombre.toUpperCase(), EQ.der, EQ.nomY, sz);
    C(g, t('share.prob'), 627, 452, '800 20px "Inter", sans-serif', GRIS);
    C(g, (m.local || 0) + '%', EQ.izq, 518, `800 ${localFav ? 70 : 60}px "Chakra Petch", sans-serif`, AZUL);
    C(g, (m.visita || 0) + '%', EQ.der, 518, `800 ${!localFav ? 70 : 60}px "Chakra Petch", sans-serif`, ROJO);
    const bx0 = 185, bx1 = 1069, by = 562, bh = 24, w = bx1 - bx0;
    g.fillStyle = '#1a212c'; g.beginPath(); g.roundRect(bx0, by, w, bh, 12); g.fill();
    const wl = Math.max(0, Math.min(w, w * (m.local || 0) / 100));
    const gl = g.createLinearGradient(bx0, 0, bx0 + wl, 0); gl.addColorStop(0, '#1683d8'); gl.addColorStop(1, AZUL); g.fillStyle = gl; g.beginPath(); g.roundRect(bx0, by, wl, bh, 12); g.fill();
    const wv = Math.max(0, Math.min(w, w * (m.visita || 0) / 100));
    const gv = g.createLinearGradient(bx1 - wv, 0, bx1, 0); gv.addColorStop(0, ROJO); gv.addColorStop(1, '#c62f34'); g.fillStyle = gv; g.beginPath(); g.roundRect(bx1 - wv, by, wv, bh, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(bx0, by, w, bh * 0.45, 12); g.fill();
    let datos = (p.comparativa && p.comparativa.length)
      ? p.comparativa.slice(0, 11).map(c => ({ local: c.local, visita: c.visita, etiqueta: { en: c.en || c.k, es: c.es || c.k } }))
      : (p.datos || []).slice(0, 11);
    const y0 = 650, y1 = 1120, n = datos.length, dy = n > 1 ? (y1 - y0) / (n - 1) : 0;
    datos.forEach((dd, i) => {
      const y = Math.round(y0 + dy * i);
      if (i > 0) { g.strokeStyle = 'rgba(255,255,255,.11)'; g.lineWidth = 1; g.beginPath(); g.moveTo(210, Math.round(y - dy / 2)); g.lineTo(1044, Math.round(y - dy / 2)); g.stroke(); }
      let s = fit(g, String(Lg(dd.local)), 250, 28, '"Chakra Petch", sans-serif'); C(g, String(Lg(dd.local)), EQ.izq, y, `800 ${s}px "Chakra Petch", sans-serif`, AZUL);
      let ks = 18; g.font = `700 ${ks}px "Inter", sans-serif`; while (g.measureText(String(Lg(dd.etiqueta))).width > 330 && ks > 12) { ks--; g.font = `700 ${ks}px "Inter", sans-serif`; }
      C(g, String(Lg(dd.etiqueta)).toUpperCase(), 627, y, `700 ${ks}px "Inter", sans-serif`, GRIS);
      s = fit(g, String(Lg(dd.visita)), 250, 28, '"Chakra Petch", sans-serif'); C(g, String(Lg(dd.visita)), EQ.der, y, `800 ${s}px "Chakra Petch", sans-serif`, ROJO);
    });
    pie(g);
  });
  const texto = L(`${p.local.nombre} vs ${p.visita.nombre} · full breakdown on ${SITIO}`,
                  `${p.local.nombre} vs ${p.visita.nombre} · analisis completo en ${SITIO}`);
  await compartirImagen(cv, texto, `se-${p.local.abrev}-${p.visita.abrev}`, p.modo);
}

/* ===== 2) PROP DE JUGADOR (Hits / Points / Shots / Touchdown) ===== */
export async function compartirJugador(p, cfg = {}) {
  const [tpl, vs, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(VS), cargarImg(p.logoLocal), cargarImg(p.logoVisita)]);
  const linea = String((cfg.metricLabel || p.que || '')).replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
  const h = p.hist || null;
  const nom = (p.nombre || '').toUpperCase();
  const equipoA = p.equipoAbrev || '', equipoB = p.rivalAbrev || '';
  const nomA = (p.nomLocal || equipoA || '').toUpperCase(), nomB = (p.nomVisita || equipoB || '').toUpperCase();
  const cv = base(true, (g, conLogos) => {
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle = '#0a0d11'; g.fillRect(0, 0, N, N); }
    marca(g);
    // Matchup: logos GRANDES y SEPARADOS + VS grande (igual que la de Goals)
    logoCirc(g, conLogos ? ll : null, EQ.izq, 236, 78, equipoA);
    logoCirc(g, conLogos ? lv : null, EQ.der, 236, 78, equipoB);
    if (vs) { const w = 230, hh = w * (vs.height / vs.width); g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.drawImage(vs, 627 - w / 2, 236 - hh / 2, w, hh); g.restore(); }
    else C(g, 'VS', 627, 236, '800 66px "Chakra Petch", sans-serif', '#eef5fb');
    // Nombre de equipo bajo cada logo (secundario, nunca redundante con el escudo)
    let sa = fit(g, nomA, 300, 30, '"Chakra Petch", sans-serif'); C(g, nomA, EQ.izq, 346, `800 ${sa}px "Chakra Petch", sans-serif`, GRIS);
    let sb = fit(g, nomB, 300, 30, '"Chakra Petch", sans-serif'); C(g, nomB, EQ.der, 346, `800 ${sb}px "Chakra Petch", sans-serif`, GRIS);
    // Nombre del jugador: el protagonista
    let sz = fit(g, nom, 1060, 84, '"Chakra Petch", sans-serif'); plateado(g, nom, 627, 452, sz);
    // Linea (mercado)
    if (linea) C(g, linea.toUpperCase(), 627, 534, '800 34px "Chakra Petch", sans-serif', ORO);
    // Probabilidad grande + barra
    C(g, L('CHANCE TO HIT THE LINE', 'PROBABILIDAD DE LOGRARLO'), 627, 618, '800 20px "Inter", sans-serif', GRIS);
    const col = p.prob >= 66 ? VERDE : (p.prob >= 55 ? ORO : GRIS);
    C(g, (p.prob || 0) + '%', 627, 706, '800 112px "Chakra Petch", sans-serif', col);
    barra(g, p.prob || 0, [ORO2, ORO], 792);
    // Ultimos 10 (hit/fallo)
    if (h && h.muestra) {
      C(g, L(`${h.aciertos} OF HIS LAST ${h.muestra} GAMES OVER THE LINE`, `${h.aciertos} DE SUS ULTIMOS ${h.muestra} SOBRE LA LINEA`), 627, 892, '800 26px "Chakra Petch", sans-serif', '#dfe6ee');
      const n = Math.min(10, h.muestra), aciertos = Math.min(h.aciertos, n), sq = 70, gap = 15, totalW = n * sq + (n - 1) * gap, x0 = 627 - totalW / 2, yy = 948;
      for (let i = 0; i < n; i++) {
        const hit = i < aciertos; const x = x0 + i * (sq + gap);
        g.fillStyle = hit ? VERDE : '#2a333f'; g.beginPath(); g.roundRect(x, yy, sq, sq, 14); g.fill();
        g.fillStyle = hit ? '#0b2a19' : '#5a6672'; g.font = '800 30px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(hit ? '✓' : '·', x + sq / 2, yy + sq / 2 + 2);
      }
    }
    pie(g);
  });
  const texto = L(`${p.nombre}: ${p.prob}% to hit ${linea}${equipoB ? ` (${equipoA} vs ${equipoB})` : ''}. More on ${SITIO}`,
                  `${p.nombre}: ${p.prob}% de lograr ${linea}${equipoB ? ` (${equipoA} vs ${equipoB})` : ''}. Mas en ${SITIO}`);
  await compartirImagen(cv, texto, `se-${(p.nombre || 'pick').replace(/\s+/g, '-')}`, (cfg && cfg.modo) || p.modo);
}

/* ===== 3) MERCADO DE GOLES (Goals) ===== */
export async function compartirGoles(p) {
  const [tpl, vs, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(VS), cargarImg(p.logoLocal), cargarImg(p.logoVisita)]);
  const nomA = (p.localNom || p.equipoAbrev || '').toUpperCase(), nomB = (p.visitaNom || p.rivalAbrev || '').toUpperCase();
  const p05 = p.probOver05 != null ? p.probOver05 : null;
  const p15 = p.probOver15 != null ? p.probOver15 : p.prob;
  const cv = base(true, (g, conLogos) => {
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle = '#0a0d11'; g.fillRect(0, 0, N, N); }
    marca(g);
    logoCirc(g, conLogos ? ll : null, EQ.izq, EQ.logoY, EQ.logoR, p.equipoAbrev);
    logoCirc(g, conLogos ? lv : null, EQ.der, EQ.logoY, EQ.logoR, p.rivalAbrev);
    if (vs) { const h = VSC.w * (vs.height / vs.width); g.drawImage(vs, VSC.x - VSC.w / 2, VSC.y - h / 2, VSC.w, h); } else C(g, 'VS', VSC.x, VSC.y, '800 70px "Chakra Petch", sans-serif', '#eef5fb');
    let sz = fit(g, nomA, 330, 40, '"Chakra Petch", sans-serif'); plateado(g, nomA, EQ.izq, EQ.nomY, sz);
    sz = fit(g, nomB, 330, 40, '"Chakra Petch", sans-serif'); plateado(g, nomB, EQ.der, EQ.nomY, sz);
    // Dos barras de mercado de goles
    C(g, L('AT LEAST 1 GOAL', 'AL MENOS 1 GOL'), 240, 520, '800 24px "Chakra Petch", sans-serif', '#dfe6ee'); g.textAlign = 'left';
    C(g, (p05 == null ? '—' : p05 + '%'), 1014, 520, '800 34px "Chakra Petch", sans-serif', VERDE);
    barra(g, p05 || 0, ['#1f9d63', VERDE], 556);
    C(g, L('2+ GOALS', '2+ GOLES'), 240, 678, '800 24px "Chakra Petch", sans-serif', '#dfe6ee');
    C(g, (p15 == null ? '—' : p15 + '%'), 1014, 678, '800 34px "Chakra Petch", sans-serif', ORO);
    barra(g, p15 || 0, [ORO2, ORO], 714);
    // Veredicto
    const vd = String(p.veredictoTxt || '').trim();
    if (vd) { const lineas = envolver(g, vd, 900, '600 28px "Inter", sans-serif'); lineas.forEach((ln, i) => C(g, ln, 627, 850 + i * 44, '600 28px "Inter", sans-serif', '#c7d2de')); }
    pie(g);
  });
  const texto = L(`${p.localNom || p.equipoAbrev} vs ${p.visitaNom || p.rivalAbrev}: ${p15}% for 2+ goals. More on ${SITIO}`,
                  `${p.localNom || p.equipoAbrev} vs ${p.visitaNom || p.rivalAbrev}: ${p15}% de 2+ goles. Mas en ${SITIO}`);
  await compartirImagen(cv, texto, `se-goles-${p.equipoAbrev}-${p.rivalAbrev}`, p.modo);
}

/* ===== 4) COMBINADA (pick'em): la jugada armada por el usuario ===== */
export async function compartirSlip(picks, extra = {}) {
  const tpl = await cargarImg(TPL);
  const n = picks.length;
  const pc = extra.pc != null ? extra.pc : Math.round(picks.reduce((a, x) => a * ((x.prob || 0) / 100), 1) * 100);
  const weakest = extra.weakest != null ? extra.weakest : (picks.length ? Math.min(...picks.map(x => x.prob || 0)) : 0);
  const cv = base(false, (g) => {
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle = '#0a0d11'; g.fillRect(0, 0, N, N); }
    marca(g);
    C(g, L('MY PICK’EM', 'MI COMBINADA'), 627, 152, '800 42px "Chakra Petch", sans-serif', ORO);
    C(g, `${n} ${L('picks · all must hit', 'picks · deben cumplirse todas')}`, 627, 198, '700 20px "Inter", sans-serif', GRIS);
    const y0 = 266, y1 = Math.min(266 + n * 98, 876), rh = n ? (y1 - y0) / n : 0;
    picks.forEach((x, i) => {
      const y = y0 + rh * i + rh / 2;
      if (i > 0) { g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; g.beginPath(); g.moveTo(170, y0 + rh * i); g.lineTo(1084, y0 + rh * i); g.stroke(); }
      g.fillStyle = 'rgba(232,184,75,.16)'; g.beginPath(); g.roundRect(176, y - 26, 52, 52, 13); g.fill();
      C(g, String(i + 1), 202, y, '800 26px "Chakra Petch", sans-serif', ORO);
      const nombre = String(x.esPartido ? `${x.nomLocal} vs ${x.nomVisita}` : x.nombre).toUpperCase();
      g.textAlign = 'left'; g.textBaseline = 'middle';
      let ns = 30; g.font = `800 ${ns}px "Chakra Petch", sans-serif`; while (g.measureText(nombre).width > 600 && ns > 15) { ns--; g.font = `800 ${ns}px "Chakra Petch", sans-serif`; }
      g.fillStyle = '#eef2f7'; g.fillText(nombre, 258, y - 13);
      g.font = '600 20px "Inter", sans-serif'; g.fillStyle = GRIS; g.fillText(String(x.linea || '').toUpperCase(), 258, y + 16);
      const col = x.prob >= 66 ? VERDE : (x.prob >= 55 ? ORO : GRIS);
      C(g, (x.prob || 0) + '%', 1024, y, '800 34px "Chakra Petch", sans-serif', col);
    });
    const sy = 968;
    g.fillStyle = 'rgba(255,255,255,.045)'; g.beginPath(); g.roundRect(185, sy - 62, 418, 124, 18); g.fill();
    C(g, L('COMBINED CHANCE', 'PROB. COMBINADA'), 394, sy - 28, '700 18px "Inter", sans-serif', GRIS);
    C(g, pc + '%', 394, sy + 20, '800 66px "Chakra Petch", sans-serif', '#eef2f7');
    g.fillStyle = 'rgba(232,184,75,.09)'; g.beginPath(); g.roundRect(651, sy - 62, 418, 124, 18); g.fill();
    C(g, L('WEAKEST LEG', 'PICK MAS DEBIL'), 860, sy - 28, '700 18px "Inter", sans-serif', GRIS);
    C(g, weakest + '%', 860, sy + 20, '800 66px "Chakra Petch", sans-serif', ORO);
    pie(g);
  });
  const texto = L(`My pick’em: ${n} picks, ${pc}% combined. Build yours on ${SITIO}`,
                  `Mi combinada: ${n} picks, ${pc}% combinada. Arma la tuya en ${SITIO}`);
  await compartirImagen(cv, texto, 'se-pickem', extra.modo);
}
