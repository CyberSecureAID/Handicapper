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

/* Explicación adaptada a los números reales (varía según los datos, no es genérica). */
function explicacion(fav, dog, prob) {
  const partes = [];
  if (fav.winPct != null && dog.winPct != null) {
    partes.push(`${fav.nombre} llega con ${pct(fav.winPct)}% de victorias esta temporada, frente al ${pct(dog.winPct)}% de ${dog.nombre}`);
  } else if (fav.record && dog.record) {
    partes.push(`${fav.nombre} (${fav.record}) supera con claridad el registro de ${dog.nombre} (${dog.record})`);
  } else {
    partes.push(`${fav.nombre} llega en clara ventaja frente a ${dog.nombre}`);
  }
  if (fav.posicion != null && dog.posicion != null) {
    partes.push(`en la tabla van ${fav.posicion}º y ${dog.posicion}º respectivamente`);
  }
  // cierre según el nivel de probabilidad (humaniza sin repetir)
  const cierres = prob >= 74
    ? ['La balanza está muy inclinada; de los picks más despejados del día.',
       'Diferencia grande en todos los frentes: es un favorito muy marcado.',
       'Salvo sorpresa mayúscula, el rendimiento manda a favor del favorito.']
    : ['Ventaja consistente por trayectoria y forma reciente.',
       'El favorito ha sido bastante más regular; los números lo respaldan.',
       'Sólido a favor por historial y estado actual, sin ser un caso extremo.'];
  const cierre = cierres[(Math.round((fav.winPct || 0) * 100) + (fav.posicion || 0)) % cierres.length];
  return partes.join('; ') + '. ' + cierre;
}

async function generar({ guardar, uid, firma, autor, color, deporte, ligas, max = 2 }) {
  let partidos = [];
  for (const lg of ligas) {
    try { const ps = await listarPartidos(lg); if (Array.isArray(ps)) partidos.push(...ps); } catch (_) {}
  }
  const cand = [];
  for (const m of partidos) {
    if (m.estado !== 'proximo') continue;            // solo partidos por jugarse (hoy/próximos)
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
      autorUid: uid, firma, autor, deporte,
      equipos: `${m.local.nombre} vs ${m.visita.nombre}`,
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

/* Publica los 3 bots (fútbol, béisbol, básquet). Lo dispara la automatización diaria. */
export async function publicarTodosLosBots(guardar) {
  let total = 0;
  total += await generar({ guardar, uid: 'bot-alejandro', firma: 'Alejandro R.', autor: 'Alejandro Ruiz', color: '#4a90ff', deporte: 'futbol', ligas: ['epl', 'laliga', 'seriea', 'bundes', 'ucl'], max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-miguel', firma: 'Miguel S.', autor: 'Miguel Santos', color: '#e23b3f', deporte: 'beisbol', ligas: ['mlb'], max: 2 }).catch(() => 0);
  total += await generar({ guardar, uid: 'bot-daniel', firma: 'Daniel V.', autor: 'Daniel Vega', color: '#8a5cf6', deporte: 'basket', ligas: ['nba'], max: 2 }).catch(() => 0);
  return { ok: true, publicadas: total };
}
