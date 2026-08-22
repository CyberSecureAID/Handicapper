/* ============================================================
   COMPARTIR — construye la imagen sobre la PLANTILLA del usuario
   (assets/imagenes/compartir.jpg). Coloca: logos en los círculos,
   nombres de equipo (tapando "EQUIPO 1/2") y los valores de la
   comparación en cada fila. Descarga un PNG.

   Nota: la plantilla trae etiquetas fijas (RÉCORD, PUNTOS POR
   PARTIDO, ...). Se rellenan las filas cuyo dato exista; el resto
   queda "--". El RÉCORD se rellena siempre.
   ============================================================ */

const ORO = '#E8B84B', AZUL = '#7cc8f5', BL = '#eef5fb', GRIS = '#78848f';

/* Plantilla nativa 1254x1254. Coordenadas en ese sistema. */
const TPL = 'assets/imagenes/compartir.jpg';
const N = 1254;
const FILA_Y0 = 411, FILA_DY = 59.7, X_IZQ = 276, X_DER = 975;
const CIRC = [{x:132,y:262},{x:1122,y:262}], CIRC_R = 50;

/* Orden de filas de la plantilla y palabras clave para mapear datos */
const FILAS = [
  ['record','récord','record'],
  ['puntos por','carreras','goles a favor','points'],
  ['puntos en contra','goles en contra','contra'],
  ['diferencial','dif'],
  ['% de tiros','fg%','tiros'],
  ['3pt','triples','3p'],
  ['tiros libres','ft%','libres'],
  ['rebotes'],
  ['asistencias','asist'],
  ['robos','steals'],
  ['bloqueos','tapones','blocks'],
];

function cargarImg(url) {
  return new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => res(null); im.src = url;
  });
}
function fit(g, s, maxW, base, fam) {
  let sz = base; g.font = `800 ${sz}px ${fam}`;
  while (g.measureText(s).width > maxW && sz > 12) { sz -= 1; g.font = `800 ${sz}px ${fam}`; }
}
function ctext(g, s, x, y, font, color) {
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
function norm(s){ return (s||'').toString().toLowerCase(); }

/* Mapea los datos del partido a las 11 filas de la plantilla */
function valoresFilas(p) {
  const filas = FILAS.map(() => ['--','--']);
  filas[0] = [p.local.record || '--', p.visita.record || '--'];
  (p.datos || []).forEach(d => {
    const et = norm(d.etiqueta);
    for (let i = 1; i < FILAS.length; i++) {
      if (FILAS[i].some(k => et.includes(k))) { filas[i] = [d.local ?? '--', d.visita ?? '--']; break; }
    }
  });
  return filas;
}

export async function compartirPartido(p) {
  const [tpl, ll, lv] = await Promise.all([cargarImg(TPL), cargarImg(p.local.logo), cargarImg(p.visita.logo)]);

  function generar(conLogos) {
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    if (tpl) g.drawImage(tpl, 0, 0, N, N);
    else { g.fillStyle = '#0a0d11'; g.fillRect(0,0,N,N); }

    // Círculos: logo o sigla
    CIRC.forEach((c, idx) => {
      const im = conLogos ? (idx===0?ll:lv) : null;
      const ab = idx===0 ? p.local.abrev : p.visita.abrev;
      g.save(); g.beginPath(); g.arc(c.x, c.y, CIRC_R, 0, Math.PI*2); g.closePath(); g.clip();
      g.fillStyle = '#0b1220'; g.fillRect(c.x-CIRC_R, c.y-CIRC_R, CIRC_R*2, CIRC_R*2);
      if (im) g.drawImage(im, c.x-CIRC_R*0.8, c.y-CIRC_R*0.8, CIRC_R*1.6, CIRC_R*1.6);
      else ctext(g, ab, c.x, c.y, '800 30px "Chakra Petch", sans-serif', BL);
      g.restore();
    });

    // Placas + nombres (tapan EQUIPO 1/2)
    const placa = (x0,x1) => { g.fillStyle = '#0a0f17'; g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
      g.beginPath(); g.roundRect(x0,228,x1-x0,84,16); g.fill(); g.stroke(); };
    placa(186,466); placa(788,1068);
    fit(g, p.local.nombre.toUpperCase(), 250, 32, '"Chakra Petch", sans-serif');
    ctext(g, p.local.nombre.toUpperCase(), 326, 270, g.font, BL);
    fit(g, p.visita.nombre.toUpperCase(), 250, 32, '"Chakra Petch", sans-serif');
    ctext(g, p.visita.nombre.toUpperCase(), 928, 270, g.font, BL);

    // Valores por fila
    const filas = valoresFilas(p);
    filas.forEach((par, i) => {
      const y = Math.round(FILA_Y0 + FILA_DY*i);
      ctext(g, String(par[0]), X_IZQ, y, '800 27px "Chakra Petch", sans-serif', par[0]==='--'?GRIS:ORO);
      ctext(g, String(par[1]), X_DER, y, '800 27px "Chakra Petch", sans-serif', par[1]==='--'?GRIS:AZUL);
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
    descargar(generar(false));   // sin logos externos, con siglas
  }
}
