/* ============================================================
   ESTADO DE PAGO / ACCESO — una sola pregunta: ¿el usuario tiene
   acceso a la plataforma?

   Fuente de verdad: el documento del usuario en Firestore
     usuarios/{uid}.suscripcion = { activo, plan, vence, metodo }

   Mientras NO exista la pasarela de pago (Stripe), usamos una
   bandera temporal de "vista previa" para no bloquear el desarrollo.
   Cuando se integre Stripe, la suscripción se marcará activa tras el
   pago y esta bandera desaparece.
   ============================================================ */

// TEMPORAL: permite entrar a la plataforma tras elegir plan aunque el
// pago aún no esté integrado. Poner en false para forzar el gate real.
const VISTA_PREVIA = true;

let _sub = null;   // { activo, plan, vence, metodo } del perfil

export function fijarSuscripcion(sub) { _sub = sub || null; }

/* Vista previa local (por sesión de navegador) tras elegir un plan */
export function marcarVistaPrevia(planId) {
  try { sessionStorage.setItem('hc-preview', planId || 'basic'); } catch (_) {}
}
function vistaPreviaActiva() {
  try { return VISTA_PREVIA && !!sessionStorage.getItem('hc-preview'); } catch (_) { return false; }
}
export function planVistaPrevia() {
  try { return sessionStorage.getItem('hc-preview') || null; } catch (_) { return null; }
}
export function limpiarVistaPrevia() {
  try { sessionStorage.removeItem('hc-preview'); } catch (_) {}
}

/* ¿Suscripción realmente activa (pagada y no vencida)? */
export function suscripcionActiva() {
  if (!_sub || !_sub.activo) return false;
  if (_sub.vence) {
    const v = new Date(_sub.vence);
    if (!isNaN(v) && v < new Date()) return false;
  }
  return true;
}

/* ¿Tiene acceso a la plataforma? (real o vista previa) */
export function tieneAcceso() {
  return suscripcionActiva() || vistaPreviaActiva();
}

/* Plan efectivo actual */
export function planActual() {
  if (suscripcionActiva()) return _sub.plan || 'basic';
  return planVistaPrevia();
}
