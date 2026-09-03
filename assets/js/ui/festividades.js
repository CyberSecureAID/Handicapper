/* ============================================================
   FESTIVIDADES — cambia las partículas según el día festivo (EE.UU.).
   Fuera de una festividad, la página usa sus partículas normales.
   Todo local, sin librerías externas ni dependencias que actualizar.
   ============================================================ */

/* Cada tema define los emojis y su comportamiento.
   vy>0 caen, vy<0 suben; rot = rotan; n = densidad relativa (1 = normal). */
export const TEMAS = {
  halloween:     { nombre: 'Halloween',          glyphs: ['\u{1F383}', '\u{1F987}', '\u{1F47B}'], vy: [0.05, 0.35],  rot: true,  tam: [13, 28], n: 0.55 },
  accionGracias: { nombre: 'Thanksgiving',       glyphs: ['\u{1F342}', '\u{1F341}', '\u{1F983}'], vy: [0.10, 0.40],  rot: true,  tam: [13, 26], n: 0.55 },
  navidad:       { nombre: 'Christmas',          glyphs: ['\u2744\uFE0F', '\u2745', '\u2746'],    vy: [0.15, 0.50],  rot: false, tam: [11, 22], n: 0.9  },
  anoNuevo:      { nombre: 'New Year',            glyphs: ['\u{1F389}', '\u2728', '\u{1F38A}'],    vy: [0.08, 0.42],  rot: true,  tam: [13, 26], n: 0.7  },
  sanValentin:   { nombre: "Valentine's Day",     glyphs: ['\u2764\uFE0F', '\u{1F495}', '\u{1F496}'], vy: [0.05, 0.30], rot: false, tam: [13, 24], n: 0.55 },
  sanPatricio:   { nombre: "St. Patrick's Day",   glyphs: ['\u2618\uFE0F', '\u{1F340}', '\u{1F49A}'], vy: [0.10, 0.35], rot: true, tam: [13, 24], n: 0.55 },
  julio4:        { nombre: 'Independence Day',    glyphs: ['\u{1F386}', '\u2B50', '\u{1F387}'],    vy: [-0.15, 0.25], rot: true,  tam: [13, 26], n: 0.6  },
};

/* Rangos de fecha (mes 0-indexado, día). Principales festividades de EE.UU. */
const RANGOS = [
  { tema: 'sanValentin',   d: [1, 12],  h: [1, 15] },   // 12–15 feb
  { tema: 'sanPatricio',   d: [2, 15],  h: [2, 18] },   // 15–18 mar
  { tema: 'julio4',        d: [6, 2],   h: [6, 5]  },   // 2–5 jul
  { tema: 'halloween',     d: [9, 24],  h: [10, 1] },   // 24 oct – 1 nov
  { tema: 'accionGracias', d: [10, 20], h: [10, 29] },  // 20–29 nov
  { tema: 'navidad',       d: [11, 20], h: [11, 27] },  // 20–27 dic
  { tema: 'anoNuevo',      d: [11, 29], h: [0, 2]  },   // 29 dic – 2 ene (cruza el año)
];

let _forzado = null;   // null = automático; 'normal' = forzar normales; 'halloween'... = forzar tema

export function forzarTema(key) {
  _forzado = key;
  try { key ? localStorage.setItem('festiv-forzada', key) : localStorage.removeItem('festiv-forzada'); } catch (_) {}
}
export function temaForzado() {
  if (_forzado !== null) return _forzado;
  try { return localStorage.getItem('festiv-forzada'); } catch (_) { return null; }
}

function enRango(m, dd, r) {
  const [dm, di] = r.d, [hm, hi] = r.h;
  if (dm === hm) return m === dm && dd >= di && dd <= hi;
  if (dm < hm) return (m === dm && dd >= di) || (m === hm && dd <= hi) || (m > dm && m < hm);
  // cruza el año (ej. dic → ene)
  return (m === dm && dd >= di) || (m === hm && dd <= hi) || (m > dm) || (m < hm);
}

/* Devuelve el tema activo (objeto con {key, ...}) o null para las partículas normales. */
export function temaActual(fecha = new Date()) {
  const f = temaForzado();
  if (f === 'normal') return null;
  if (f && TEMAS[f]) return { key: f, ...TEMAS[f] };
  const m = fecha.getMonth(), dd = fecha.getDate();
  for (const r of RANGOS) {
    if (enRango(m, dd, r)) return { key: r.tema, ...TEMAS[r.tema] };
  }
  return null;
}

/* Lista ordenada para el botón de prueba. 'auto' = automático por fecha; 'normal' = forzar normales. */
export const CICLO_PRUEBA = ['auto', 'normal', 'halloween', 'accionGracias', 'navidad', 'anoNuevo', 'sanValentin', 'sanPatricio', 'julio4'];

/* Botón TEMPORAL para probar cada tema manualmente. Llama a refrescar() (re-genera partículas). */
export function montarBotonPrueba(refrescar) {
  if (document.getElementById('festiv-btn')) return;
  const nombre = (k) => k === 'auto' ? 'Auto (por fecha)' : k === 'normal' ? 'Normales' : (TEMAS[k] ? TEMAS[k].nombre : k);
  const b = document.createElement('button');
  b.id = 'festiv-btn';
  b.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99990;background:rgba(15,22,34,.92);color:#e8c46a;border:1px solid rgba(232,196,106,.5);border-radius:10px;padding:9px 14px;font-family:system-ui,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45)';
  let idx = 0;
  const f = temaForzado();
  idx = f == null ? 0 : Math.max(0, CICLO_PRUEBA.indexOf(f));
  const pintar = () => { b.textContent = '\u2728 Partículas: ' + nombre(CICLO_PRUEBA[idx]); };
  pintar();
  b.onclick = () => {
    idx = (idx + 1) % CICLO_PRUEBA.length;
    const key = CICLO_PRUEBA[idx];
    forzarTema(key === 'auto' ? null : key);
    pintar();
    if (refrescar) refrescar();
  };
  document.body.appendChild(b);
}
