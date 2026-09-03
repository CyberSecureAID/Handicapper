/* ============================================================
   COMPARTIR — imagen premium sobre la plantilla (1254x1254).
     - Marca arriba.
     - Logos grandes y bajos + VS (imagen) grande al centro.
     - Nombres grandes con efecto plateado y sombra (3D).
     - Probabilidad grande con barra.
     - Datos repartidos para llenar la tarjeta (hasta 11 filas).
   Textos propios en el idioma activo (inglés por defecto).
   ============================================================ */
import { t, Lg } from './idioma.js';

const ORO = '#E8B84B', ORO2 = '#c79426', AZUL = '#1d9bf0', ROJO = '#e23b3f', GRIS = '#9aa6b2';
const TPL = 'assets/imagenes/compartir.jpg';
const VS = 'assets/imagenes/vs.png';
const N = 1254;

const EQ = { izq: 305, der: 949, logoY: 250, logoR: 80, nomY: 372 };
const VSC = { x: 627, y: 250, w: 240 };

function cargarImg(url) {
  return new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
}
function fit(g, s, maxW, base, fam) {
  let sz = base; g.font = `800 ${sz}px ${fam}`;
  while (g.measureText(s).width > maxW && sz > 11) { sz--; g.font = `800 ${sz}px ${fam}`; }
  return sz;
}
function C(g, s, x, y, font, color) {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
/* Texto con efecto plateado (degradado) y sombra 3D */
function plateado(g, s, x, y, sz) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${sz}px "Chakra Petch", sans-serif`;
  const grad = g.createLinearGradient(0, y - sz*0.6, 0, y + sz*0.6);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(.5, '#d6dde6'); grad.addColorStop(1, '#9aa6b3');
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
  g.fillStyle = grad; g.fillText(s, x, y);
  g.restore();
}
function logoCirc(g, im, cx, cy, r, ab) {
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.closePath();
  const gr = g.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e9edf2');
  g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
  g.clip();
  if (im) g.drawImage(im, cx-r*0.74, cy-r*0.74, r*1.48, r*1.48);
  else C(g, ab, cx, cy, `800 ${Math.round(r*0.6)}px "Chakra Petch", sans-serif`, '#20262e');
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
    C(g, 'SPORTS EXPECTATIONS', 627, 74, '800 42px "Chakra Petch", sans-serif', ORO);

    // Logos grandes + VS grande
    logoCirc(g, conLogos?ll:null, EQ.izq, EQ.logoY, EQ.logoR, p.local.abrev);
    logoCirc(g, conLogos?lv:null, EQ.der, EQ.logoY, EQ.logoR, p.visita.abrev);
    if (vs) { const h = VSC.w*(vs.height/vs.width);
      g.save(); g.shadowColor='rgba(0,0,0,.55)'; g.shadowBlur=18; g.shadowOffsetY=6;
      g.drawImage(vs, VSC.x-VSC.w/2, VSC.y-h/2, VSC.w, h); g.restore();
    } else C(g, 'VS', VSC.x, VSC.y, '800 70px "Chakra Petch", sans-serif', '#eef5fb');

    // Nombres plateados con sombra
    let sz = fit(g, p.local.nombre.toUpperCase(), 330, 40, '"Chakra Petch", sans-serif');
    plateado(g, p.local.nombre.toUpperCase(), EQ.izq, EQ.nomY, sz);
    sz = fit(g, p.visita.nombre.toUpperCase(), 330, 40, '"Chakra Petch", sans-serif');
    plateado(g, p.visita.nombre.toUpperCase(), EQ.der, EQ.nomY, sz);

    // Probabilidad grande
    C(g, t('share.prob'), 627, 452, '800 20px "Inter", sans-serif', GRIS);
    C(g, (m.local||0)+'%', EQ.izq, 518, `800 ${localFav?70:60}px "Chakra Petch", sans-serif`, AZUL);
    C(g, (m.visita||0)+'%', EQ.der, 518, `800 ${!localFav?70:60}px "Chakra Petch", sans-serif`, ROJO);
    // barra
    const bx0=185, bx1=1069, by=562, bh=24, w=bx1-bx0;
    g.fillStyle='#1a212c'; g.beginPath(); g.roundRect(bx0,by,w,bh,12); g.fill();
    const wl=Math.max(0,Math.min(w,w*(m.local||0)/100));
    const gl=g.createLinearGradient(bx0,0,bx0+wl,0); gl.addColorStop(0,'#1683d8'); gl.addColorStop(1,AZUL);
    g.fillStyle=gl; g.beginPath(); g.roundRect(bx0,by,wl,bh,12); g.fill();
    const wv=Math.max(0,Math.min(w,w*(m.visita||0)/100));
    const gv=g.createLinearGradient(bx1-wv,0,bx1,0); gv.addColorStop(0,ROJO); gv.addColorStop(1,'#c62f34');
    g.fillStyle=gv; g.beginPath(); g.roundRect(bx1-wv,by,wv,bh,12); g.fill();
    g.fillStyle='rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(bx0,by,w,bh*0.45,12); g.fill();

    // Datos de comparación (usa comparativa real; si no, p.datos)
    let datos = [];
    if (p.comparativa && p.comparativa.length) {
      datos = p.comparativa.slice(0, 11).map(c => ({ local: c.local, visita: c.visita, etiqueta: { en: c.en || c.k, es: c.es || c.k } }));
    } else {
      datos = (p.datos || []).slice(0, 11);
    }
    const y0=630, y1=1000, n=datos.length, dy = n>1 ? (y1-y0)/(n-1) : 0;
    datos.forEach((dd, i) => {
      const y = Math.round(y0 + dy*i);
      if (i > 0) { g.strokeStyle = 'rgba(255,255,255,.11)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(210, Math.round(y - dy/2)); g.lineTo(1044, Math.round(y - dy/2)); g.stroke(); }
      let s = fit(g, String(Lg(dd.local)), 250, 28, '"Chakra Petch", sans-serif');
      C(g, String(Lg(dd.local)), EQ.izq, y, `800 ${s}px "Chakra Petch", sans-serif`, AZUL);
      let ks = 18; g.font = `700 ${ks}px "Inter", sans-serif`;
      while (g.measureText(String(Lg(dd.etiqueta))).width > 330 && ks > 12) { ks--; g.font=`700 ${ks}px "Inter", sans-serif`; }
      C(g, String(Lg(dd.etiqueta)).toUpperCase(), 627, y, `700 ${ks}px "Inter", sans-serif`, GRIS);
      s = fit(g, String(Lg(dd.visita)), 250, 28, '"Chakra Petch", sans-serif');
      C(g, String(Lg(dd.visita)), EQ.der, y, `800 ${s}px "Chakra Petch", sans-serif`, ROJO);
    });
    return cv;
  }

  function descargar(cv) {
    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sports-expectations-${p.local.abrev}-vs-${p.visita.abrev}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  try {
    const cv = generar(true);
    cv.getContext('2d').getImageData(0,0,1,1);
    descargar(cv);
  } catch (_) { descargar(generar(false)); }
}
