/* ============================================================
   COMPARTIR — genera una imagen (PNG) premium de la tarjeta de un
   partido, con el logotipo de la marca, para promoción. Muestra el
   enfrentamiento, las probabilidades y el veredicto (sin todo el
   detalle: para eso, que entren a la plataforma).

   No usa librerías: dibuja en un <canvas> y descarga el PNG.
   ============================================================ */

const ORO = '#E8B84B', ORO2 = '#c79426', AZUL = '#38bdf8';

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

/* Dibuja texto centrado con fuente dada */
function txt(g, s, x, y, font, color, align = 'center') {
  g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}

export async function compartirPartido(p) {
  const W = 1080, H = 1080;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  // Fondo
  const fondo = g.createLinearGradient(0, 0, W, H);
  fondo.addColorStop(0, '#0d1218'); fondo.addColorStop(1, '#05070a');
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);

  // Marco dorado sutil
  g.strokeStyle = 'rgba(232,184,75,.35)'; g.lineWidth = 4;
  g.strokeRect(40, 40, W - 80, H - 80);

  // Marca (texto; si luego hay logo PNG, se puede dibujar aquí)
  txt(g, 'HANDICAPPER', W/2, 130, '800 46px "Chakra Petch", sans-serif', ORO);
  txt(g, (p.liga || '').toUpperCase(), W/2, 175, '700 22px "Inter", sans-serif', '#7d8794');

  // Escudos
  const [ll, lv] = await Promise.all([cargarImg(p.local.logo), cargarImg(p.visita.logo)]);
  const yEsc = 340, r = 90;
  const cajaLogo = (x, im, ab) => {
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x - r, yEsc - r, r*2, r*2, 28); g.fill();
    if (im) g.drawImage(im, x - r*0.72, yEsc - r*0.72, r*1.44, r*1.44);
    else txt(g, ab, x, yEsc + 16, '800 52px "Chakra Petch", sans-serif', '#222');
  };
  cajaLogo(300, ll, p.local.abrev);
  cajaLogo(780, lv, p.visita.abrev);
  txt(g, 'VS', W/2, yEsc + 18, '800 46px "Chakra Petch", sans-serif', '#6b7683');

  // Nombres
  txt(g, p.local.nombre, 300, yEsc + 160, '700 30px "Inter", sans-serif', '#eef2f6');
  txt(g, p.visita.nombre, 780, yEsc + 160, '700 30px "Inter", sans-serif', '#eef2f6');

  // Probabilidades (grandes)
  const m = p.mercado || {};
  txt(g, (m.local||0) + '%', 300, 660, '800 96px "Chakra Petch", sans-serif', ORO);
  txt(g, (m.visita||0) + '%', 780, 660, '800 96px "Chakra Petch", sans-serif', AZUL);
  if (m.empate != null) txt(g, 'Empate ' + m.empate + '%', W/2, 640, '700 26px "Inter", sans-serif', '#b8c1cc');

  // Barra
  const bx = 120, bw = W - 240, by = 710, bh = 26;
  g.fillStyle = '#1b222c'; g.beginPath(); g.roundRect(bx, by, bw, bh, 13); g.fill();
  const wl = bw * (m.local||0)/100;
  g.fillStyle = ORO; g.beginPath(); g.roundRect(bx, by, wl, bh, 13); g.fill();
  g.fillStyle = AZUL; const wv = bw * (m.visita||0)/100;
  g.beginPath(); g.roundRect(bx + bw - wv, by, wv, bh, 13); g.fill();

  // Veredicto del analista (si hay)
  if (p.analista) {
    g.fillStyle = 'rgba(232,184,75,.10)'; g.strokeStyle = 'rgba(232,184,75,.4)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(120, 800, W - 240, 150, 20); g.fill(); g.stroke();
    txt(g, 'VEREDICTO DEL ANALISTA', W/2, 850, '700 20px "Inter", sans-serif', ORO, 'center');
    txt(g, p.analista.veredicto + '  ·  ' + p.analista.probabilidad + '%', W/2, 905, '800 40px "Chakra Petch", sans-serif', '#eef2f6');
  }

  // Pie
  txt(g, 'Análisis completo en handicapper', W/2, H - 70, '700 24px "Inter", sans-serif', '#7d8794');

  // Descargar
  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `handicapper-${p.local.abrev}-vs-${p.visita.abrev}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
