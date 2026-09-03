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
function medir(m) {
  const wl = num(m.local.winPct), wv = num(m.visita.winPct);
  const pl = num(m.local.posicion), pv = num(m.visita.posicion);
  let favLocal, prob, gap;
  if (wl != null && wv != null) {
    gap = Math.abs(wl - wv);
    if (gap < 0.14) return null;                    // no es lo bastante disparejo (~14+ pts de win%)
    favLocal = wl >= wv;
    prob = Math.round(Math.min(85, 52 + gap * 120));
  } else if (pl != null && pv != null) {
    gap = Math.abs(pl - pv);
    if (gap < 5) return null;                        // diferencia de tabla pequeña -> se descarta
    favLocal = pl < pv;
    prob = Math.round(Math.min(80, 54 + gap * 2.2));
  } else return null;
  if (prob < 64) return null;                        // umbral de "obvio"
  const fav = favLocal ? m.local : m.visita;
  const dog = favLocal ? m.visita : m.local;
  return { favLocal, prob, fav, dog };
}

/* Explicación adaptada a los datos reales, en tono cualitativo (sin cifras que puedan ser falsas). */
function explicacion(fav, dog, prob) {
  const partes = [];
  const dif = (fav.winPct != null && dog.winPct != null) ? (fav.winPct - dog.winPct) : null;
  if (dif != null && dif >= 0.28) {
    partes.push(`${fav.nombre} ha sido muy superior a ${dog.nombre} en rendimiento durante la temporada`);
  } else if (fav.record && dog.record) {
    partes.push(`${fav.nombre} llega con mejor récord (${fav.record}) que ${dog.nombre} (${dog.record})`);
  } else {
    partes.push(`${fav.nombre} llega en clara ventaja de forma frente a ${dog.nombre}`);
  }
  if (fav.posicion != null && dog.posicion != null && fav.posicion < dog.posicion) {
    partes.push(`y les separan varios puestos en la tabla (${fav.posicion}º frente a ${dog.posicion}º)`);
  }
  const cierres = prob >= 74
    ? ['La balanza se inclina con fuerza hacia el favorito; de los partidos más despejados del día.',
       'Diferencia amplia en los indicadores clave: un favorito muy marcado.',
       'Salvo sorpresa, el rendimiento manda con claridad a favor del favorito.']
    : ['Ventaja consistente por trayectoria y estado reciente.',
       'El favorito ha sido bastante más regular; los datos lo respaldan.',
       'Sólido a favor por historial y forma actual, sin ser un caso extremo.'];
  const cierre = cierres[((fav.posicion || 0) + Math.round((fav.winPct || 0) * 10)) % cierres.length];
  return partes.join(', ') + '. ' + cierre;
}

async function generar({ guardar, uid, firma, autor, color, deporte, ligas, foto = null, max = 2 }) {
  let partidos = [];
  for (const lg of ligas) {
    try { const ps = await listarPartidos(lg); if (Array.isArray(ps)) partidos.push(...ps); } catch (_) {}
  }
  const cand = [];
  const hoyStr = new Date().toDateString();
  for (const m of partidos) {
    if (m.estado !== 'proximo') continue;            // solo partidos por jugarse
    if (!m.cuando || new Date(m.cuando).toDateString() !== hoyStr) continue;   // SOLO HOY
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
  return publicadas;
}

/* Publica los 5 bots (uno por categoría). Lo dispara la automatización diaria. */
export async function publicarTodosLosBots(guardar) {
  let total = 0;
  total += await generar({ guardar, uid: 'bot-alejandro', firma: 'Alejandro R.', autor: 'Alejandro Ruiz', color: '#4a90ff', deporte: 'futbol', ligas: ['epl', 'laliga', 'seriea', 'bundes', 'ucl'], foto: 's', max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-miguel', firma: 'Miguel S.', autor: 'Miguel Santos', color: '#e23b3f', deporte: 'beisbol', ligas: ['mlb'], foto: 't', max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-daniel', firma: 'Daniel V.', autor: 'Daniel Vega', color: '#8a5cf6', deporte: 'basket', ligas: ['nba'], foto: 'r', max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-ivan', firma: 'Iván T.', autor: 'Iván Torres', color: '#22b8c0', deporte: 'hockey', ligas: ['nhl'], foto: 'q', max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-ricardo', firma: 'Ricardo M.', autor: 'Ricardo Méndez', color: '#e08a2a', deporte: 'americano', ligas: ['nfl'], foto: 'p', max: 2 }).catch(() => 0);
  return { ok: true, publicadas: total };
}
