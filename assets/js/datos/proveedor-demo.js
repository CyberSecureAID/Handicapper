/* ============================================================
   PROVEEDOR DEMO — datos de ejemplo con la MISMA forma que tendrán
   los datos reales. Los logos salen del CDN público de ESPN (gratis):
     MLB/NBA/NFL:  https://a.espncdn.com/i/teamlogos/{deporte}/500/{abrev}.png
     Fútbol:       https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png
   Al conectar las APIs reales, el logo vendrá en el propio dato.
   ============================================================ */

const LG = {
  mlb: (a) => `https://a.espncdn.com/i/teamlogos/mlb/500/${a}.png`,
  nba: (a) => `https://a.espncdn.com/i/teamlogos/nba/500/${a}.png`,
  nfl: (a) => `https://a.espncdn.com/i/teamlogos/nfl/500/${a}.png`,
  soc: (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`,
};

export const LIGAS = [
  { id: 'mlb',    nombre: 'MLB',              icono: 'beisbol' },
  { id: 'nba',    nombre: 'NBA',              icono: 'basket' },
  { id: 'nfl',    nombre: 'NFL',              icono: 'futbolAmericano' },
  { id: 'epl',    nombre: 'Premier League',   icono: 'futbol' },
  { id: 'laliga', nombre: 'LaLiga',           icono: 'futbol' },
  { id: 'ucl',    nombre: 'Champions League', icono: 'futbol' },
];

const P = [
  {
    id: 'm1', liga: 'MLB', ligaId: 'mlb', inicio: 'Hoy 1:35 PM', estado: 'proximo',
    local:  { nombre: 'New York Yankees', abrev: 'NYY', record: '71-55', logo: LG.mlb('nyy') },
    visita: { nombre: 'Toronto Blue Jays', abrev: 'TOR', record: '62-66', logo: LG.mlb('tor') },
    marcador: null,
    mercado: { local: 50, empate: null, visita: 50 },
    datos: [
      { etiqueta: 'Récord', local: '71-55', visita: '62-66' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-P-G-G', visita: 'P-G-G-P-G' },
      { etiqueta: 'Abridor', local: 'R. Weathers (3.56)', visita: 'D. Cease (2.42)' },
      { etiqueta: 'Carreras/juego', local: '4.8', visita: '4.2' },
      { etiqueta: 'Localía', local: 'Mejor de MLB', visita: '—' },
    ],
    analista: {
      autor: 'Mesa de Análisis', veredicto: 'Yankees', probabilidad: 53,
      texto: 'Duelo parejo. Cease es superior en el montículo, pero Weathers zurdo complica a la ofensiva de Toronto y los Yankees son fortísimos en casa. Si Guerrero Jr. no entra en el lineup, la ventaja local crece. Ligera inclinación a Nueva York.'
    }
  },
  {
    id: 'm2', liga: 'MLB', ligaId: 'mlb', inicio: 'Vivo · 6ª ent.', estado: 'vivo',
    local:  { nombre: 'Los Angeles Dodgers', abrev: 'LAD', record: '78-49', logo: LG.mlb('lad') },
    visita: { nombre: 'San Diego Padres', abrev: 'SD', record: '70-57', logo: LG.mlb('sd') },
    marcador: { local: 4, visita: 2 },
    mercado: { local: 68, empate: null, visita: 32 },
    datos: [
      { etiqueta: 'Récord', local: '78-49', visita: '70-57' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-G-P-G', visita: 'G-P-G-G-P' },
      { etiqueta: 'Carreras/juego', local: '5.1', visita: '4.4' },
    ],
    analista: null
  },
  {
    id: 'e1', liga: 'Premier League', ligaId: 'epl', inicio: 'Mañana 10:00 AM', estado: 'proximo',
    local:  { nombre: 'Arsenal', abrev: 'ARS', record: '3-0-1', logo: LG.soc('359') },
    visita: { nombre: 'Manchester City', abrev: 'MCI', record: '2-1-1', logo: LG.soc('382') },
    marcador: null,
    mercado: { local: 38, empate: 26, visita: 36 },
    datos: [
      { etiqueta: 'Posición liga', local: '2º', visita: '4º' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-E-G-P', visita: 'G-P-G-G-E' },
      { etiqueta: 'Goles a favor', local: '11', visita: '9' },
      { etiqueta: 'Goles en contra', local: '3', visita: '5' },
    ],
    analista: {
      autor: 'Mesa de Análisis', veredicto: 'Empate probable', probabilidad: 38,
      texto: 'Choque de altura. Arsenal llega mejor en defensa y juega en casa; City siempre es peligroso. Los números apuntan a un partido muy cerrado, con el empate como escenario más repetido en enfrentamientos recientes.'
    }
  },
  {
    id: 'n1', liga: 'NBA', ligaId: 'nba', inicio: 'Hoy 8:00 PM', estado: 'proximo',
    local:  { nombre: 'Boston Celtics', abrev: 'BOS', record: '—', logo: LG.nba('bos') },
    visita: { nombre: 'Miami Heat', abrev: 'MIA', record: '—', logo: LG.nba('mia') },
    marcador: null,
    mercado: { local: 62, empate: null, visita: 38 },
    datos: [
      { etiqueta: 'Puntos/juego', local: '118.4', visita: '110.2' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-G-P-G', visita: 'P-G-P-G-P' },
    ],
    analista: null
  },
  {
    id: 'l1', liga: 'LaLiga', ligaId: 'laliga', inicio: 'Domingo 3:00 PM', estado: 'proximo',
    local:  { nombre: 'Real Madrid', abrev: 'RMA', record: '4-0-0', logo: LG.soc('86') },
    visita: { nombre: 'FC Barcelona', abrev: 'BAR', record: '3-1-0', logo: LG.soc('83') },
    marcador: null,
    mercado: { local: 44, empate: 24, visita: 32 },
    datos: [
      { etiqueta: 'Posición liga', local: '1º', visita: '3º' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-G-G-E', visita: 'G-G-P-G-G' },
      { etiqueta: 'Goles a favor', local: '13', visita: '12' },
    ],
    analista: {
      autor: 'Mesa de Análisis', veredicto: 'Real Madrid', probabilidad: 44,
      texto: 'El Clásico. Madrid llega invicto y en casa, con mejor solidez defensiva. Barcelona responde con una ofensiva potente. Partido abierto, pero la localía y la forma inclinan levemente la balanza hacia el Madrid.'
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
