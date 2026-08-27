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
  // Actualiza el icono en todos los botones de tema (plataforma, landing, planes)
  ['tema-btn', 'tema-btn-l', 'tema-btn-p'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.innerHTML = tema === 'oscuro' ? IC.sol : IC.luna;
      btn.setAttribute('aria-label', tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  });
}

export function alternarTema() { aplicar(temaActual() === 'oscuro' ? 'claro' : 'oscuro'); }

export function initTema() {
  // Tema oscuro FIJO (sin alternador). Se ignora cualquier preferencia guardada.
  document.documentElement.setAttribute('data-tema', 'oscuro');
  try { localStorage.setItem(CLAVE, 'oscuro'); } catch (_) {}
}
