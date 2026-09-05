/* ============================================================
   SEÑALES DE BOTS, con datos GRATIS de ESPN (sin proxy, sin key, sin tarjeta).
   Regla de oro: SOLO partidos MUY DISPAREJOS (favorito claro). Nada de 45/55.
   Explicación HUMANIZADA y ADAPTATIVA: usa los números reales del partido,
   no un texto genérico. Cada señal caduca cuando empieza el partido.
   ============================================================ */
import { listarPartidos, detallePartido } from './proveedor-api.js';

const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };
const pct = (w) => Math.round(w * 100);

/* Mide qué tan disparejo es un partido. Devuelve datos del favorito/underdog o null. */
function tasaRecord(rec) {
  if (!rec) return null;
  const ns = String(rec).match(/\d+/g);
  if (!ns || ns.length < 2) return null;
  const w = +ns[0], l = +ns[1], t = ns[2] ? +ns[2] : 0, tot = w + l + t;
  return tot > 0 ? w / tot : null;
}
function medir(m) {
  let wl = num(m.local.winPct), wv = num(m.visita.winPct);
  if (wl == null) wl = tasaRecord(m.local.record);          // fallback: usar el récord
  if (wv == null) wv = tasaRecord(m.visita.record);
  const pl = num(m.local.posicion), pv = num(m.visita.posicion);
  let favLocal, prob, gap;
  if (wl != null && wv != null) {
    gap = Math.abs(wl - wv);
    if (gap < 0.12) return null;                    // ~12+ pts de win%
    favLocal = wl >= wv;
    prob = Math.round(Math.min(85, 52 + gap * 120));
  } else if (pl != null && pv != null) {
    gap = Math.abs(pl - pv);
    if (gap < 4) return null;                        // diferencia de tabla
    favLocal = pl < pv;
    prob = Math.round(Math.min(80, 54 + gap * 2.2));
  } else return null;
  if (prob < 62) return null;                        // umbral de "obvio"
  const fav = favLocal ? m.local : m.visita;
  const dog = favLocal ? m.visita : m.local;
  return { favLocal, prob, fav, dog };
}

/* Explicación en tono de OPINIÓN (variada y con carácter), sin cifras que puedan ser falsas.
   Se elige de forma determinista por partido: cada señal se siente distinta y con personalidad. */
