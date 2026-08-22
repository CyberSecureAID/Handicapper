/* ============================================================
   PROVEEDOR DEMO — datos de ejemplo con la MISMA forma que tendrán
   los datos reales de las APIs. Cuando conectemos API-Football /
   SportsDataIO / The Odds API, se crea otro proveedor con esta
   misma interfaz y se cambia sin tocar el resto de la app.

   Interfaz:
     listarPartidos(liga)   -> [Partido]
     detallePartido(id)     -> Partido con análisis

   Un Partido:
     { id, liga, ligaId, inicio, local:{nombre,abrev,logo,record},
       visita:{...}, estado:'proximo'|'vivo'|'final',
       marcador:{local,visita}, mercado:{local,empate,visita} (implícita %),
       datos:[{etiqueta, local, visita}], analista:{...}|null }
   ============================================================ */

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
    local:  { nombre: 'New York Yankees', abrev: 'NYY', record: '71-55' },
    visita: { nombre: 'Toronto Blue Jays', abrev: 'TOR', record: '62-66' },
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
      autor: 'Mesa de Análisis',
      veredicto: 'Yankees',
      probabilidad: 53,
      texto: 'Duelo parejo. Cease es superior en el montículo, pero Weathers zurdo complica a la ofensiva de Toronto y los Yankees son fortísimos en casa. Si Guerrero Jr. no entra en el lineup, la ventaja local crece. Ligera inclinación a Nueva York.'
    }
  },
  {
    id: 'm2', liga: 'MLB', ligaId: 'mlb', inicio: 'Vivo · 6ª ent.', estado: 'vivo',
    local:  { nombre: 'Los Angeles Dodgers', abrev: 'LAD', record: '78-49' },
    visita: { nombre: 'San Diego Padres', abrev: 'SD', record: '70-57' },
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
    local:  { nombre: 'Arsenal', abrev: 'ARS', record: '3-0-1' },
    visita: { nombre: 'Manchester City', abrev: 'MCI', record: '2-1-1' },
    marcador: null,
    mercado: { local: 38, empate: 26, visita: 36 },
    datos: [
      { etiqueta: 'Posición liga', local: '2º', visita: '4º' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-E-G-P', visita: 'G-P-G-G-E' },
      { etiqueta: 'Goles a favor', local: '11', visita: '9' },
      { etiqueta: 'Goles en contra', local: '3', visita: '5' },
    ],
    analista: {
      autor: 'Mesa de Análisis',
      veredicto: 'Empate probable',
      probabilidad: 38,
      texto: 'Choque de altura. Arsenal llega mejor en defensa y juega en casa; City siempre es peligroso. Los números apuntan a un partido muy cerrado, con el empate como escenario más repetido en enfrentamientos recientes.'
    }
  },
  {
    id: 'n1', liga: 'NBA', ligaId: 'nba', inicio: 'Hoy 8:00 PM', estado: 'proximo',
    local:  { nombre: 'Boston Celtics', abrev: 'BOS', record: '—' },
    visita: { nombre: 'Miami Heat', abrev: 'MIA', record: '—' },
    marcador: null,
    mercado: { local: 62, empate: null, visita: 38 },
    datos: [
      { etiqueta: 'Puntos/juego', local: '118.4', visita: '110.2' },
      { etiqueta: 'Forma (últ. 5)', local: 'G-G-G-P-G', visita: 'P-G-P-G-P' },
    ],
    analista: null
  },
];

export async function listarPartidos(ligaId = null) {
  await _demora(120);
  return ligaId ? P.filter(p => p.ligaId === ligaId) : P;
}

export async function detallePartido(id) {
  await _demora(120);
  return P.find(p => p.id === id) || null;
}

function _demora(ms) { return new Promise(r => setTimeout(r, ms)); }
