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
import { detallePartido } from '../datos/proveedor-api.js';

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
/* Respaldo: líderes de carrera y recepción (los que anotan TD) desde el calendario. */
function lideresTD(comp) {
  const cats = (comp && comp.leaders) || [];
  const out = []; const vistos = new Set();
  const tomar = (clave, rate) => {
    const cat = cats.find(l => (l.name || l.displayName || '').toLowerCase().includes(clave));
    ((cat && cat.leaders) || []).slice(0, 1).forEach(ld => {
      const at = ld.athlete || {}; if (!at.id || vistos.has(at.id)) return; vistos.add(at.id);
      out.push({ id: at.id, nombre: at.displayName || at.shortName || at.fullName, pos: (at.position && at.position.abbreviation) || '', tdRate: rate, gp: null, tdTot: null });
    });
  };
  tomar('rushing', 0.6); tomar('receiving', 0.45);
  return out;
}

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

/* Respaldo robusto: líderes de TD de la LIGA (carrera + recepción), agrupados por equipo. */
async function leadersLigaNFL() {
  const porEquipo = new Map();
  try {
    const d = await pedir(`${API}/leaders`);
    const cats = (d && d.leaders && d.leaders.categories) || (d && d.categories) || [];
    cats.forEach(c => {
      const k = (c.name || c.displayName || c.abbreviation || '').toLowerCase();
      if (!/touchdown|scoring|rushing|receiving/.test(k)) return;
      ((c && c.leaders) || []).forEach(ld => {
        const at = ld.athlete || {};
        const tid = String((ld.team && ld.team.id) || (at.team && at.team.id) || '');
        const pos = (at.position && at.position.abbreviation) || '';
        if (!at.id || !tid || !/RB|WR|TE|QB|FB/i.test(pos)) return;
        const val = num(ld.value != null ? ld.value : ld.displayValue);
        if (val == null || val <= 0) return;
        const tdRate = Math.min(0.75, /touchdown/.test(k) ? val / 14 : 0.45);   // TD totales -> tasa aprox; yardas -> base
        if (!porEquipo.has(tid)) porEquipo.set(tid, []);
        const arr = porEquipo.get(tid);
        if (!arr.some(x => x.id === at.id)) arr.push({ id: at.id, nombre: at.displayName || at.shortName, pos, tdRate, gp: null, tdTot: null });
      });
    });
  } catch (_) {}
  return porEquipo;
}

