/* ============================================================
   TEMA — oscuro por defecto, con opción de cambiar a claro.
   Guarda la preferencia en el navegador para la próxima visita.
   ============================================================ */
import { IC } from './iconos.js';

const CLAVE = 'handicapper-tema';

export function temaActual() {
  return document.documentElement.getAttribute('data-tema') || 'oscuro';
}

function aplicar(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  try { localStorage.setItem(CLAVE, tema); } catch (_) {}
  const btn = document.getElementById('tema-btn');
  if (btn) {
    // En oscuro muestro el sol (para pasar a claro); en claro, la luna.
    btn.innerHTML = tema === 'oscuro' ? IC.sol : IC.luna;
    btn.setAttribute('aria-label', tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
}

export function initTema() {
  let guardado = 'oscuro';
  try { guardado = localStorage.getItem(CLAVE) || 'oscuro'; } catch (_) {}
  aplicar(guardado === 'claro' ? 'claro' : 'oscuro');   // oscuro por defecto

  const btn = document.getElementById('tema-btn');
  if (btn) btn.onclick = () => aplicar(temaActual() === 'oscuro' ? 'claro' : 'oscuro');
}