function explicacion(fav, dog, prob) {
  const s = String((fav.nombre || '') + (dog.nombre || '') + Math.round(prob || 0));
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) & 0x7fffffff;
  const pick = (arr, off) => arr[((h >> off) & 0x3fffffff) % arr.length];
  const F = fav.nombre, D = dog.nombre;
  const alto = prob >= 74;

  // Aperturas (muchas, humanas, ninguna igual a otra)
  const aperturas = alto ? [
    `Para mí no hay mucho que discutir: ${F} llega en otro nivel frente a ${D}.`,
    `Este lo tengo marcado. ${F} tiene con qué doblegar a ${D} y no por poco.`,
    `Voy directo: ${D} atraviesa un bache y ${F} es de los que lo castigan.`,
    `Cada tanto aparece un partido que se lee solo. Este es uno, y lo firma ${F}.`,
    `${F} viene con hambre; ${D} viene a aguantar. En el papel, eso se paga.`,
    `Me sorprendería lo contrario: ${F} manda y ${D} llega a remolque.`,
    `Si hoy me caso con un favorito, es ${F}. La diferencia con ${D} es real.`,
    `Pocas dudas con este. ${F} está por encima de ${D} en casi todo.`,
  ] : [
    `Más parejo de lo que parece, pero me inclino por ${F} sobre ${D}.`,
    `No es un trámite, ojo. Aun así, ${F} llega mejor que ${D}.`,
    `${F} es mi lado aquí, aunque a ${D} hay que respetarlo.`,
    `Sólido sin ser espectacular: ${F} debería con ${D}, y las razones se sostienen.`,
    `Lo veo para ${F}, pero de los que hay que sudar. ${D} no viene a rellenar.`,
    `Me quedo con ${F}, con los ojos abiertos. ${D} puede incomodar.`,
  ];

  // Argumentos con datos reales
  const args = [];
  if (fav.record && dog.record && /[1-9]/.test(String(fav.record))) args.push(`el récord no engaña, ${fav.record} contra ${dog.record} deja poco margen`);
  if (fav.posicion != null && dog.posicion != null && +fav.posicion > 0 && +fav.posicion < +dog.posicion) args.push(`la tabla los separa (${fav.posicion}º frente a ${dog.posicion}º) y esa distancia termina pesando`);
  const dif = (fav.winPct != null && dog.winPct != null) ? (fav.winPct - dog.winPct) : null;
  if (dif != null && dif >= 0.18) args.push(`el rendimiento de ${F} esta temporada ha estado muy por encima`);
  if (!args.length) args.push(`la forma reciente de ${F} manda con claridad`);

  // Opinión (el "calor humano")
  const sharp = [
    `A todos les gusta el batacazo hasta que los números recuerdan por qué el favorito es favorito.`,
    `Llámame aburrido, pero me quedo con el que ha sido mejor antes que con el que "toca".`,
    `Cuando la historia y el dato apuntan al mismo lado, dejo de buscarle la vuelta.`,
    `Quita los escudos, deja los números, y cualquiera elige el mismo lado.`,
    `Esto no se cocina en un día; es el poso de hacer bien las cosas semana tras semana.`,
    `No es magia, es constancia. Y la constancia, a la larga, se cobra.`,
  ];

  // Cierres
  const cierres = alto
    ? [`Para mí es de lo más claro de la jornada.`, `Salvo uno de esos sustos que pasan una vez al año, esto tiene dueño.`, `Me juego el prestigio con este.`, `Si no sale, toca revisarlo todo. Así de convencido estoy.`]
    : [`La balanza está clara para mí, sin exagerar.`, `Hay margen de sorpresa, pero me quedo con el favorito.`, `El peso de los datos empuja a un lado, y ahí voy.`, `Respeto al rival, pero el favorito llega mejor.`];

  // ESTRUCTURA VARIABLE: apertura + (argumento y/o opinión, en orden variable) + cierre
  const medio = [];
  medio.push(pick(args, 6));
  if (((h >> 10) & 1) === 0) medio.push(pick(sharp, 14));         // a veces mete opinión
  if (((h >> 12) & 1) === 0) medio.reverse();                      // a veces invierte el orden
  let cuerpo = medio.join('. ').replace(/\.\s*$/, '');
  cuerpo = cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1);       // arranca en mayúscula
  return `${pick(aperturas, 0)} ${cuerpo}. ${pick(cierres, 18)}`;
}

