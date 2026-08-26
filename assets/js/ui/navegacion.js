/* ============================================================
   NAVEGACIÓN — router de pantallas (landing / pricing / app),
   render de los planes e internacionalización de la landing.
   ============================================================ */
import { t, Lg, idiomaActual, fijarIdioma } from './idioma.js';
import { PLANES } from '../datos/planes.js';
import { marcarVistaPrevia } from '../auth/estado-pago.js';
import { iniciarParticulas, arrancar as arrancarParticulas, parar as pararParticulas } from './particulas.js';

let _cb = {};          // callbacks del app: { abrirAuth, salir, alEntrarApp }
let _ciclo = 'mensual';

export function initNavegacion(callbacks) {
  _cb = callbacks || {};
  // Botones de la landing
  bind('btn-login', () => { if (!(window.__handiEntrar && window.__handiEntrar())) _cb.abrirAuth?.('entrar'); });
  bind('btn-register', () => { if (!(window.__handiEntrar && window.__handiEntrar())) _cb.abrirAuth?.('registrar'); });
  bind('btn-hero', () => { if (!(window.__handiEntrar && window.__handiEntrar())) _cb.abrirAuth?.('registrar'); });
  bind('btn-hero-2', () => document.getElementById('landing-planes')?.scrollIntoView({ behavior: 'smooth' }));
  bind('btn-salir-planes', () => _cb.salir?.());
  // Idioma en landing y pricing
  ['idioma-btn-l', 'idioma-btn-p'].forEach(id => bind(id, () => fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en')));
  // Toggle mensual/anual
  document.querySelectorAll('.ciclo').forEach(b => b.onclick = () => {
    _ciclo = b.dataset.ciclo;
    document.querySelectorAll('.ciclo').forEach(x => x.classList.toggle('on', x === b));
    pintarPlanes();
  });
  aplicarI18n();
  pintarPlanes();
  actualizarBotonIdiomaLanding();
  arrancarVideoHero();
  activarTiltTarjetas();
  iniciarParticulas('particulas');
  document.addEventListener('idioma-cambio', () => { aplicarI18n(); pintarPlanes(); actualizarBotonIdiomaLanding(); });
}

/* Inclinación 3D + brillo que sigue el cursor en las tarjetas de features */
function activarTiltTarjetas() {
  document.querySelectorAll('.lfeat').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * 8;    // grados
      const ry = (px - 0.5) * 10;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* El video (assets/video/fondo.mp4) se reproduce UNA vez y, al no
   tener 'loop', se queda congelado en su último fotograma. */
function arrancarVideoHero() {
  const v = document.getElementById('hero-video');
  if (!v) return;
  const play = () => v.play().catch(() => {});
  if (v.readyState >= 2) play();
  v.addEventListener('canplay', play, { once: true });
}

function bind(id, fn) { const el = document.getElementById(id); if (el) el.onclick = fn; }

function actualizarBotonIdiomaLanding() {
  const txt = idiomaActual() === 'en' ? 'ES' : 'EN';
  ['idioma-btn-l', 'idioma-btn-p'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = txt; });
}

/* Rellena todos los [data-i18n] con su traducción */
export function aplicarI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const v = t(k);
    if (v && v !== k) el.textContent = v;
  });
}

/* ---- Render de planes (landing teaser + pricing completo) ---- */
export function pintarPlanes() {
  const precio = (p) => _ciclo === 'anual' ? p.anual : p.mensual;
  const sufijo = _ciclo === 'anual' ? '/yr' : '/mo';
  const cardHTML = (p, conBoton) => {
    const et = p.etiqueta ? `<div class="plan-etq">${Lg(p.etiqueta)}</div>` : '';
    const feats = p.incluye.map(f => `<li>${IC_CHECK}${Lg(f)}</li>`).join('');
    const ahorro = _ciclo === 'anual' ? `<div class="plan-ahorro">${t('pl.save2')}</div>` : '';
    return `
      <div class="plan ${p.destacado ? 'destacado' : ''}">
        ${et}
        <div class="plan-nom">${p.nombre}</div>
        <div class="plan-resumen">${Lg(p.resumen)}</div>
        <div class="plan-precio"><span class="pp-num">$${precio(p).toFixed(2)}</span><span class="pp-suf">${sufijo}</span></div>
        ${ahorro}
        <ul class="plan-feats">${feats}</ul>
        ${conBoton ? `<button class="plan-btn ${p.destacado ? 'oro' : ''}" data-plan="${p.id}">${t('pl.choose')}</button>` : ''}
      </div>`;
  };

  const contPricing = document.getElementById('pricing-planes');
  if (contPricing) {
    contPricing.className = 'planes-grid';
    contPricing.innerHTML = PLANES.map(p => cardHTML(p, true)).join('');
    contPricing.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => elegirPlan(b.dataset.plan));
  }
  const contLanding = document.getElementById('landing-planes');
  if (contLanding) {
    contLanding.className = 'planes-grid';
    contLanding.innerHTML = PLANES.map(p => cardHTML(p, true)).join('');
    contLanding.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
      // En la landing, elegir un plan lleva a registro primero
      _cb.abrirAuth?.('registrar');
    });
  }
}

/* El usuario elige un plan en la pantalla de precios */
function elegirPlan(planId) {
  // TODO(Stripe): aquí irá el checkout real. De momento, vista previa.
  marcarVistaPrevia(planId);
  _cb.alEntrarApp?.();
}

/* ---- Cambio de pantalla ---- */
export function mostrarPantalla(nombre) {
  const pantallas = { landing: 'landing-screen', pricing: 'pricing-screen', app: 'app-screen' };
  Object.entries(pantallas).forEach(([n, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (n === nombre) ? '' : 'none';
  });
  document.body.classList.toggle('en-app', nombre === 'app');
  if (nombre === 'landing') arrancarParticulas(); else pararParticulas();
  window.scrollTo(0, 0);
}

const IC_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M20 6L9 17l-5-5"/></svg>`;
