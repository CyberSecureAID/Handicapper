/* Portada móvil (solo <=640px).
   - Partidos destacados: REALES desde el proveedor del repo (ESPN). Sin probabilidades.
   - Jugador destacado: rota cada 6h con fotos oficiales (CDN NBA/MLB).
   - Tabs de Key stats: promedios generales de muestra (no probabilidad). */

/* ---------- Partidos reales ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function hora(iso){ try { return new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch(_){ return ''; } }

function estadoHtml(m){
  if (m.estado === 'vivo')   return '<span class="mlp-live vivo"><i class="ldot"></i>LIVE</span>';
  if (m.estado === 'final')  return '<span class="mlp-live fin">FINAL</span>';
  return '<span class="mlp-live q">' + esc(hora(m.cuando)) + '</span>';
}
function crest(eq){
  var logo = eq && eq.logo ? eq.logo : '';
  return logo ? '<img class="mlp-crest" src="' + esc(logo) + '" alt="" loading="lazy">' : '<span class="mlp-crest ph"></span>';
}
function nombre(eq){
  if (!eq) return '';
  if (eq.abrev) return esc(String(eq.abrev).toUpperCase());
  return esc(eq.nombre || '');
}

function matchHtml(m){
  var score = m.marcador ? (m.marcador.local + ' – ' + m.marcador.visita) : '';
  return '<div class="mlp-match">' +
    '<div class="mlp-team">' + crest(m.local) + '<span class="mlp-tname">' + nombre(m.local) + '</span></div>' +
    '<div class="mlp-mid"><img class="mlp-vsico" src="assets/imagenes/vs.png" alt="vs">' +
      (score ? '<div class="mlp-score">' + esc(score) + '</div>' : '') + estadoHtml(m) + '</div>' +
    '<div class="mlp-team r"><span class="mlp-tname">' + nombre(m.visita) + '</span>' + crest(m.visita) + '</div>' +
  '</div>';
}

var TODOS = null;
async function pintarPartidos(){
  var cont = document.getElementById('mlp-matches');
  try {
    var mod = await import('./datos/proveedor.js');
    TODOS = await mod.listarPartidos();
    var lista = (TODOS || []).filter(function(m){ return m && m.local && m.visita; }).slice(0, 5);
    if (cont) cont.innerHTML = lista.length ? lista.map(matchHtml).join('') : '<div class="mlp-empty">No matches scheduled right now.</div>';
    pintarStats();   // conteos reales una vez cargados los datos
  } catch (_) {
    if (cont) cont.innerHTML = '<div class="mlp-empty">Could not load matches.</div>';
    pintarStats();
  }
}

/* ---------- Jugador destacado: ROTA cada hora, fotos oficiales CDN (NBA/MLB, fiables) ---------- */
function fotoNBA(id){ return 'https://cdn.nba.com/headshots/nba/latest/1040x760/' + id + '.png'; }
function fotoMLB(id){ return 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_360,q_auto:best/v1/people/' + id + '/headshot/67/current'; }
var DESTACADOS = [
  { nm:'Shohei Ohtani', tm:'Los Angeles Dodgers',   lb:'MLB', img: fotoMLB(660271) },
  { nm:'Aaron Judge',   tm:'New York Yankees',        lb:'MLB', img: fotoMLB(592450) },
  { nm:'LeBron James',  tm:'Los Angeles Lakers',      lb:'NBA', img: fotoNBA(2544)   },
  { nm:'Nikola Jokic',  tm:'Denver Nuggets',          lb:'NBA', img: fotoNBA(203999) },
  { nm:'Stephen Curry', tm:'Golden State Warriors',   lb:'NBA', img: fotoNBA(201939) },
  { nm:'Mike Trout',    tm:'Los Angeles Angels',      lb:'MLB', img: fotoMLB(545361) }
];
function pintarDestacado(){
  var img = document.getElementById('mlp-leader-img'); if (!img) return;
  var i = Math.floor(Date.now() / (3600*1000)) % DESTACADOS.length;   // cambia cada hora
  var p = DESTACADOS[i];
  document.getElementById('mlp-leader-nm').textContent = p.nm;
  document.getElementById('mlp-leader-tm').textContent = p.tm;
  document.getElementById('mlp-leader-lb').textContent = p.lb;
  img.onerror = function(){ img.style.display = 'none'; };
  img.src = p.img;
}

/* ---------- Key stats: CONTEOS REALES del feed (en vivo / próximos / finales / total) ---------- */
var DEPORTES = { soccer:['epl','laliga','seriea','bundes','ucl'], nba:['nba'], mlb:['mlb'], nhl:['nhl'] };
var SPORT_KEYS = ['soccer','nba','mlb','nhl'];
var ACTIVO = 'soccer';

function pintarStats(){
  var cont = document.getElementById('mlp-stats'); if (!cont) return;
  var set = function(s, v){ var el = cont.querySelector('[data-s="'+s+'"]'); if (el) el.textContent = v; };
  if (!TODOS) { set('vivo','—'); set('proximo','—'); set('final','—'); set('total','—'); return; }
  var ligas = DEPORTES[ACTIVO] || [];
  var m = TODOS.filter(function(x){ return ligas.indexOf(x.ligaId) >= 0; });
  var c = { vivo:0, proximo:0, final:0 };
  m.forEach(function(x){ if (c[x.estado] != null) c[x.estado]++; });
  set('vivo', c.vivo); set('proximo', c.proximo); set('final', c.final); set('total', m.length);
}

function tabs(){
  var T = document.querySelectorAll('.mlp-tab');
  T.forEach(function(t,i){ t.addEventListener('click', function(){
    T.forEach(function(x){ x.classList.remove('on'); }); t.classList.add('on');
    ACTIVO = SPORT_KEYS[i] || 'soccer';
    pintarStats();
  }); });
}

function botonCTA(){
  var cta = document.getElementById('mlp-cta');
  if (!cta) return;
  cta.addEventListener('click', function(){
    var b = document.getElementById('btn-register') || document.getElementById('btn-hero') || document.getElementById('btn-login');
    if (b) b.click();
  });
}

function init(){ pintarPartidos(); pintarDestacado(); tabs(); botonCTA(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* ============ Pie de página: redes sociales desde la config del panel ============ */
(async () => {
  const cont = document.querySelector('.foot-social');
  if (!cont) return;
  const META = [
    { id: 'x', nombre: 'X', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7 8 8.2 12h-6.3l-5-7-5.7 7H2l7.5-9L1.6 2h6.5l4.5 6.3z"/></svg>' },
    { id: 'instagram', nombre: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>' },
    { id: 'youtube', nombre: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.4-.4-5c-.2-.9-1-1.6-1.9-1.8C18.9 5 12 5 12 5s-6.9 0-8.7.2C2.4 5.4 1.6 6.1 1.4 7 1 8.6 1 12 1 12s0 3.4.4 5c.2.9 1 1.6 1.9 1.8C5.1 19 12 19 12 19s6.9 0 8.7-.2c.9-.2 1.7-.9 1.9-1.8.4-1.6.4-5 .4-5zM10 15V9l5 3z"/></svg>' },
    { id: 'facebook', nombre: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.7-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z"/></svg>' },
    { id: 'tiktok', nombre: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-3v13a2.5 2.5 0 11-2.5-2.5c.2 0 .4 0 .5.1V9.5a5.6 5.6 0 00-.5 0 5.5 5.5 0 105.5 5.5V8.3a7.2 7.2 0 004 1.2V6.5a4 4 0 01-4-4z"/></svg>' },
  ];
  try {
    const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const cfgFb = { apiKey: 'AIzaSyAbJ9RBm-91N4TRg02Wjv4RzsaUAO1LdsA', authDomain: 'handicappper.firebaseapp.com', projectId: 'handicappper', storageBucket: 'handicappper.firebasestorage.app', messagingSenderId: '279849310534', appId: '1:279849310534:web:94cde85a27b336b8632d47' };
    const app = getApps().length ? getApp() : initializeApp(cfgFb);
    const db = getFirestore(app);
    const snap = await getDoc(doc(db, 'config', 'contacto'));
    const redes = (snap.exists() && snap.data().redes) || null;
    if (!redes) return;   // sin config -> deja las 3 estáticas que ya están
    const html = META.filter(m => { const r = redes[m.id]; return r && r.visible && r.url; })
      .map(m => `<a href="${redes[m.id].url}" aria-label="${m.nombre}" target="_blank" rel="noopener">${m.svg}</a>`).join('');
    if (html) cont.innerHTML = html;   // solo reemplaza si hay al menos una configurada visible
  } catch (_) { /* si algo falla, se quedan las redes estáticas */ }
})();
