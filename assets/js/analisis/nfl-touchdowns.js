/* ============================================================
   TOUCHDOWN PROJECTION ENGINE (NFL) — Top N jugadores por
   probabilidad de anotar al menos un touchdown hoy (anytime TD
   scorer, la apuesta más popular del fútbol americano).
   Fuente: ESPN (site.api.espn.com/.../football/nfl), sin API key,
   CORS abierto. Mismo patrón que Points (NBA) y Shots (NHL).
   Modelo PROPIO tipo Poisson: los TD son conteos ->
   P(>=1) = 1 - e^(-lambda), con lambda = TD esperados del jugador,
   ajustado por defensa rival (TD permitidos), local/visita y forma.
   ============================================================ */

import * as N from './nucleo.js';

const API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const UMBRAL = 1;              // línea de referencia: 1+ touchdown
const TD_LIGA = 2.6;          // TD ofensivos permitidos por partido, media aproximada de liga

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };

async function pedir(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* --------- MODELO PROPIO: P(>=1 TD) ---------
   jugador: { tdRate (TD por partido), gp, pos, titular }
   oponente: { tdPermPorPartido }   local: boolean */
export function estimarTD({ jugador, oponente, local, lineupConfirmado }) {
  const factores = [], riesgos = [];
  let lambda = num(jugador.tdRate) || 0;

  // Ajuste por defensa rival (cuántos TD ofensivos permite por partido)
  const tdPerm = num(oponente && oponente.tdPermPorPartido);
  if (tdPerm != null && TD_LIGA > 0) {
    const factorDef = clamp(tdPerm / TD_LIGA, 0.75, 1.35);
    lambda *= factorDef;
    if (factorDef >= 1.12) factores.push('Rival permite muchos TD');
    else if (factorDef <= 0.9) riesgos.push('Defensa rival dura en la zona roja');
  }

  // Local pesa algo en la NFL
  if (local) { lambda *= 1.05; factores.push('Juega en casa'); }

  // Posición: RB y WR/TE marcan casi todos los TD; QB rara vez corre a la end zone
  const pos = String(jugador.pos || '').toUpperCase();
  if (pos === 'RB') { lambda *= 1.06; factores.push('Rol de anotador (RB)'); }
  else if (pos === 'WR' || pos === 'TE') factores.push('Objetivo en zona roja');
  else if (pos === 'QB') lambda *= 0.5;   // solo TD terrestres del QB

  if (lineupConfirmado) factores.push('En alineación confirmada');

  lambda = clamp(lambda, 0.02, 1.6);
  const prob = Math.round((1 - Math.exp(-lambda)) * 100);

  // Confianza según muestra
  const gp = num(jugador.gp) || 0;
  let confianza = 'baja';
  if (gp >= 8 && (jugador.tdRate || 0) >= 0.5) confianza = 'alta';
  else if (gp >= 4) confianza = 'media';
  try { const c = N.confianza({ n: gp * 1.5 + factores.length * 6 }); if (c) confianza = c; } catch (e) {}

  return {
    prob, proj: +lambda.toFixed(2), umbral: UMBRAL, confianza, intervalo: null,
    factores: factores.slice(0, 4), riesgos: riesgos.slice(0, 3),
  };
}

/* --------- Defensa por equipo: TD ofensivos permitidos/partido --------- */
async function defensasNFL() {
  const mapa = new Map();
  try {
    const d = await pedir('https://site.api.espn.com/apis/v2/sports/football/nfl/standings');
    const entries = [];
    const juntar = (n) => { if (!n) return; if (Array.isArray(n.entries)) entries.push(...n.entries); if (n.standings) juntar(n.standings); if (Array.isArray(n.children)) n.children.forEach(juntar); };
    juntar(d);
    entries.forEach(e => {
      const id = e?.team?.id; if (!id) return;
      const st = {}; (e.stats || []).forEach(s => { const k = (s.name || s.type || '').toLowerCase(); st[k] = num(s.value != null ? s.value : s.displayValue); });
      const pa = st.pointsagainst ?? st.avgpointsagainst ?? null;
      const pj = st.gamesplayed ?? st.games ?? null;
      let ptsPerm = null;
      if (pa != null && pj && pa > 80) ptsPerm = pa / pj;
      else if (pa != null && pa < 80) ptsPerm = pa;
      // aprox: TD ofensivos permitidos ~ (puntos permitidos por partido) / 7, acotado
      const tdPermPorPartido = ptsPerm != null ? clamp(ptsPerm / 7.2, 1.4, 4.2) : null;
      mapa.set(String(id), { tdPermPorPartido });
    });
  } catch (_) {}
  return mapa;
}

/* --------- Roster con tasa de TD por jugador --------- */
async function rosterConTD(teamId) {
  try {
    const d = await pedir(`${API}/teams/${teamId}/roster`);
    const out = [];
    const grupos = d?.athletes || [];
    // el roster de NFL viene agrupado por posición (offense/defense/...)
    const planos = [];
    grupos.forEach(g => { if (Array.isArray(g.items)) planos.push(...g.items); else if (g.athlete || g.id) planos.push(g); });
    planos.forEach(a => {
      const at = a.athlete || a; if (!at || !at.id) return;
      const pos = (at.position && (at.position.abbreviation || at.position.name)) || '';
      // solo posiciones que anotan TD ofensivos
      if (!/RB|WR|TE|QB|FB/i.test(pos)) return;
      let tdTot = null, gp = null;
      (at.statistics || at.stats || []).forEach(s => {
        const n = (s.name || s.displayName || s.abbreviation || '').toLowerCase();
        const v = num(s.value ?? s.displayValue);
        if (v == null) return;
        if (n.includes('touchdown') || n === 'td' || n === 'totaltouchdowns' || n === 'rushingtouchdowns' || n === 'receivingtouchdowns') tdTot = (tdTot || 0) + v;
        if (n === 'gamesplayed' || n.includes('games played') || n === 'gp') gp = v;
      });
      const tdRate = (tdTot != null && gp) ? tdTot / gp : (tdTot != null ? tdTot / 10 : null);
      out.push({ id: at.id, nombre: at.displayName || at.fullName, pos, tdRate, gp, tdTot });
    });
    return out;
  } catch (_) { return []; }
}

/* --------- Orquestador --------- */
export async function topTouchdownProjection({ fecha, n = 9, maxPorEquipo = 5 } = {}) {
  const avisos = [];
  const candidatos = [];
  let data;
  try { data = await pedir(`${API}/scoreboard?dates=${fecha.replace(/-/g, '')}`); }
  catch (_) { return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['No se pudo leer el calendario NFL'] } }; }
  const eventos = data?.events || [];
  if (!eventos.length) return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['Sin juegos NFL hoy'] } };

  const defensas = await defensasNFL();

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
      const roster = await rosterConTD(lado.equipo.id);
      if (!roster.length) { avisos.push(`Sin roster para ${lado.equipo?.displayName || '—'}`); continue; }
      roster.sort((a, b) => (b.tdRate || 0) - (a.tdRate || 0));
      const oponente = defensas.get(String(lado.rival.id)) || {};
      let count = 0;
      for (const jug of roster) {
        if (count >= maxPorEquipo) break;
        if ((jug.tdRate || 0) <= 0) continue;   // solo quien ha anotado
        const est = estimarTD({ jugador: { ...jug, titular: true }, oponente, local: lado.local, lineupConfirmado: false });
        candidatos.push({
          id: jug.id, nombre: jug.nombre, pos: jug.pos,
          equipoAbrev: lado.equipo.abbreviation, rivalAbrev: lado.rival.abbreviation, cuando: ev.date, logoLocal: (lado.equipo.logos && lado.equipo.logos[0] && lado.equipo.logos[0].href) || lado.equipo.logo || null, logoVisita: (lado.rival.logos && lado.rival.logos[0] && lado.rival.logos[0].href) || lado.rival.logo || null, 
          tdRate: jug.tdRate, tdTot: jug.tdTot, local: lado.local,
          tdPermRival: oponente.tdPermPorPartido, ...est,
        });
        count++;
      }
    }
  }

  candidatos.sort((a, b) => b.prob - a.prob || (b.tdRate || 0) - (a.tdRate || 0));
  const top = candidatos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: { fecha, fuente: 'ESPN', modelo: 'P(1+ TD) = 1 - e^(-lambda) · estimación propia', candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)] },
  };
}
