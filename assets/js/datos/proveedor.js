/* ============================================================
   PROVEEDOR (interfaz única) — el resto de la app SIEMPRE pide los
   datos por aquí, nunca directo a una API. Hoy usa el proveedor demo;
   mañana se cambia por api-football / sportsdataio / the-odds-api
   sin tocar la UI ni el análisis.
   ============================================================ */
import * as demo from './proveedor-demo.js';

// Fuente activa. Para cambiar a real: importar el nuevo proveedor y
// asignarlo aquí. La interfaz (listarPartidos, detallePartido, LIGAS)
// debe ser idéntica.
const fuente = demo;

export const LIGAS = demo.LIGAS;
export const listarPartidos = (...a) => fuente.listarPartidos(...a);
export const detallePartido = (...a) => fuente.detallePartido(...a);
