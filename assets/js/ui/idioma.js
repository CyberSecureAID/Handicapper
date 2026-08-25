/* ============================================================
   IDIOMAS (i18n) — Inglés por defecto, Español a elección.
   Uso:  import { t, initIdioma, idiomaActual } from './idioma.js';
         t('cta.suscribir')  -> texto en el idioma activo
   El idioma se guarda en el navegador para la próxima visita.
   ============================================================ */

const CLAVE = 'handicapper-idioma';

const DIC = {
  en: {
    'cta.suscribir':    'Subscribe · $1.99',
    'buscar.ph':        'Search team or league',
    'nav.deportes':     'Sports',
    'liga.todos':       'All sports',
    'tab.partidos':     'Matches',
    'tab.vivo':         'Live',
    'tab.analisis':     'Analysis',
    'tab.perfil':       'Profile',
    'seccion.destacados':'Featured matches',
    'seccion.partidos': 'Matches',
    'cargando':         'Loading matches…',
    'vacio.lista':      'No matches for this selection right now.',
    'estado.vivo':      'Live',
    'estado.proximo':   'Upcoming',
    'prob.titulo':      'Win probability',
    'prob.empate':      'Draw',
    'match.analisis':   'Expert analysis',
    'det.vacio':        'Pick a match to see the full analysis.',
    'det.comparativa':  'Data comparison',
    'det.horario':      'Kickoff',
    'det.faltan':       'Starts in',
    'det.sede':         'Venue',
    'det.jugadores':    'Key players',
    'det.probable':     'Probable',
    'det.lesionados':   'Injuries',
    'det.sinlesiones':  'No injuries reported',
    'det.nodata':       'Not confirmed',
    'det.sindatos':     'No detailed data.',
    'analista.titulo':  'Analyst Verdict',
    'analista.candado': 'Subscribe to read the full analysis',
    'compartir':        'Share',
    'volver':           'Back',
    'share.prob':       'WIN PROBABILITY',
    'share.veredicto':  'ANALYST VERDICT',
    'share.pie':        'Full analysis at handicapper',
    'menu':             'Menu',
    'auth.entrar':      'Log in',
    'auth.registrar':   'Sign up',
    'auth.crear':       'Create account',
    'auth.google':      'Continue with Google',
    'auth.o':           'or',
    'auth.nombre':      'Name',
    'auth.correo':      'Email',
    'auth.clave':       'Password',
    'auth.cuenta':      'Account',
    'auth.salir':       'Log out',
    'auth.hola':        'Hi',
    'tema.claro':       'Switch to light mode',
    'tema.oscuro':      'Switch to dark mode',
  },
  es: {
    'cta.suscribir':    'Suscribirse · $1.99',
    'buscar.ph':        'Buscar equipo o liga',
    'nav.deportes':     'Deportes',
    'liga.todos':       'Todos',
    'tab.partidos':     'Partidos',
    'tab.vivo':         'En vivo',
    'tab.analisis':     'Análisis',
    'tab.perfil':       'Perfil',
    'seccion.destacados':'Partidos destacados',
    'seccion.partidos': 'Partidos',
    'cargando':         'Cargando partidos…',
    'vacio.lista':      'No hay partidos para esta selección ahora mismo.',
    'estado.vivo':      'En vivo',
    'estado.proximo':   'Próximo',
    'prob.titulo':      'Probabilidad de victoria',
    'prob.empate':      'Empate',
    'match.analisis':   'Análisis del experto',
    'det.vacio':        'Elige un partido para ver el análisis completo.',
    'det.comparativa':  'Comparativa de datos',
    'det.horario':      'Horario',
    'det.faltan':       'Empieza en',
    'det.sede':         'Estadio',
    'det.jugadores':    'Jugadores clave',
    'det.probable':     'Probable',
    'det.lesionados':   'Lesionados',
    'det.sinlesiones':  'Sin lesiones reportadas',
    'det.nodata':       'No confirmado',
    'det.sindatos':     'Sin datos detallados.',
    'analista.titulo':  'Veredicto del Analista',
    'analista.candado': 'Suscríbete para leer el análisis completo',
    'compartir':        'Compartir',
    'volver':           'Volver',
    'share.prob':       'PROBABILIDAD DE VICTORIA',
    'share.veredicto':  'VEREDICTO DEL ANALISTA',
    'share.pie':        'Análisis completo en handicapper',
    'menu':             'Menú',
    'auth.entrar':      'Entrar',
    'auth.registrar':   'Registrarse',
    'auth.crear':       'Crear cuenta',
    'auth.google':      'Continuar con Google',
    'auth.o':           'o',
    'auth.nombre':      'Nombre',
    'auth.correo':      'Correo',
    'auth.clave':       'Contraseña',
    'auth.cuenta':      'Cuenta',
    'auth.salir':       'Cerrar sesión',
    'auth.hola':        'Hola',
    'tema.claro':       'Cambiar a modo claro',
    'tema.oscuro':      'Cambiar a modo oscuro',
  }
};

let _idioma = 'en';   // por defecto inglés

export function idiomaActual() { return _idioma; }

/* Resuelve un valor que puede ser texto o {en, es} según el idioma activo */
export function Lg(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v[_idioma] ?? v.en ?? '';
  return v;
}

export function t(clave) {
  return (DIC[_idioma] && DIC[_idioma][clave]) || (DIC.en[clave]) || clave;
}

export function fijarIdioma(idioma) {
  _idioma = (idioma === 'es') ? 'es' : 'en';
  try { localStorage.setItem(CLAVE, _idioma); } catch (_) {}
  document.documentElement.setAttribute('lang', _idioma);
  document.dispatchEvent(new CustomEvent('idioma-cambio'));
}

export function initIdioma() {
  let g = 'en';
  try { g = localStorage.getItem(CLAVE) || 'en'; } catch (_) {}
  _idioma = (g === 'es') ? 'es' : 'en';
  document.documentElement.setAttribute('lang', _idioma);
}
