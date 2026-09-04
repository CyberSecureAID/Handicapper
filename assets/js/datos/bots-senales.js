/* ============================================================
   SEÑALES DE BOTS — con datos GRATIS de ESPN (sin proxy, sin key, sin tarjeta).
   Regla de oro: SOLO partidos MUY DISPAREJOS (favorito claro). Nada de 45/55.
   Explicación HUMANIZADA y ADAPTATIVA: usa los números reales del partido,
   no un texto genérico. Cada señal caduca cuando empieza el partido.
   ============================================================ */
import { listarPartidos } from './proveedor-api.js';

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
  const s = String((fav.nombre || '') + (dog.nombre || ''));
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff;
  const pick = (arr, off) => arr[((h >> off) >>> 0) % arr.length];

  const aperturas = [
    `Para mí no hay mucho que discutir aquí: ${fav.nombre} llega en otro nivel frente a ${dog.nombre}.`,
    `Si confío en un partido hoy, es este. ${fav.nombre} tiene con qué doblegar a ${dog.nombre}.`,
    `Lo digo sin rodeos: ${dog.nombre} atraviesa un momento flojo y ${fav.nombre} es de los que castigan eso.`,
    `Este es de los que uno mira y dice "ojo". ${fav.nombre} está por encima de ${dog.nombre} en casi todo.`,
    `No me gusta ir contra la corriente sin motivo, y aquí el motivo sobra: ${fav.nombre} es superior.`,
    `${fav.nombre} viene con hambre; ${dog.nombre} viene a sobrevivir. Y eso, en el papel, se paga.`,
    `Me sorprendería lo contrario. ${fav.nombre} tiene el control y ${dog.nombre} llega a remolque.`,
  ];
  const args = [];
  if (fav.record && dog.record) args.push(`El récord no engaña: ${fav.record} contra ${dog.record} deja poco margen para la duda`);
  if (fav.posicion != null && dog.posicion != null && fav.posicion < dog.posicion) args.push(`la tabla los separa (${fav.posicion}º frente a ${dog.posicion}º) y esa distancia termina notándose`);
  const dif = (fav.winPct != null && dog.winPct != null) ? (fav.winPct - dog.winPct) : null;
  if (dif != null && dif >= 0.20) args.push(`el rendimiento de ${fav.nombre} esta temporada ha estado muy por encima`);
  if (!args.length) args.push(`la forma reciente de ${fav.nombre} manda con claridad`);
  const arg = args[((h >> 6) >>> 0) % args.length];

  const cierres = prob >= 74
    ? ['Para mí es de lo más claro de la jornada; difícil imaginar otro final.',
       'Salvo uno de esos batacazos que pasan una vez al año, esto tiene un solo dueño.',
       'Me juego el prestigio con este: el favorito tiene que ganarlo.',
       'Si este no sale, toca revisarlo todo. Así de convencido estoy.']
    : ['No es un caso extremo, pero la balanza está clara para mí.',
       'Hay margen para la sorpresa, sí, pero me quedo con el favorito sin dudarlo.',
       'No es del todo cerrado; aun así, el peso de los datos empuja hacia un lado.',
       'Respeto al rival, pero el favorito llega mejor, y a la larga eso pesa.'];
  return pick(aperturas, 0) + ' ' + arg + '. ' + pick(cierres, 12);
}

async function generar({ guardar, uid, firma, autor, color, deporte, ligas, foto = null, max = 2 }) {
  let partidos = [];
  for (const lg of ligas) {
    try { const ps = await listarPartidos(lg); if (Array.isArray(ps)) partidos.push(...ps); } catch (_) {}
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
      estilo: { color },
      cuando: m.cuando || null,
      caducidad: m.cuando || null,                   // desaparece al empezar el partido
    };
    try { await guardar(señal.matchId, señal); publicadas++; } catch (_) {}
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
