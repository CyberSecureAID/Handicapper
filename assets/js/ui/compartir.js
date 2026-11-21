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

/* ---- Mecanismo de compartir: hoja nativa con el archivo, o descarga + WhatsApp ---- */
async function compartirImagen(canvas, texto, nombreArchivo) {
  const blob = await new Promise(res => { try { canvas.toBlob(res, 'image/png'); } catch (_) { res(null); } });
  if (!blob) return;
  const file = new File([blob], (nombreArchivo || 'sports-expectations') + '.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: texto });
      return;
    }
  } catch (_) { return; }   // el usuario cancelo la hoja nativa
  // Escritorio: descarga la imagen y abre WhatsApp con el enlace
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (_) {}
  try { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); } catch (_) {}
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
  const texto = L(`${p.local.nombre} vs ${p.visita.nombre} — full breakdown on ${SITIO}`,
                  `${p.local.nombre} vs ${p.visita.nombre} — analisis completo en ${SITIO}`);
  await compartirImagen(cv, texto, `se-${p.local.abrev}-${p.visita.abrev}`);
}

/* ===== 2) PROP DE JUGADOR (Hits / Points / Shots / Touchdown) ===== */
export async function compartirJugador(p, cfg = {}) {
  const [tpl, vs, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(VS), cargarImg(p.logoLocal), cargarImg(p.logoVisita)]);
  const linea = String((cfg.metricLabel || p.que || '')).replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
  const h = p.hist || null;
  const nom = (p.nombre || '').toUpperCase();
  const equipoA = p.equipoAbrev || '', equipoB = p.rivalAbrev || '';
  const cv = base(true, (g, conLogos) => {
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle = '#0a0d11'; g.fillRect(0, 0, N, N); }
    marca(g);
    // Matchup compacto arriba
    logoCirc(g, conLogos ? ll : null, 520, 205, 54, equipoA);
    logoCirc(g, conLogos ? lv : null, 734, 205, 54, equipoB);
    if (vs) { const w = 120, hh = w * (vs.height / vs.width); g.drawImage(vs, 627 - w / 2, 205 - hh / 2, w, hh); }
    C(g, `${equipoA}  vs  ${equipoB}`, 627, 300, '800 26px "Chakra Petch", sans-serif', GRIS);
    // Nombre del jugador grande
    let sz = fit(g, nom, 1040, 86, '"Chakra Petch", sans-serif'); plateado(g, nom, 627, 404, sz);
    // Linea
    if (linea) C(g, linea.toUpperCase(), 627, 486, '800 32px "Chakra Petch", sans-serif', ORO);
    // Probabilidad grande + barra
    C(g, L('CHANCE TO HIT', 'PROBABILIDAD'), 627, 572, '800 20px "Inter", sans-serif', GRIS);
    const col = p.prob >= 66 ? VERDE : (p.prob >= 55 ? ORO : GRIS);
    C(g, (p.prob || 0) + '%', 627, 648, '800 108px "Chakra Petch", sans-serif', col);
    barra(g, p.prob || 0, [ORO2, ORO], 730);
    // Ultimos 10
    if (h && h.muestra) {
      C(g, L(`${h.aciertos} OF HIS LAST ${h.muestra} GAMES OVER THE LINE`, `${h.aciertos} DE SUS ULTIMOS ${h.muestra} SOBRE LA LINEA`), 627, 838, '800 26px "Chakra Petch", sans-serif', '#dfe6ee');
      const n = Math.min(10, h.muestra), aciertos = Math.min(h.aciertos, n), sq = 74, gap = 16, totalW = n * sq + (n - 1) * gap, x0 = 627 - totalW / 2, yy = 900;
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
  await compartirImagen(cv, texto, `se-${(p.nombre || 'pick').replace(/\s+/g, '-')}`);
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
  await compartirImagen(cv, texto, `se-goles-${p.equipoAbrev}-${p.rivalAbrev}`);
}