async function generar({ guardar, uid, firma, autor, color, deporte, ligas, foto = null, max = 2 }) {
  let partidos = [];
  for (const lg of ligas) {
    try { const ps = await listarPartidos(lg); if (Array.isArray(ps)) partidos.push(...ps.map(p => ({ ...p, _liga: lg }))); } catch (_) {}
  }
  const cand = [];
  const ahora = Date.now(), fin = ahora + 72 * 3600 * 1000;   // próximas 72 horas
  let enVentana = 0;
  for (const m of partidos) {
    if (m.estado !== 'proximo') continue;            // solo partidos por jugarse
    const t = m.cuando ? new Date(m.cuando).getTime() : null;
    if (!t || t < ahora - 3600 * 1000 || t > fin) continue;   // dentro de la ventana
    enVentana++;
    const d = medir(m);
    if (!d) continue;
    cand.push({ m, ...d });
  }
  cand.sort((a, b) => b.prob - a.prob);              // los MÁS disparejos primero
  const elegidos = cand.slice(0, max);

  let publicadas = 0;
  for (const c of elegidos) {
    const { m, fav, dog, prob } = c;
    // Jugadores clave reales del partido (para que el análisis hable de personas, no de clichés)
    let jugFav = [], jugDog = [];
    try {
      const det = await detallePartido(m.id);
      if (det) {
        const esBeis = /beis|mlb/.test(String(deporte).toLowerCase());
        const jl = (esBeis && det.bateadores && (det.bateadores.local || det.bateadores.visita)) ? det.bateadores : (det.jugadores || {});
        const map = (arr) => (arr || []).slice(0, 2).map(j => ({ nombre: j.nombre, dato: j.dato, etiqueta: j.etiqueta }));
        const loc = map(jl.local), vis = map(jl.visita);
        jugFav = (fav === m.local) ? loc : vis;
        jugDog = (fav === m.local) ? vis : loc;
      }
    } catch (_) {}
    const señal = {
      matchId: `${uid.replace('bot-', 'bot')}:${m.id}`,
      autorUid: uid, firma, autor, deporte, foto,
      equipos: `${m.local.nombre} vs ${m.visita.nombre}`,
      local: m.local.nombre, visita: m.visita.nombre,
      logoLocal: m.local.logo || null, logoVisita: m.visita.logo || null,
      favLocal: fav === m.local,
      favorito: fav.nombre, prob, mercado: 'ml',
      confianza: prob >= 74 ? 'alta' : 'media',
      analisis: explicacion(fav, dog, prob),
      jugFav, jugDog,
      estilo: { color },
      cuando: m.cuando || null,
      caducidad: m.cuando || null,                   // desaparece al empezar el partido
    };
    try {
      await guardar(señal.matchId, señal); publicadas++;
      try {
        const { registrarPrediccion } = await import('./prestigio.js');
        await registrarPrediccion({ analistaUid: uid, matchId: m.id, ligaId: m._liga || ligas[0] || '', deporte, favoritoId: (fav && fav.id) || '', favoritoNombre: fav.nombre, cuando: m.cuando });
      } catch (_) {}
    } catch (_) {}
  }
  return { publicadas, fetched: partidos.length, enVentana, califican: cand.length };
}

/* Publica los 5 bots (uno por categoría). Lo dispara la automatización diaria. */
export async function publicarTodosLosBots(guardar) {
  const BOTS = [
    { uid: 'bot-alejandro', firma: 'Alejandro R.', autor: 'Alejandro Ruiz', color: '#4a90ff', deporte: 'futbol', ligas: ['epl', 'laliga', 'seriea', 'bundes', 'ucl'], foto: 's', max: 2 },
    { uid: 'bot-miguel', firma: 'Miguel S.', autor: 'Miguel Santos', color: '#e23b3f', deporte: 'beisbol', ligas: ['mlb'], foto: 't', max: 2 },
    { uid: 'bot-daniel', firma: 'Daniel V.', autor: 'Daniel Vega', color: '#8a5cf6', deporte: 'basket', ligas: ['nba'], foto: 'r', max: 2 },
    { uid: 'bot-ivan', firma: 'Iván T.', autor: 'Iván Torres', color: '#22b8c0', deporte: 'hockey', ligas: ['nhl'], foto: 'q', max: 2 },
    { uid: 'bot-ricardo', firma: 'Ricardo M.', autor: 'Ricardo Méndez', color: '#e08a2a', deporte: 'americano', ligas: ['nfl'], foto: 'p', max: 2 },
  ];
  let total = 0, fetched = 0, enVentana = 0, califican = 0;
  const porDeporte = {};
  for (const cfg of BOTS) {
    const r = await generar({ guardar, ...cfg }).catch(() => ({}));
    total += r.publicadas || 0; fetched += r.fetched || 0; enVentana += r.enVentana || 0; califican += r.califican || 0;
    porDeporte[cfg.deporte] = { fetched: r.fetched || 0, enVentana: r.enVentana || 0, califican: r.califican || 0, publicadas: r.publicadas || 0 };
  }
  return { ok: true, publicadas: total, fetched, enVentana, califican, porDeporte };
}
