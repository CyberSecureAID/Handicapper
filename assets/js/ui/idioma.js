/* ============================================================
   IDIOMAS (i18n) — Inglés por defecto, Español a elección.
   Uso:  import { t, initIdioma, idiomaActual } from './idioma.js';
         t('cta.suscribir')  -> texto en el idioma activo
   El idioma se guarda en el navegador para la próxima visita.
   ============================================================ */

const CLAVE = 'handicapper-idioma';

const DIC = {
  en: {
    'foot.tagline': 'Your ultimate source for verified sports data, advanced analytics and smart insights.',
    'foot.product': 'Product', 'foot.features': 'Features', 'foot.sports': 'Sports', 'foot.plans': 'Plans & pricing', 'foot.updates': 'Live updates',
    'foot.company': 'Company', 'foot.about': 'About us', 'foot.howto': 'How it works', 'foot.contact': 'Contact', 'foot.privacy': 'Privacy policy', 'foot.terms': 'Terms of service',
    'foot.support': 'Support', 'foot.help': 'Help center', 'foot.faq': 'FAQ', 'foot.csupport': 'Contact support', 'foot.status': 'System status',
    'foot.stay': 'Stay updated', 'foot.newsletter': 'Get the latest updates and insights delivered to your inbox.', 'foot.email': 'Enter your email',
    'foot.disclaimer': 'Disclaimer', 'foot.cookies': 'Cookie policy', 'foot.aup': 'Acceptable use', 'foot.dmca': 'Copyright / DMCA', 'foot.responsible': 'Responsible gaming',
    'foot.copyright': '\u00A9 2026 Sports Expectations. All rights reserved. Informational analysis, not betting advice.',
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
    'det.jugadores':    'Players & leaders',
    'det.probable':     'Probable',
    'det.abridor':      'Announced starter today',
    'det.abridores':    'Announced starters',
    'det.compjug':      'Player comparison',
    'det.lideres':      'Team leaders',
    'det.sinabridor':   'Starter not confirmed',
    'det.winpct':       'Win %',
    'det.franquicia':   'Franchise info',
    'det.fundado':      'Founded',
    'det.estadio':      'Stadium',
    'det.capacidad':    'Capacity',
    'det.lhp':          'LHP (left-handed)',
    'det.rhp':          'RHP (right-handed)',
    'det.notazurdo':    'A left-handed starter is on the mound. Lefties are roughly a quarter of MLB starters, and many lineups hit them differently, so it can shift the edge.',
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
    'share.pie':        'Full analysis at Sports Expectations',
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
    'lp.badge':'Sports data & honest probability',
    'lp.h1':'Sports Expectations',
    'lp.sub':'Verifiable stats, in-depth comparisons and clear win probability estimates for every match.',
    'lp.cta':'Get started','lp.cta2':'See plans','lp.leagues':'leagues','lp.games':'games analyzed','lp.from':'to start',
    'lp.today':'Today','lp.conf':'Medium confidence, home edge',
    'lp.whyt':'Study the game',
    'lp.f1t':'Real, verifiable data','lp.f1d':'Records, form, injuries and public data pulled live for every game.',
    'lp.f2t':'Probability estimates','lp.f2d':'Transparent estimates built from real, public data. Organized information, never a promise of results.',
    'lp.f3t':'Alerts that matter','lp.f3d':'Get notified when a match crosses our confidence threshold.',
    'lp.f4t':'Analyst picks','lp.f4d':'Picks and written analysis from specialized analysts on selected games.',
    'lp.pricet':'Choose your level','lp.legal':'Informational analysis, not betting advice.',
    'pl.welcome':'Welcome. Pick a plan','pl.h1':'Unlock the full platform.',
    'pl.sub':'Start monthly with a low barrier, or save with annual. Two months free.',
    'pl.monthly':'Monthly','pl.annual':'Annual, save 17%','pl.nota':'Cancel anytime. Prices in USD.',
    'pl.choose':'Choose','pl.save2':'2 months free','pl.mostpop':'Most popular',
    'tema.claro':       'Switch to light mode',
    'tema.oscuro':      'Switch to dark mode',
  },
  es: {
    'foot.tagline': 'Tu fuente definitiva de datos deportivos verificados, an\u00e1lisis avanzado e informaci\u00f3n inteligente.',
    'foot.product': 'Producto', 'foot.features': 'Caracter\u00edsticas', 'foot.sports': 'Deportes', 'foot.plans': 'Planes y precios', 'foot.updates': 'Actualizaciones en directo',
    'foot.company': 'Empresa', 'foot.about': 'Sobre nosotros', 'foot.howto': 'Cómo funciona', 'foot.contact': 'Contacto', 'foot.privacy': 'Pol\u00edtica de privacidad', 'foot.terms': 'T\u00e9rminos de servicio',
    'foot.support': 'Soporte', 'foot.help': 'Centro de ayuda', 'foot.faq': 'Preguntas frecuentes', 'foot.csupport': 'Contactar soporte', 'foot.status': 'Estado del sistema',
    'foot.stay': 'Mantente al d\u00eda', 'foot.newsletter': 'Recibe las \u00faltimas novedades e informaci\u00f3n en tu correo.', 'foot.email': 'Introduce tu correo',
    'foot.disclaimer': 'Aviso legal', 'foot.cookies': 'Pol\u00edtica de cookies', 'foot.aup': 'Uso aceptable', 'foot.dmca': 'Derechos de autor / DMCA', 'foot.responsible': 'Juego responsable',
    'foot.copyright': '\u00A9 2026 Sports Expectations. Todos los derechos reservados. An\u00e1lisis informativo, no consejo de apuestas.',
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
    'det.jugadores':    'Jugadores y líderes',
    'det.probable':     'Probable',
    'det.abridor':      'Abridor anunciado para hoy',
    'det.abridores':    'Abridores anunciados',
    'det.compjug':      'Comparación de jugadores',
    'det.lideres':      'Líderes del equipo',
    'det.sinabridor':   'Abridor sin confirmar',
    'det.winpct':       '% victorias',
    'det.franquicia':   'Datos del club',
    'det.fundado':      'Fundado',
    'det.estadio':      'Estadio',
    'det.capacidad':    'Capacidad',
    'det.lhp':          'LHP (zurdo)',
    'det.rhp':          'RHP (derecho)',
    'det.notazurdo':    'Hay un abridor zurdo en el montículo. Los zurdos son cerca de un cuarto de los abridores de MLB, y muchas alineaciones les batean distinto, así que puede inclinar la ventaja.',
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
    'share.pie':        'Análisis completo en Sports Expectations',
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
    'lp.badge':'Datos deportivos y estimaciones de probabilidad',
    'lp.h1':'Sports Expectations',
    'lp.sub':'Estadísticas verificables, comparaciones a fondo y estimaciones claras de probabilidad para cada partido.',
    'lp.cta':'Comenzar','lp.cta2':'Ver planes','lp.leagues':'ligas','lp.games':'partidos analizados','lp.from':'para empezar',
    'lp.today':'Hoy','lp.conf':'Confianza media, ventaja local',
    'lp.whyt':'Estudia el juego',
    'lp.f1t':'Datos reales y verificables','lp.f1d':'Récords, forma, lesiones y datos públicos en vivo para cada juego.',
    'lp.f2t':'Estimaciones de probabilidad','lp.f2d':'Estimaciones transparentes a partir de datos reales y públicos. Información organizada, nunca una promesa de resultados.',
    'lp.f3t':'Alertas que importan','lp.f3d':'Te avisamos cuando un partido cruza nuestro umbral de confianza.',
    'lp.f4t':'Picks del analista','lp.f4d':'Picks y análisis escrito de analistas especializados en juegos seleccionados.',
    'lp.pricet':'Elige tu nivel','lp.legal':'Análisis informativo, no consejo de apuestas.',
    'pl.welcome':'Bienvenido. Elige un plan','pl.h1':'Desbloquea la plataforma completa.',
    'pl.sub':'Empieza mensual con baja barrera, o ahorra con el anual. Dos meses gratis.',
    'pl.monthly':'Mensual','pl.annual':'Anual, ahorra 17%','pl.nota':'Cancela cuando quieras. Precios en USD.',
    'pl.choose':'Elegir','pl.save2':'2 meses gratis','pl.mostpop':'Más popular',
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
