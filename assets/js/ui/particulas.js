/* ============================================================
   PARTÍCULAS — polvo flotante sutil sobre toda la landing (y el
   video). Cada partícula va a su propio ritmo, con deriva leve hacia
   la derecha, para que no se vea un patrón uniforme.
   ============================================================ */
let _raf = null, _cv = null, _ctx = null, _dpr = 1, _ps = [], _activo = false, _t = 0;

export function iniciarParticulas(id) {
  _cv = document.getElementById(id);
  if (!_cv) return;
  _ctx = _cv.getContext('2d');
  _dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  redim();
  window.addEventListener('resize', redim);
  document.addEventListener('visibilitychange', () => document.hidden ? parar() : arrancar());
  arrancar();
}

export function arrancar() {
  const landing = document.getElementById('landing-screen');
  if (landing && landing.style.display === 'none') return;
  if (_activo) return;
  _activo = true;
  let last = performance.now();
  const loop = (t) => {
    if (!_activo) return;
    const dt = Math.min(50, t - last); last = t; _t += dt;
    paso(dt); _raf = requestAnimationFrame(loop);
  };
  _raf = requestAnimationFrame(loop);
}
export function parar() { _activo = false; if (_raf) cancelAnimationFrame(_raf); _raf = null; }

function redim() {
  if (!_cv) return;
  const w = window.innerWidth, h = document.getElementById('landing-screen')?.scrollHeight || window.innerHeight;
  _cv.width = Math.round(w * _dpr); _cv.height = Math.round(h * _dpr);
  _cv.style.height = h + 'px';
  _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
  generar(w, h);
}

function generar(w, h) {
  // Pocas partículas para que sea sutil (densidad por área)
  const n = Math.min(90, Math.round((w * h) / 34000));
  _ps = [];
  for (let i = 0; i < n; i++) {
    _ps.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 2.4,                 // tamaños variados
      vx: 0.06 + Math.random() * 0.5,               // deriva a la derecha, ritmos distintos
      vy: (Math.random() - 0.5) * 0.25,             // vaivén vertical suave
      a: 0.06 + Math.random() * 0.22,               // opacidad
      f: Math.random() * Math.PI * 2,               // fase para el parpadeo
      fv: 0.4 + Math.random() * 0.8,                // velocidad de parpadeo
      calida: Math.random() < 0.4,
    });
  }
}

function paso(dt) {
  const w = _cv.width / _dpr, h = _cv.height / _dpr;
  const g = _ctx;
  g.clearRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const s = dt / 16;
  for (const p of _ps) {
    p.x += p.vx * s;
    p.y += p.vy * s + Math.sin((_t / 1000) * p.fv + p.f) * 0.15;
    if (p.x > w + 5) { p.x = -5; p.y = Math.random() * h; }
    if (p.y < -5) p.y = h + 5; if (p.y > h + 5) p.y = -5;
    const tw = p.a * (0.6 + 0.4 * Math.sin((_t / 1000) * p.fv + p.f));
    const c = p.calida ? '232,200,140' : '210,225,245';
    const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
    grad.addColorStop(0, `rgba(${c},${tw})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}
