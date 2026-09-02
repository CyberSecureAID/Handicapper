/* ============================================================
   PARTÍCULAS — brasas/chispas rojo y azul sobre toda la landing.
   Colores de la marca (fuego rojo + azul eléctrico), con vida propia
   y REACCIÓN AL SCROLL: al desplazarse, las chispas se estiran/mueven.
   ============================================================ */
let _raf = null, _cv = null, _ctx = null, _dpr = 1, _ps = [], _activo = false, _t = 0;
let _scrollBoost = 0, _lastScroll = 0;

export function iniciarParticulas(id) {
  _cv = document.getElementById(id);
  if (!_cv) return;
  _ctx = _cv.getContext('2d');
  _dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  redim();
  _lastScroll = window.scrollY || 0;
  window.addEventListener('resize', redim);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? parar() : arrancar());
  arrancar();
}

function onScroll() {
  const y = window.scrollY || 0;
  const d = y - _lastScroll; _lastScroll = y;
  _scrollBoost += d * 0.18;
  if (_scrollBoost > 46) _scrollBoost = 46;
  if (_scrollBoost < -46) _scrollBoost = -46;
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
  const _ls = document.getElementById('landing-screen');
  const w = window.innerWidth, h = (_ls ? _ls.offsetHeight : 0) || window.innerHeight;
  _cv.width = Math.round(w * _dpr); _cv.height = Math.round(h * _dpr);
  _cv.style.height = h + 'px';
  _ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);
  generar(w, h);
}

function generar(w, h) {
  const n = Math.min(230, Math.round((w * h) / 15000));
  _ps = [];
  for (let i = 0; i < n; i++) {
    const rojo = Math.random() < 0.5;
    _ps.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 3.0,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.08 + Math.random() * 0.4),
      a: 0.22 + Math.random() * 0.45,
      f: Math.random() * Math.PI * 2,
      fv: 0.5 + Math.random() * 1.1,
      rojo,
      par: 0.5 + Math.random() * Math.random(),
    });
  }
}

function paso(dt) {
  const w = _cv.width / _dpr, h = _cv.height / _dpr;
  const g = _ctx;
  g.clearRect(0, 0, w, h);
  g.globalCompositeOperation = 'lighter';
  const s = dt / 16;

  _scrollBoost *= 0.90;
  const boost = _scrollBoost;

  for (const p of _ps) {
    p.x += p.vx * s;
    p.y += p.vy * s + Math.sin((_t / 1000) * p.fv + p.f) * 0.18 - boost * (0.25 + p.r * 0.16) * p.par * s;

    if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
    if (p.y < -8) p.y = h + 8; else if (p.y > h + 8) p.y = -8;

    const tw = p.a * (0.55 + 0.45 * Math.sin((_t / 1000) * p.fv + p.f));
    const estira = 1 + Math.min(2.4, Math.abs(boost) * 0.05) * p.par;
    const rad = p.r * 2.5;
    const c = p.rojo ? '255,86,64' : '74,150,255';

    g.save();
    g.translate(p.x, p.y);
    g.scale(1, estira);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0, `rgba(${c},${tw})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.globalCompositeOperation = 'source-over';
}
