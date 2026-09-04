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
  bind('btn-cta', () => { if (!(window.__handiEntrar && window.__handiEntrar())) _cb.abrirAuth?.('registrar'); });
  bind('btn-explore', () => document.querySelector('.compare')?.scrollIntoView({ behavior: 'smooth' }));
  bind('btn-unlock', () => document.getElementById('landing-planes')?.scrollIntoView({ behavior: 'smooth' }));
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

const _BANDERA_ES = `<svg viewBox="0 0 30 20" width="22" height="14" style="border-radius:3px;display:block;box-shadow:0 1px 3px rgba(0,0,0,.4)" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><rect width="30" height="4" y="0" fill="#002a8f"/><rect width="30" height="4" y="8" fill="#002a8f"/><rect width="30" height="4" y="16" fill="#002a8f"/><path d="M0 0 L13 10 L0 20 Z" fill="#cb1515"/><path d="M4.3 7.2 5.2 9.5 7.6 9.5 5.7 11 6.4 13.3 4.3 11.9 2.2 13.3 2.9 11 1 9.5 3.4 9.5 Z" fill="#fff"/></svg>`;
const _BANDERA_EN = `<svg viewBox="0 0 30 20" width="22" height="14" style="border-radius:3px;display:block;box-shadow:0 1px 3px rgba(0,0,0,.4)" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><rect width="30" height="1.538" y="0.000" fill="#b22234"/><rect width="30" height="1.538" y="3.077" fill="#b22234"/><rect width="30" height="1.538" y="6.154" fill="#b22234"/><rect width="30" height="1.538" y="9.231" fill="#b22234"/><rect width="30" height="1.538" y="12.308" fill="#b22234"/><rect width="30" height="1.538" y="15.385" fill="#b22234"/><rect width="30" height="1.538" y="18.462" fill="#b22234"/><rect width="13" height="10.77" fill="#3c3b6e"/><circle cx="1.30" cy="1.20" r="0.55" fill="#fff"/><circle cx="3.60" cy="1.20" r="0.55" fill="#fff"/><circle cx="5.90" cy="1.20" r="0.55" fill="#fff"/><circle cx="8.20" cy="1.20" r="0.55" fill="#fff"/><circle cx="10.50" cy="1.20" r="0.55" fill="#fff"/><circle cx="2.45" cy="3.50" r="0.55" fill="#fff"/><circle cx="4.75" cy="3.50" r="0.55" fill="#fff"/><circle cx="7.05" cy="3.50" r="0.55" fill="#fff"/><circle cx="9.35" cy="3.50" r="0.55" fill="#fff"/><circle cx="11.65" cy="3.50" r="0.55" fill="#fff"/><circle cx="1.30" cy="5.80" r="0.55" fill="#fff"/><circle cx="3.60" cy="5.80" r="0.55" fill="#fff"/><circle cx="5.90" cy="5.80" r="0.55" fill="#fff"/><circle cx="8.20" cy="5.80" r="0.55" fill="#fff"/><circle cx="10.50" cy="5.80" r="0.55" fill="#fff"/><circle cx="2.45" cy="8.10" r="0.55" fill="#fff"/><circle cx="4.75" cy="8.10" r="0.55" fill="#fff"/><circle cx="7.05" cy="8.10" r="0.55" fill="#fff"/><circle cx="9.35" cy="8.10" r="0.55" fill="#fff"/><circle cx="11.65" cy="8.10" r="0.55" fill="#fff"/></svg>`;
function actualizarBotonIdiomaLanding() {
  const html = idiomaActual() === 'es' ? _BANDERA_ES : _BANDERA_EN;
  ['idioma-btn-l', 'idioma-btn-p'].forEach(id => { const b = document.getElementById(id); if (b) { b.innerHTML = html; b.title = idiomaActual() === 'es' ? 'Español' : 'English'; } });
}

/* Rellena todos los [data-i18n] con su traducción */
export function aplicarI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const v = t(k);
    if (v && v !== k) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.getAttribute('data-i18n-ph');
    const v = t(k);
    if (v && v !== k) el.setAttribute('placeholder', v);
  });
}

/* ---- Render de planes (landing teaser + pricing completo) ---- */
export function pintarPlanes() {
  const precio = (p) => _ciclo === 'anual' ? p.anual : p.mensual;
  const sufijo = _ciclo === 'anual' ? '/yr' : '/mo';
  const ES = idiomaActual() === 'es';
  const L = (en, es) => ES ? es : en;
  const MATRIZ = [
    { t: L('All leagues & categories', 'Todas las ligas y categorías'), b: true, p: true, pr: true },
    { t: L('Advanced team & player comparison', 'Comparación avanzada de equipos y jugadores'), b: true, p: true, pr: true },
    { t: L('Hire specialized analyst signals', 'Contratar señales de analistas'), b: true, p: true, pr: true },
    { t: L('Hits, Goals, Points & Shots', 'Hits, Goals, Points y Shots'), b: false, p: L('Limited', 'Limitado'), pr: L('Full', 'Completo') },
    { t: 'Fútbol Rubio', b: false, p: L('Limited', 'Limitado'), pr: L('Full', 'Completo') },
    { t: L('Analyst signals access', 'Acceso a señales de analistas'), b: false, p: L('Limited', 'Limitado'), pr: '~50%' },
    { t: L('Push notifications', 'Notificaciones push'), b: false, p: false, pr: true },
    { t: L('Profile photo', 'Foto de perfil'), b: false, p: false, pr: true },
  ];
  const NO_ICON = '<svg class="pl-no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" width="14" height="14"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const celda = (v) => v === true ? IC_CHECK : (v === false || v == null) ? NO_ICON : `${IC_CHECK}<i>${v}</i>`;
  const claveDe = (p) => p.id === 'basic' ? 'b' : p.id === 'pro' ? 'p' : 'pr';
  const cardHTML = (p, conBoton) => {
    const et = p.etiqueta ? `<div class="plan-etq">${Lg(p.etiqueta)}</div>` : '';
    const k = claveDe(p);
    const feats = MATRIZ.map(f => `<li class="${(f[k] === false || f[k] == null) ? 'off' : ''}">${celda(f[k])}<span>${f.t}</span></li>`).join('');
    return `
      <div class="plan ${p.destacado ? 'destacado' : ''}">
        ${et}
        <div class="plan-nom">${p.nombre}</div>
        <div class="plan-precio"><span class="pp-num">$${precio(p).toFixed(2)}</span><span class="pp-suf">${sufijo}</span></div>
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
  try { document.documentElement.classList.remove('restaurando'); } catch (_) {}
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
