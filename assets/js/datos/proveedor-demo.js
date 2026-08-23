/* ============================================================
   PROVEEDOR DEMO — datos de ejemplo. Etiquetas y valores de texto
   son bilingües {en, es}; los números son iguales en ambos idiomas.
   Logos del CDN público de ESPN.
   ============================================================ */

const LG = {
  mlb: (a) => `https://a.espncdn.com/i/teamlogos/mlb/500/${a}.png`,
  nba: (a) => `https://a.espncdn.com/i/teamlogos/nba/500/${a}.png`,
  nfl: (a) => `https://a.espncdn.com/i/teamlogos/nfl/500/${a}.png`,
  soc: (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`,
};

export const LIGAS = [
  { id: 'mlb',    nombre: 'MLB',              corto: 'MLB',      logo: 'assets/imagenes/dep-mlb.png' },
  { id: 'nba',    nombre: 'NBA',              corto: 'NBA',      logo: 'assets/imagenes/dep-nba.png' },
  { id: 'nfl',    nombre: 'NFL',              corto: 'NFL',      logo: 'assets/imagenes/dep-nfl.png' },
  { id: 'nhl',    nombre: 'NHL',              corto: 'NHL',      logo: 'assets/imagenes/dep-nhl.png' },
  { id: 'epl',    nombre: 'Premier League',   corto: 'Premier',  logo: 'assets/imagenes/dep-premier.png' },
  { id: 'laliga', nombre: 'LaLiga',           corto: 'LaLiga',   logo: 'assets/imagenes/dep-laliga.png' },
  { id: 'ucl',    nombre: 'Champions League', corto: 'Champions',logo: 'assets/imagenes/dep-champions.png' },
  { id: 'seriea', nombre: 'Serie A',          corto: 'Serie A',  logo: 'assets/imagenes/dep-seriea.png' },
  { id: 'bundes', nombre: 'Bundesliga',       corto: 'Bundes.',  logo: 'assets/imagenes/dep-bundesliga.png' },
];

const P = [
  {
    id: 'm1', liga: 'MLB', ligaId: 'mlb', inicio: { en: 'Today 1:35 PM', es: 'Hoy 1:35 PM' }, estado: 'proximo',
    local:  { nombre: 'New York Yankees', abrev: 'NYY', record: '71-55', logo: LG.mlb('nyy') },
    visita: { nombre: 'Toronto Blue Jays', abrev: 'TOR', record: '62-66', logo: LG.mlb('tor') },
    marcador: null,
    mercado: { local: 53, empate: null, visita: 47 },
    datos: [
      { etiqueta: { en: 'Record', es: 'Récord' }, local: '71-55', visita: '62-66' },
      { etiqueta: { en: 'Form (last 5)', es: 'Forma (últ. 5)' }, local: { en: 'W-W-L-W-W', es: 'G-G-P-G-G' }, visita: { en: 'L-W-W-L-W', es: 'P-G-G-P-G' } },
      { etiqueta: { en: 'Starter ERA', es: 'ERA abridor' }, local: '3.56', visita: '2.42' },
      { etiqueta: { en: 'Runs/game', es: 'Carreras/juego' }, local: '4.8', visita: '4.2' },
      { etiqueta: { en: 'Home edge', es: 'Localía' }, local: { en: 'Best in MLB', es: 'Mejor de MLB' }, visita: '—' },
    ],
    analista: {
      autor: { en: 'Analysis Desk', es: 'Mesa de Análisis' }, veredicto: 'Yankees', probabilidad: 53,
      texto: {
        en: 'Even matchup. Cease is the better arm, but lefty Weathers troubles Toronto\'s lineup and the Yankees are elite at home. If Guerrero Jr. sits, the home edge grows. Slight lean to New York.',
        es: 'Duelo parejo. Cease es superior en el montículo, pero Weathers zurdo complica a la ofensiva de Toronto y los Yankees son fortísimos en casa. Si Guerrero Jr. no entra, la ventaja local crece. Ligera inclinación a Nueva York.'
      }
    }
  },
  {
    id: 'm2', liga: 'MLB', ligaId: 'mlb', inicio: { en: 'Live · 6th', es: 'Vivo · 6ª ent.' }, estado: 'vivo',
    local:  { nombre: 'Los Angeles Dodgers', abrev: 'LAD', record: '78-49', logo: LG.mlb('lad') },
    visita: { nombre: 'San Diego Padres', abrev: 'SD', record: '70-57', logo: LG.mlb('sd') },
    marcador: { local: 4, visita: 2 },
    mercado: { local: 68, empate: null, visita: 32 },
    datos: [
      { etiqueta: { en: 'Record', es: 'Récord' }, local: '78-49', visita: '70-57' },
      { etiqueta: { en: 'Form (last 5)', es: 'Forma (últ. 5)' }, local: { en: 'W-W-W-L-W', es: 'G-G-G-P-G' }, visita: { en: 'W-L-W-W-L', es: 'G-P-G-G-P' } },
      { etiqueta: { en: 'Runs/game', es: 'Carreras/juego' }, local: '5.1', visita: '4.4' },
    ],
    analista: null
  },
  {
    id: 'e1', liga: 'Premier League', ligaId: 'epl', inicio: { en: 'Tomorrow 10:00 AM', es: 'Mañana 10:00 AM' }, estado: 'proximo',
    local:  { nombre: 'Arsenal', abrev: 'ARS', record: '3-0-1', logo: LG.soc('359') },
    visita: { nombre: 'Manchester City', abrev: 'MCI', record: '2-1-1', logo: LG.soc('382') },
    marcador: null,
    mercado: { local: 38, empate: 26, visita: 36 },
    datos: [
      { etiqueta: { en: 'League position', es: 'Posición liga' }, local: '2nd', visita: '4th' },
      { etiqueta: { en: 'Form (last 5)', es: 'Forma (últ. 5)' }, local: { en: 'W-W-D-W-L', es: 'G-G-E-G-P' }, visita: { en: 'W-L-W-W-D', es: 'G-P-G-G-E' } },
      { etiqueta: { en: 'Goals for', es: 'Goles a favor' }, local: '11', visita: '9' },
      { etiqueta: { en: 'Goals against', es: 'Goles en contra' }, local: '3', visita: '5' },
    ],
    analista: {
      autor: { en: 'Analysis Desk', es: 'Mesa de Análisis' }, veredicto: { en: 'Draw likely', es: 'Empate probable' }, probabilidad: 38,
      texto: {
        en: 'Heavyweight clash. Arsenal arrives sharper defensively and plays at home; City is always dangerous. The numbers point to a very tight game, with the draw the most repeated outcome recently.',
        es: 'Choque de altura. Arsenal llega mejor en defensa y juega en casa; City siempre es peligroso. Los números apuntan a un partido muy cerrado, con el empate como escenario más repetido.'
      }
    }
  },
  {
    id: 'n1', liga: 'NBA', ligaId: 'nba', inicio: { en: 'Today 8:00 PM', es: 'Hoy 8:00 PM' }, estado: 'proximo',
    local:  { nombre: 'Boston Celtics', abrev: 'BOS', record: '—', logo: LG.nba('bos') },
    visita: { nombre: 'Miami Heat', abrev: 'MIA', record: '—', logo: LG.nba('mia') },
    marcador: null,
    mercado: { local: 62, empate: null, visita: 38 },
    datos: [
      { etiqueta: { en: 'Points/game', es: 'Puntos/juego' }, local: '118.4', visita: '110.2' },
      { etiqueta: { en: 'Form (last 5)', es: 'Forma (últ. 5)' }, local: { en: 'W-W-W-L-W', es: 'G-G-G-P-G' }, visita: { en: 'L-W-L-W-L', es: 'P-G-P-G-P' } },
    ],
    analista: null
  },
  {
    id: 'l1', liga: 'LaLiga', ligaId: 'laliga', inicio: { en: 'Sunday 3:00 PM', es: 'Domingo 3:00 PM' }, estado: 'proximo',
    local:  { nombre: 'Real Madrid', abrev: 'RMA', record: '4-0-0', logo: LG.soc('86') },
    visita: { nombre: 'FC Barcelona', abrev: 'BAR', record: '3-1-0', logo: LG.soc('83') },
    marcador: null,
    mercado: { local: 44, empate: 24, visita: 32 },
    datos: [
      { etiqueta: { en: 'League position', es: 'Posición liga' }, local: '1st', visita: '3rd' },
      { etiqueta: { en: 'Form (last 5)', es: 'Forma (últ. 5)' }, local: { en: 'W-W-W-W-D', es: 'G-G-G-G-E' }, visita: { en: 'W-W-L-W-W', es: 'G-G-P-G-G' } },
      { etiqueta: { en: 'Goals for', es: 'Goles a favor' }, local: '13', visita: '12' },
    ],
    analista: {
      autor: { en: 'Analysis Desk', es: 'Mesa de Análisis' }, veredicto: 'Real Madrid', probabilidad: 44,
      texto: {
        en: 'El Clásico. Madrid arrives unbeaten and at home, with the more solid defense. Barcelona answers with a potent attack. Open game, but home form leans slightly to Madrid.',
        es: 'El Clásico. Madrid llega invicto y en casa, con mejor solidez defensiva. Barcelona responde con una ofensiva potente. Partido abierto, pero la localía inclina levemente hacia el Madrid.'
      }
    }
  },
];

export async function listarPartidos(ligaId = null) {
  await _demora(100);
  return ligaId ? P.filter(p => p.ligaId === ligaId) : P;
}

export async function detallePartido(id) {
  await _demora(100);
  return P.find(p => p.id === id) || null;
}

function _demora(ms) { return new Promise(r => setTimeout(r, ms)); }
