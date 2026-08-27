/* ============================================================
   GOAL PROJECTION ENGINE — Top N jugadores con mayor
   P(anotar ≥1 gol) hoy (mercado "anytime goalscorer")
   Fuente: ESPN (site.api.espn.com), CORS abierto (ya usado por la app).
   Modelo PROPIO tipo Poisson: P(≥1 gol) = 1 − e^(−λ), con λ = goles
   esperados del jugador en el partido, ajustado por defensa rival,
   local/visita, forma reciente y minutos previstos.
   ============================================================ */

const API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const LIGAS = { epl: 'eng.1', laliga: 'esp.1', seriea: 'ita.1', bundes: 'ger.1', ucl: 'uefa.champions', ligue1: 'fra.1' };
const GA_MEDIA = 1.35;   // goles encajados por partido, media aproximada de liga top

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

async function pedir(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ¿La posición corresponde a un jugador de ataque? (mayor prob. de gol) */
function perfilPosicion(pos) {
  const p = String(pos || '').toUpperCase();
  if (/(^|\b)(F|ST|CF|SS|FW|LW|RW|W)\b|FORWARD|STRIKER|WING|DELANTER|ATTACK/.test(p)) return { ataque: true, peso: 1.0 };
  if (/M|MF|AM|CM|MID|MEDIO|VOLANTE/.test(p)) return { ataque: false, peso: 0.55 };
  if (/D|DF|CB|LB|RB|WB|DEF|BACK/.test(p)) return { ataque: false, peso: 0.22 };
  if (/G|GK|POR/.test(p)) return { ataque: false, peso: 0.02 };
  return { ataque: false, peso: 0.5 };
}

/* --------- MODELO PROPIO: P(≥1 gol) --------- */
/* jugador: { nombre, pos, goles, partidos, min, golesUlt5, titular }
   oponente: { gaPorPartido }   local: boolean */
export function estimarGol({ jugador, oponente, local, lineupConfirmado }) {
  const factores = [], riesgos = [];
  const perfil = perfilPosicion(jugador.pos);

  // Tasa base: goles por 90'. Usa minutos si existen; si no, aproxima por partidos.
  const goles = num(jugador.goles) || 0;
  const min = num(jugador.min);
  const partidos = num(jugador.partidos);
  let per90;
  if (min && min > 90) per90 = goles / (min / 90);
  else if (partidos && partidos > 0) per90 = goles / (partidos * 0.9);   // ~81' por partido
  else per90 = 0;

  // Minutos previstos (titular ~85, si no confirmado se descuenta un poco)
  const minPrev = lineupConfirmado ? (jugador.titular ? 88 : 25) : 82;
  let lambda = per90 * (minPrev / 90);

  // Piso mínimo por perfil de ataque (un delantero regular sin muchos goles aún
  // conserva algo de amenaza); techo para no exagerar.
  if (perfil.ataque && lambda < 0.15 && (partidos || 0) >= 3) lambda = 0.15;

  // Ajuste por defensa rival (GA/partido vs media de liga)
  const ga = num(oponente && oponente.gaPorPartido);
  if (ga != null) {
    const f = clamp(ga / GA_MEDIA, 0.6, 1.7);
    lambda *= f;
    if (f >= 1.15) factores.push(`Rival encaja ${ga.toFixed(2)} goles/partido`);
    if (f <= 0.85) riesgos.push('Defensa rival sólida');
  }

  // Local / visita
  lambda *= local ? 1.10 : 0.92;
  if (local) factores.push('Juega en casa');

  // Forma reciente (últimos 5): mezcla suave, sin dominar
  const gu5 = num(jugador.golesUlt5);
  if (gu5 != null) {
    const formaPer = (gu5 / 5) * (minPrev / 90);
    lambda = lambda * 0.78 + formaPer * 0.22;
    if (gu5 >= 2) factores.push(`En forma: ${gu5} goles en 5 partidos`);
    if (gu5 === 0) riesgos.push('Sin goles en sus últimos 5');
  }

  lambda = clamp(lambda, 0.02, 1.7);
  const prob = Math.round((1 - Math.exp(-lambda)) * 100);

  // Señales / confianza
  if (perfil.ataque) factores.push('Posición de ataque');
  if (goles >= 8) factores.push(`${goles} goles en la temporada`);
  if (lineupConfirmado && jugador.titular) factores.push('Titular confirmado');
  if (!lineupConfirmado) riesgos.push('Alineación no confirmada');
  if ((partidos || 0) < 3) riesgos.push('Poca muestra de temporada');

  let señales = 0;
  if (ga != null) señales++;
  if (gu5 != null) señales++;
  if (lineupConfirmado) señales++;
  if ((partidos || 0) >= 8) señales++;
  const confianza = señales >= 3 ? 'alta' : señales === 2 ? 'media' : 'baja';

  return {
    prob, lambda: +lambda.toFixed(3), confianza,
    factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3),
  };
}

