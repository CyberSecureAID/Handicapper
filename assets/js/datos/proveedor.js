/* ============================================================
   PROVEEDOR (AGREGADOR MULTI-FUENTE)
   El resto de la app SIEMPRE pide los datos por aquí. Este módulo
   combina varias fuentes: una fuente BASE que provee la lista de
   partidos, y fuentes ENRIQUECEDORAS que solo añaden lo que la base
   no trae (sin duplicar). También fusiona la probabilidad cuando
   varias fuentes la aportan.

   Cómo añadir una fuente nueva (ej. SportMonks vía Función Firebase):
     1) crear proveedor-XXX.js que exporte:
          - detalleEnriquecer(base)  -> devuelve { campos que aporta }
          - APORTA = ['xg','prediccion', ...]  (lista blanca anti-duplicado)
          - (opcional) probabilidad(base) -> { local, empate, visita, peso }
     2) importarlo aquí y añadirlo a ENRIQUECEDORES.
   La base y la UI no cambian.
   ============================================================ */
import * as demo from './proveedor-demo.js';
import * as espn from './proveedor-api.js';
import * as sportsdb from './proveedor-sportsdb.js';   // enriquecedor GRATIS (info de equipos)
// Futuras fuentes con API key (necesitan Función de Firebase para ocultar la key):
// import * as apifootball from './proveedor-apifootball.js';

const MODO = 'api';            // 'demo' | 'api'
const BASE = espn;             // fuente base: provee la lista de partidos
const ENRIQUECEDORES = [       // fuentes que solo añaden lo que falta
  sportsdb,
];

/* ---- Interfaz pública (idéntica a antes) ---- */
export const LIGAS = (MODO === 'demo' ? demo : BASE).LIGAS;

export async function listarPartidos(ligaId = null) {
  if (MODO === 'demo') return demo.listarPartidos(ligaId);
  return BASE.listarPartidos(ligaId);   // la lista la da la base
}

export async function detallePartido(id) {
  if (MODO === 'demo') return demo.detallePartido(id);
  const base = await BASE.detallePartido(id);
  if (!base) return null;
  if (!ENRIQUECEDORES.length) return base;

  // Enriquecer con cada fuente adicional, sin duplicar
  const probs = [{ ...base.mercado, peso: 1.0 }];  // prob de la base
  for (const fuente of ENRIQUECEDORES) {
    try {
      const extra = await fuente.detalleEnriquecer?.(base);
      if (extra) fusionar(base, extra, fuente.APORTA || []);
      const pr = await fuente.probabilidad?.(base);
      if (pr && pr.local != null) probs.push(pr);
    } catch (_) { /* si una fuente falla, se ignora */ }
  }

  // Fusión de probabilidad (promedio ponderado por fiabilidad)
  if (probs.length > 1) base.mercado = combinarProbabilidad(probs, base.mercado?.empate != null);
  return base;
}

/* Añade al objeto base SOLO los campos declarados por la fuente que
   aún no existan o estén vacíos en la base (anti-duplicado). */
function fusionar(base, extra, aporta) {
  for (const campo of aporta) {
    const v = extra[campo];
    if (v == null) continue;
    const actual = base[campo];
    const vacio = actual == null || (Array.isArray(actual) && !actual.length) || actual === '' ;
    if (vacio) base[campo] = v;                    // la base no lo tenía -> se añade
    else if (campo === 'datos' && Array.isArray(v)) {
      // fusionar filas de comparación evitando etiquetas repetidas
      const et = new Set(base.datos.map(d => JSON.stringify(d.etiqueta)));
      v.forEach(d => { if (!et.has(JSON.stringify(d.etiqueta))) base.datos.push(d); });
    }
  }
}

/* Combina varias probabilidades en una sola (promedio ponderado). */
function combinarProbabilidad(lista, futbol) {
  let sL = 0, sV = 0, sE = 0, w = 0;
  lista.forEach(p => {
    const peso = p.peso ?? 1;
    sL += (p.local || 0) * peso;
    sV += (p.visita || 0) * peso;
    sE += (p.empate || 0) * peso;
    w += peso;
  });
  if (!w) return lista[0];
  let L = Math.round(sL / w), V = Math.round(sV / w), E = Math.round(sE / w);
  if (futbol) { const t = L + E + V || 1; L = Math.round(L*100/t); E = Math.round(E*100/t); V = 100 - L - E; return { local: L, empate: E, visita: V }; }
  L = Math.max(1, Math.min(99, L)); return { local: L, empate: null, visita: 100 - L };
}
