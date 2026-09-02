/* ============================================================
   SEÑALES DE BOTS — el admin dispara esto UNA VEZ AL DÍA (botón en el panel).
   Llama a API-Football, arma las señales del día y las guarda en Firebase.
   Todos los usuarios luego las leen desde Firebase (sin gastar más llamadas).
   ------------------------------------------------------------
   1) Crea tu cuenta gratis en https://dashboard.api-football.com (sin tarjeta).
   2) Copia tu key (Account → My Access) y pégala abajo en API_FOOTBALL_KEY.
   ============================================================ */

export const API_FOOTBALL_KEY = '2f73a70e4c34b266163a1424db8a573b';   // <-- key de API-Football

const BASE_SOCCER = 'https://v3.football.api-sports.io';
// Ligas de fútbol (ids de API-Football): EPL, LaLiga, Serie A, Bundesliga, Ligue 1, Champions
const LIGAS_SOCCER = [39, 140, 135, 78, 61, 2];

function hoyISO() { return new Date().toISOString().slice(0, 10); }

async function apiGet(url) {
  const r = await fetch(url, { headers: { 'x-apisports-key': API_FOOTBALL_KEY } });
  const j = await r.json();
  return Array.isArray(j.response) ? j.response : [];
}

/* Genera y publica las señales del bot de fútbol (Alejandro).
   `guardar` = guardarAnalisis(matchId, señal). Devuelve {ok, publicadas}. */
export async function publicarSenalesFutbol(guardar, { max = 3, minProb = 55 } = {}) {
  if (!API_FOOTBALL_KEY) return { ok: false, error: 'Falta la API key (pégala en bots-senales.js).' };
  const fecha = hoyISO();
  const anio = new Date().getFullYear();
  const señales = [];

  for (const liga of LIGAS_SOCCER) {
    if (señales.length >= max) break;
    let fixtures = [];
    try { fixtures = await apiGet(`${BASE_SOCCER}/fixtures?date=${fecha}&league=${liga}&season=${anio}`); } catch (_) {}
    for (const fx of fixtures) {
      if (señales.length >= max) break;
      const fid = fx.fixture && fx.fixture.id; if (!fid) continue;
      let pred = [];
      try { pred = await apiGet(`${BASE_SOCCER}/predictions?fixture=${fid}`); } catch (_) {}
      const p = pred[0]; if (!p || !p.predictions) continue;
      const pc = p.predictions.percent || {};
      const home = parseInt(pc.home) || 0, away = parseInt(pc.away) || 0;
      const local = (fx.teams && fx.teams.home && fx.teams.home.name) || 'Home';
      const visita = (fx.teams && fx.teams.away && fx.teams.away.name) || 'Away';
      const prob = Math.max(home, away);
      if (prob < minProb) continue;                       // solo confianza decente
      const favorito = home >= away ? local : visita;
      señales.push({
        matchId: `botal:${fid}`,
        autorUid: 'bot-alejandro', firma: 'Alejandro R.', autor: 'Alejandro Ruiz', deporte: 'futbol',
        equipos: `${local} vs ${visita}`, favorito, prob, mercado: 'ml',
        confianza: prob >= 65 ? 'alta' : 'media',
        analisis: (p.predictions.advice || '').slice(0, 240),
        estilo: { color: '#4a90ff' },
      });
    }
  }

  let publicadas = 0;
  for (const s of señales) {
    try { await guardar(s.matchId, s); publicadas++; } catch (_) {}
  }
  return { ok: true, publicadas };
}