/* --------- Carga de defensa (GA/partido) por equipo desde standings --------- */
async function defensasDeLiga(ruta) {
  const mapa = new Map();
  try {
    const d = await pedir(`https://site.api.espn.com/apis/v2/sports/soccer/${ruta}/standings`);
    const entries = [];
    const juntar = (n) => { if (!n) return; if (Array.isArray(n.entries)) entries.push(...n.entries); if (n.standings) juntar(n.standings); if (Array.isArray(n.children)) n.children.forEach(juntar); };
    juntar(d);
    entries.forEach(e => {
      const id = e?.team?.id; if (!id) return;
      const st = {}; (e.stats || []).forEach(s => { const k = (s.name || s.type || '').toLowerCase(); st[k] = num(s.value != null ? s.value : s.displayValue); });
      const ga = st.pointsagainst ?? st.goalsagainst ?? st.against;
      const pj = st.gamesplayed ?? st.games ?? null;
      if (ga != null && pj) mapa.set(String(id), ga / pj);
    });
  } catch (_) {}
  return mapa;
}

/* --------- Roster con goles por equipo (best-effort ESPN) --------- */
async function rosterConGoles(ruta, teamId) {
  try {
    const d = await pedir(`${API}/${ruta}/teams/${teamId}/roster`);
    const out = [];
    const items = d?.athletes || d?.roster || [];
    const listar = (arr) => (arr || []).forEach(a => {
      const at = a.athlete || a;
      if (!at || !at.id) return;
      let goles = 0;
      (at.statistics || at.stats || []).forEach(s => {
        const n = (s.name || s.displayName || '').toLowerCase();
        if (n.includes('goal') && !n.includes('against') && !n.includes('conced')) { const v = num(s.value ?? s.displayValue); if (v != null) goles = Math.max(goles, v); }
      });
      out.push({ id: at.id, nombre: at.displayName || at.fullName, pos: at.position?.abbreviation || at.position?.name, goles, partidos: null, min: null });
    });
    if (Array.isArray(items) && items[0] && items[0].items) items.forEach(grp => listar(grp.items));
    else listar(items);
    return out;
  } catch (_) { return []; }
}

/* --------- Orquestador --------- */
export async function topGoalProjection({ fecha, n = 9, maxPorEquipo = 3, ligas } = {}) {
  const avisos = [];
  const ids = ligas || ['epl', 'laliga', 'seriea', 'bundes', 'ucl', 'ligue1'];
  const candidatos = [];

  for (const ligaId of ids) {
    const ruta = LIGAS[ligaId]; if (!ruta) continue;
    let data;
    try { data = await pedir(`${API}/${ruta}/scoreboard?dates=${fecha.replace(/-/g, '')}`); }
    catch (_) { continue; }
    const eventos = data?.events || [];
    if (!eventos.length) continue;

    const defensas = await defensasDeLiga(ruta);

    for (const ev of eventos) {
      const comp = ev?.competitions?.[0]; if (!comp) continue;
      const cs = comp.competitors || [];
      const home = cs.find(c => c.homeAway === 'home'), away = cs.find(c => c.homeAway === 'away');
      if (!home || !away) continue;

      const lados = [
        { equipo: home.team, rival: away.team, local: true },
        { equipo: away.team, rival: home.team, local: false },
      ];
      for (const lado of lados) {
        const roster = await rosterConGoles(ruta, lado.equipo.id);
        if (!roster.length) { avisos.push(`Sin roster para ${lado.equipo?.displayName || '—'}`); continue; }
        // ordena por goles desc y toma los más ofensivos
        roster.sort((a, b) => (b.goles || 0) - (a.goles || 0));
        const oponente = { gaPorPartido: defensas.get(String(lado.rival.id)) };
        let count = 0;
        for (const jug of roster) {
          if (count >= maxPorEquipo) break;
          const perfil = perfilPosicion(jug.pos);
          if (perfil.peso < 0.4 && (jug.goles || 0) < 3) continue;   // descarta defensas/porteros sin gol
          const est = estimarGol({ jugador: { ...jug, titular: true }, oponente, local: lado.local, lineupConfirmado: false });
          candidatos.push({
            id: jug.id, nombre: jug.nombre, equipoAbrev: lado.equipo.abbreviation, rivalAbrev: lado.rival.abbreviation,
            pos: jug.pos, goles: jug.goles, local: lado.local,
            gaRival: oponente.gaPorPartido, ...est,
          });
          count++;
        }
      }
    }
  }

  candidatos.sort((a, b) => b.prob - a.prob || b.lambda - a.lambda);
  const top = candidatos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: { fecha, fuente: 'ESPN', modelo: 'P(≥1 gol) = 1 − e^(−λ) · estimación propia', candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)] },
  };
}
