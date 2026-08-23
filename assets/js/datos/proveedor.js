/* ============================================================
   PROVEEDOR (interfaz única) — el resto de la app SIEMPRE pide los
   datos por aquí, nunca directo a una API.

   INTERRUPTOR: cambia FUENTE entre 'demo' y 'api'.
     'demo' -> datos de ejemplo (proveedor-demo.js)
     'api'  -> datos reales de la API pública de ESPN (proveedor-api.js)
              sin API key, sin backend, sin Cloudflare.

   La interfaz (LIGAS, listarPartidos, detallePartido) es idéntica en
   ambos, así que cambiar de fuente NO afecta a la UI ni al análisis.
   ============================================================ */
import * as demo from './proveedor-demo.js';
import * as api  from './proveedor-api.js';

const FUENTE = 'api';   // <-- cambia a 'api' para usar datos reales de ESPN

const fuente = (FUENTE === 'api') ? api : demo;

export const LIGAS = fuente.LIGAS;
export const listarPartidos = (...a) => fuente.listarPartidos(...a);
export const detallePartido = (...a) => fuente.detallePartido(...a);
