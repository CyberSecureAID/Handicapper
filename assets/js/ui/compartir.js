/* ============================================================
   COMPARTIR — genera una imagen PNG PREMIUM del partido, para
   promoción: fondo con textura, marco dorado, logos de los equipos,
   el VS metálico en el medio, probabilidades y veredicto del analista.
   Sin librerías: se dibuja en <canvas> y se descarga.
   ============================================================ */

const ORO = '#E8B84B', ORO2 = '#c79426', AZUL = '#3f9fe0', TINTA = '#eef3f8', GRIS = '#8a97a6';

function cargarImg(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}
function txt(g, s, x, y, font, color, align = 'center') {
  g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

/* dibuja un logo dentro de una loseta blanca redondeada con sombra */
function loseta(g, cx, cy, size, im, ab) {
  const r = size/2;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 26; g.shadowOffsetY = 10;
  const grad = g.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#e9edf2');
  g.fillStyle = grad; rrect(g, cx-r, cy-r, size, size, size*0.28); g.fill();
  g.restore();
  if (im) {
    const s = size*0.66;
    g.drawImage(im, cx - s/2, cy - s/2, s, s);
  } else {
    txt(g, ab, cx, cy + size*0.14, `800 ${Math.round(size*0.42)}px "Chakra Petch", sans-serif`, '#20262e');
  }
}

export async function compartirPartido(p) {
  const [ll, lv, vs] = await Promise.all([
    cargarImg(p.local.logo), cargarImg(p.visita.logo), cargarImg('assets/imagenes/vs.png')
  ]);

  function generar(conLogos) {
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1080;
    render(cv.getContext('2d'), p, conLogos ? ll : null, conLogos ? lv : null, vs);
    return cv;
  }

  function descargar(cv) {
    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `handicapper-${p.local.abrev}-vs-${p.visita.abrev}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  // Intento con logos; si el canvas queda "contaminado" por CORS, reintento sin
  // los logos externos (siglas), conservando el VS y toda la estética.
  try {
    const cv = generar(true);
    cv.toBlob(() => {}, 'image/png');   // dispara el chequeo de seguridad
    // Verificación real: getImageData lanza si está contaminado
    cv.getContext('2d').getImageData(0, 0, 1, 1);
    descargar(cv);
  } catch (_) {
    descargar(generar(false));
  }
}

/* ---- Dibujo completo de la tarjeta ---- */
function render(g, p, ll, lv, vs) {
  const W = 1080, H = 1080;

  /* Fondo con textura */
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#141b26'); bg.addColorStop(.55, '#0c111a'); bg.addColorStop(1, '#05080d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(W/2, 210, 40, W/2, 210, 620);
  glow.addColorStop(0, 'rgba(232,184,75,.16)'); glow.addColorStop(1, 'rgba(232,184,75,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  g.save(); g.globalAlpha = .04; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  for (let i = -H; i < W; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
  g.restore();

  const vig = g.createRadialGradient(W/2, H/2, 340, W/2, H/2, 760);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);

  g.strokeStyle = 'rgba(232,184,75,.5)'; g.lineWidth = 3;
  rrect(g, 34, 34, W-68, H-68, 34); g.stroke();
  g.strokeStyle = 'rgba(232,184,75,.14)'; g.lineWidth = 1;
  rrect(g, 46, 46, W-92, H-92, 28); g.stroke();

  /* Marca */
  txt(g, 'HANDICAPPER', W/2, 132, '800 50px "Chakra Petch", sans-serif', ORO);
  g.strokeStyle = ORO2; g.lineWidth = 3; g.beginPath(); g.moveTo(W/2-70, 150); g.lineTo(W/2+70, 150); g.stroke();
  txt(g, (p.liga || '').toUpperCase() + '  ·  ' + (p.inicio || ''), W/2, 188, '700 21px "Inter", sans-serif', GRIS);

  /* Equipos + VS */
  const yc = 360, size = 190;
  loseta(g, 262, yc, size, ll, p.local.abrev);
  loseta(g, 818, yc, size, lv, p.visita.abrev);

  if (vs) {
    const vw = 190, vh = vw * (vs.height / vs.width);
    g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.drawImage(vs, W/2 - vw/2, yc - vh/2, vw, vh); g.restore();
  } else {
    txt(g, 'VS', W/2, yc + 18, '800 60px "Chakra Petch", sans-serif', GRIS);
  }

  txt(g, p.local.nombre, 262, yc + 150, '700 27px "Inter", sans-serif', TINTA);
  txt(g, p.visita.nombre, 818, yc + 150, '700 27px "Inter", sans-serif', TINTA);
  if (p.local.record)  txt(g, p.local.record, 262, yc + 182, '600 18px "Inter", sans-serif', GRIS);
  if (p.visita.record) txt(g, p.visita.record, 818, yc + 182, '600 18px "Inter", sans-serif', GRIS);

  /* Probabilidad */
  const m = p.mercado || {};
  txt(g, 'PROBABILIDAD DE VICTORIA', W/2, 655, '700 18px "Inter", sans-serif', GRIS);
  txt(g, (m.local||0) + '%', 240, 745, '800 82px "Chakra Petch", sans-serif', ORO, 'left');
  txt(g, (m.visita||0) + '%', 840, 745, '800 82px "Chakra Petch", sans-serif', AZUL, 'right');
  if (m.empate != null) txt(g, 'X ' + m.empate + '%', W/2, 725, '700 24px "Inter", sans-serif', '#b8c1cc');

  const bx = 120, bw = W - 240, by = 780, bh = 30;
  g.fillStyle = '#1a212c'; rrect(g, bx, by, bw, bh, 15); g.fill();
  const wl = Math.max(0, Math.min(bw, bw * (m.local||0)/100));
  const gl = g.createLinearGradient(bx, 0, bx+wl, 0); gl.addColorStop(0, ORO2); gl.addColorStop(1, ORO);
  g.fillStyle = gl; rrect(g, bx, by, wl, bh, 15); g.fill();
  const wv = Math.max(0, Math.min(bw, bw * (m.visita||0)/100));
  const gv = g.createLinearGradient(bx+bw-wv, 0, bx+bw, 0); gv.addColorStop(0, AZUL); gv.addColorStop(1, '#7ccbf2');
  g.fillStyle = gv; rrect(g, bx+bw-wv, by, wv, bh, 15); g.fill();
  g.fillStyle = 'rgba(255,255,255,.22)'; rrect(g, bx, by, bw, bh*0.45, 15); g.fill();

  /* Veredicto */
  if (p.analista) {
    const ax = 120, aw = W - 240, ay = 858, ah = 150;
    const af = g.createLinearGradient(ax, ay, ax, ay+ah);
    af.addColorStop(0, 'rgba(232,184,75,.16)'); af.addColorStop(1, 'rgba(232,184,75,.04)');
    g.fillStyle = af; g.strokeStyle = 'rgba(232,184,75,.5)'; g.lineWidth = 2;
    rrect(g, ax, ay, aw, ah, 20); g.fill(); g.stroke();
    txt(g, 'VEREDICTO DEL ANALISTA', W/2, ay + 42, '700 19px "Inter", sans-serif', ORO);
    txt(g, p.analista.veredicto + '   ·   ' + p.analista.probabilidad + '%', W/2, ay + 100, '800 44px "Chakra Petch", sans-serif', TINTA);
  }

  txt(g, 'Análisis completo en  handicapper', W/2, H - 66, '700 24px "Inter", sans-serif', GRIS);
}