/* Rango de fechas YYYYMMDD-YYYYMMDD: hoy + N días (para mostrar próximos juegos). */
function _rango(fecha, dias) {
  const f0 = (fecha || '').replace(/-/g, '');
  const d = new Date((fecha || new Date().toISOString().slice(0,10)) + 'T12:00:00'); d.setDate(d.getDate() + (dias || 10));
  const f1 = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${f0}-${f1}`;
}

/* Extrae amenazas de TD (carrera/recepción/TD) de los líderes reales del partido. */
function tdDeDetalle(lista) {
  const out = []; const seen = new Set();
  (lista || []).forEach(j => {
    const e = (j.etiqueta || '').toLowerCase(); const pos = (j.pos || '').toUpperCase();
    const val = parseFloat(String(j.dato).replace(/[^0-9.]/g, '')) || 0;
    let tdRate = null;
    if (/touchdown|td/.test(e)) tdRate = Math.min(0.75, val / 12);
    else if (/rush/.test(e)) tdRate = 0.55;
    else if (/receiv|recep/.test(e)) tdRate = 0.45;
    if (tdRate && j.nombre && j.id && !seen.has(j.id) && /RB|WR|TE|QB|FB|-|^$/.test(pos)) { seen.add(j.id); out.push({ id: j.id, nombre: j.nombre, pos, tdRate, gp: null, tdTot: null, foto: j.foto || null }); }
  });
  return out;
}

/* --------- Orquestador --------- */
export async function topTouchdownProjection({ fecha, n = 9, maxPorEquipo = 5 } = {}) {
  const avisos = [];
  const candidatos = [];
  let data;
  try { data = await pedir(`${API}/scoreboard?dates=${_rango(fecha, 12)}`); }
  catch (_) { return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['No se pudo leer el calendario NFL'] } }; }
  let eventos = (data?.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  if (!eventos.length) return { jugadores: [], meta: { fecha, fuente: 'ESPN', avisos: ['Sin juegos NFL hoy'] } };

  const [defensas, ligaLeaders] = await Promise.all([defensasNFL(), leadersLigaNFL()]);
  const _det = {};
  await Promise.all(eventos.map(async ev => { try { _det[ev.id] = await detallePartido('nfl:' + ev.id); } catch (_) {} }));

  for (const ev of eventos) {
    const comp = ev?.competitions?.[0]; if (!comp) continue;
    const cs = comp.competitors || [];
    const home = cs.find(c => c.homeAway === 'home'), away = cs.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    const lados = [
      { comp: home, equipo: home.team, rival: away.team, local: true },
      { comp: away, equipo: away.team, rival: home.team, local: false },
    ];
    const det = _det[ev.id] || null;
    for (const lado of lados) {
      let roster = tdDeDetalle(det && det.jugadores && det.jugadores[lado.local ? 'local' : 'visita']);
      let _f = 'detalle';
      if (!roster.length) { roster = (await rosterConTD(lado.equipo.id)).filter(x => (x.tdRate || 0) > 0); _f = 'roster'; }
      if (!roster.length) { roster = (ligaLeaders.get(String(lado.equipo.id)) || []).slice(); _f = 'leaders-liga'; }
      if (!roster.length) { roster = lideresTD(lado.comp); _f = 'leaders-cal'; }
      try { console.log(`[NFL-DIAG] ${lado.equipo.abbreviation}: ${roster.length} (fuente=${_f})`); } catch(_){}
      if (!roster.length) { avisos.push(`Sin datos de jugadores para ${lado.equipo?.displayName || '—'}`); continue; }
      roster.sort((a, b) => (b.tdRate || 0) - (a.tdRate || 0));
      const oponente = defensas.get(String(lado.rival.id)) || {};
      let count = 0;
      for (const jug of roster) {
        if (count >= maxPorEquipo) break;
        if ((jug.tdRate || 0) <= 0) continue;   // solo quien ha anotado
        const est = estimarTD({ jugador: { ...jug, titular: true }, oponente, local: lado.local, lineupConfirmado: false });
        candidatos.push({
          id: jug.id, nombre: jug.nombre, pos: jug.pos,
          equipoAbrev: lado.equipo.abbreviation, rivalAbrev: lado.rival.abbreviation, cuando: ev.date, logoLocal: (lado.equipo.logos && lado.equipo.logos[0] && lado.equipo.logos[0].href) || null, logoVisita: (lado.rival.logos && lado.rival.logos[0] && lado.rival.logos[0].href) || null, nomLocal: lado.equipo.shortDisplayName || lado.equipo.name, nomVisita: lado.rival.shortDisplayName || lado.rival.name, 
          tdRate: jug.tdRate, tdTot: jug.tdTot, local: lado.local,
          tdPermRival: oponente.tdPermPorPartido, ...est,
        });
        count++;
      }
    }
  }

  candidatos.sort((a, b) => (new Date(a.cuando) - new Date(b.cuando)) || (b.prob - a.prob) || ((b.tdRate || 0) - (a.tdRate || 0)));
  const top = candidatos.slice(0, n).map((c, i) => ({ rank: i + 1, ...c }));
  return {
    jugadores: top,
    meta: { fecha, fuente: 'ESPN', modelo: 'P(1+ TD) = 1 - e^(-lambda) · estimación propia', candidatosEvaluados: candidatos.length, avisos: [...new Set(avisos)] },
  };
}
