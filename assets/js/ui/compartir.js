/* ============================================================
   COMPARTIR — imagen premium sobre la plantilla del usuario
   (assets/imagenes/compartir.jpg, marco 1254x1254).
   Composición:
     - Marca arriba.
     - Logo de cada equipo ARRIBA de su nombre (nombres hacia afuera).
     - VS grande en el centro.
     - Medallón central: logo del equipo FAVORITO + su probabilidad.
     - Debajo: hasta 11 filas de datos (izquierda / etiqueta / derecha).
   ============================================================ */
import { t } from './idioma.js';

const ORO = '#E8B84B', AZUL = '#5cbdf0', BL = '#eef5fb', GRIS = '#9aa6b2';
const TPL = 'assets/imagenes/compartir.jpg';
const VS = 'assets/imagenes/vs.png';
const N = 1254;

/* posiciones (sistema nativo 1254) */
const EQ = { izq: 300, der: 954, logoY: 152, logoR: 62, nomY: 258 };
const VSC = { x: 627, y: 212, w: 200 };
const FAV = { x: 627, y: 356, w: 340, h: 82 };
const FILA = { y0: 466, dy: 42, xl: 300, xk: 627, xr: 954, max: 11 };

function cargarImg(url) {
  return new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
}
function fit(g, s, maxW, base, fam) {
  let sz = base; g.font = `800 ${sz}px ${fam}`;
  while (g.measureText(s).width > maxW && sz > 11) { sz--; g.font = `800 ${sz}px ${fam}`; }
  return g.font;
}
function C(g, s, x, y, font, color) {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
function logoEnCirculo(g, im, cx, cy, r, ab, color) {
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.closePath();
  g.fillStyle = color || '#0b1220'; g.fill();
  g.clip();
  if (im) g.drawImage(im, cx-r*0.8, cy-r*0.8, r*1.6, r*1.6);
  else C(g, ab, cx, cy, `800 ${Math.round(r*0.7)}px "Chakra Petch", sans-serif`, BL);
  g.restore();
}

export async function compartirPartido(p) {
  const [tpl, vs, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(VS), cargarImg(p.local.logo), cargarImg(p.visita.logo)]);
  const m = p.mercado || {};
  const localFav = (m.local||0) >= (m.visita||0);

  function generar(conLogos) {
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    if (tpl) g.drawImage(tpl, 0, 0, N, N); else { g.fillStyle='#0a0d11'; g.fillRect(0,0,N,N); }

    // Marca
    C(g, 'HANDICAPPER', 627, 60, '800 40px "Chakra Petch", sans-serif', ORO);

    // Logos arriba + nombres (hacia afuera)
    logoEnCirculo(g, conLogos?ll:null, EQ.izq, EQ.logoY, EQ.logoR, p.local.abrev, '#0e1830');
    logoEnCirculo(g, conLogos?lv:null, EQ.der, EQ.logoY, EQ.logoR, p.visita.abrev, '#2a0f14');
    let f = fit(g, p.local.nombre.toUpperCase(), 300, 30, '"Chakra Petch", sans-serif');
    C(g, p.local.nombre.toUpperCase(), EQ.izq, EQ.nomY, f, BL);
    f = fit(g, p.visita.nombre.toUpperCase(), 300, 30, '"Chakra Petch", sans-serif');
    C(g, p.visita.nombre.toUpperCase(), EQ.der, EQ.nomY, f, BL);

    // VS grande al centro
    if (vs) { const h = VSC.w*(vs.height/vs.width);
      g.save(); g.shadowColor='rgba(0,0,0,.5)'; g.shadowBlur=16; g.shadowOffsetY=5;
      g.drawImage(vs, VSC.x-VSC.w/2, VSC.y-h/2, VSC.w, h); g.restore();
    } else C(g, 'VS', VSC.x, VSC.y, '800 64px "Chakra Petch", sans-serif', BL);

    // Medallón favorito (logo + %)
    const fx = FAV.x, fy = FAV.y;
    g.fillStyle = 'rgba(16,22,32,.9)'; g.strokeStyle = ORO; g.lineWidth = 2;
    g.beginPath(); g.roundRect(fx-FAV.w/2, fy-FAV.h/2, FAV.w, FAV.h, 41); g.fill(); g.stroke();
    const favIm = conLogos ? (localFav?ll:lv) : null;
    const favAb = localFav ? p.local.abrev : p.visita.abrev;
    const favPct = localFav ? (m.local||0) : (m.visita||0);
    const favCol = localFav ? ORO : AZUL;
    logoEnCirculo(g, favIm, fx-FAV.w/2+45, fy, 33, favAb, localFav?'#0e1830':'#2a0f14');
    C(g, favPct + '%', fx+35, fy, '800 42px "Chakra Petch", sans-serif', favCol);

    // Filas de datos (hasta 11)
    const datos = (p.datos || []).slice(0, FILA.max);
    datos.forEach((dd, i) => {
      const y = FILA.y0 + FILA.dy*i;
      let ff = fit(g, String(dd.local), 250, 24, '"Chakra Petch", sans-serif');
      C(g, String(dd.local), FILA.xl, y, ff, ORO);
      g.font = '700 19px "Inter", sans-serif';
      while (g.measureText(String(dd.etiqueta)).width > 320 && parseInt(g.font)>12) g.font = `700 ${parseInt(g.font)-1}px "Inter", sans-serif`;
      C(g, String(dd.etiqueta), FILA.xk, y, g.font, GRIS);
      ff = fit(g, String(dd.visita), 250, 24, '"Chakra Petch", sans-serif');
      C(g, String(dd.visita), FILA.xr, y, ff, AZUL);
    });
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

  try {
    const cv = generar(true);
    cv.getContext('2d').getImageData(0,0,1,1);   // lanza si CORS contaminó
    descargar(cv);
  } catch (_) {
    descargar(generar(false));
  }
}
