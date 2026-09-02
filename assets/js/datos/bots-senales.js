/* ============================================================
   SEÑALES DE BOTS — generadas con los datos GRATIS de ESPN (misma fuente
   que ya usa la web, funciona desde el navegador, sin proxy ni key).
   NO usa el motor: solo elige los partidos MÁS DISPAREJOS del día
   (favorito claro) → picks obvios, de alta probabilidad.
   Cada señal lleva 'caducidad' = hora del partido → se autoelimina al empezar.
   ============================================================ */
import { listarPartidos } from './proveedor-api.js';

const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

/* Fuerza del favorito a partir de récord/posición reales. Devuelve null si no hay señal clara. */
function disparidad(m) {
  const wl = num(m.local.winPct), wv = num(m.visita.winPct);
  if (wl != null && wv != null && Math.abs(wl - wv) > 0.02) {
    const favLocal = wl >= wv;
    const gap = Math.abs(wl - wv);
    const prob = Math.round(Math.min(82, Math.max(50, 50 + gap * 115)));
    return { favLocal, prob, motivo: 'record' };
  }
  const pl = num(m.local.posicion), pv = num(m.visita.posicion);
  if (pl != null && pv != null && Math.abs(pl - pv) >= 3) {
    const favLocal = pl < pv;                        // menor posición = mejor
    const gap = Math.abs(pl - pv);
    const prob = Math.round(Math.min(78, Math.max(50, 52 + gap * 2)));
    return { favLocal, prob, motivo: 'posicion' };
  }
  return null;
}

const PLANTILLAS = [
  (f, d, m, fav) => `${fav} llega con mejor récord de temporada que ${fav === f ? d : f}. La diferencia de rendimiento es clara.`,
  (f, d, m, fav) => `En los números fríos, ${fav} ha sido bastante más regular. Un partido donde el favorito está bien marcado.`,
  (f, d, m, fav) => `${fav} entra como favorito lógico: superior en tabla y forma reciente frente a un rival flojo.`,
  (f, d, m, fav) => `Poca duda aquí. ${fav} domina las métricas clave y enfrenta a un equipo en horas bajas.`,
  (f, d, m, fav) => `Los datos empujan fuerte hacia ${fav}: más victorias, mejor posición y un rival por debajo.`,
  (f, d, m, fav) => `${fav} tiene ventaja notable en histórico y estado actual. De los picks más despejados del día.`,
];

/* Genera y publica las señales de un bot (por deporte). */
async function generar({ guardar, uid, firma, autor, color, deportes, ligas, max = 3, minProb = 60 }) {
  // Traer partidos (una sola pasada por liga; ESPN cachea)
  let partidos = [];
  for (const lg of ligas) {
    try { const ps = await listarPartidos(lg); if (Array.isArray(ps)) partidos.push(...ps); } catch (_) {}
  }
  // Solo próximos, con disparidad clara, ordenados por probabilidad (más disparejos primero)
  const cand = [];
  for (const m of partidos) {
    if (m.estado !== 'proximo') continue;
    const d = disparidad(m);
    if (!d || d.prob < minProb) continue;
    const fav = d.favLocal ? m.local.nombre : m.visita.nombre;
    const dog = d.favLocal ? m.visita.nombre : m.local.nombre;
    cand.push({ m, d, fav, dog });
  }
  cand.sort((a, b) => b.d.prob - a.d.prob);

  const elegidos = cand.slice(0, max);
  let publicadas = 0;
  elegidos.forEach((c, i) => {}); // no-op para claridad
  for (let i = 0; i < elegidos.length; i++) {
    const { m, d, fav, dog } = elegidos[i];
    const plantilla = PLANTILLAS[(i + (m.id.length % PLANTILLAS.length)) % PLANTILLAS.length];
    const señal = {
      matchId: `${uid.replace('bot-', 'bot')}:${m.id}`,
      autorUid: uid, firma, autor, deporte: deportes,
      equipos: `${m.local.nombre} vs ${m.visita.nombre}`,
      favorito: fav, prob: d.prob, mercado: 'ml',
      confianza: d.prob >= 68 ? 'alta' : 'media',
      analisis: plantilla(m.local.nombre, m.visita.nombre, m, fav),
      estilo: { color },
      cuando: m.cuando || null,          // hora del partido (para mostrar)
      caducidad: m.cuando || null,       // se autoelimina cuando llega esta hora
    };
    try { await guardar(señal.matchId, señal); publicadas++; } catch (_) {}
  }
  return publicadas;
}

/* Publica TODOS los bots. Lo llama la automatización diaria (y el admin si quiere). */
export async function publicarTodosLosBots(guardar) {
  let total = 0;
  // Alejandro — fútbol
  total += await generar({
    guardar, uid: 'bot-alejandro', firma: 'Alejandro R.', autor: 'Alejandro Ruiz', color: '#4a90ff',
    deportes: 'futbol', ligas: ['epl', 'laliga', 'seriea', 'bundes', 'ucl'], max: 3,
  }).catch(() => 0);
  // Miguel — béisbol
  total += await generar({
    guardar, uid: 'bot-miguel', firma: 'Miguel S.', autor: 'Miguel Santos', color: '#e23b3f',
    deportes: 'beisbol', ligas: ['mlb'], max: 3,
  }).catch(() => 0);
  return { ok: true, publicadas: total };
}
