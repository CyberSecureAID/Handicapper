/* Portada móvil (solo <=640px).
   - Partidos destacados: REALES desde el proveedor del repo (ESPN). Sin probabilidades.
   - Jugador destacado: rota cada 6h con fotos oficiales (CDN NBA/MLB).
   - Tabs de Key stats: promedios generales de muestra (no probabilidad). */

/* ---------- Partidos reales ---------- */
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function hora(iso){ try { return new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); } catch(_){ return ''; } }

function estadoHtml(m){
  if (m.estado === 'vivo')   return '<span class="mlp-live vivo">LIVE</span>';
  if (m.estado === 'final')  return '<span class="mlp-live fin">FINAL</span>';
  return '<span class="mlp-live q">' + esc(hora(m.cuando)) + '</span>';
}
function crest(eq){
  var logo = eq && eq.logo ? eq.logo : '';
  return logo ? '<img class="mlp-crest" src="' + esc(logo) + '" alt="" loading="lazy">' : '<span class="mlp-crest ph"></span>';
}
function nombre(eq){ return esc((eq && (eq.abrev || eq.nombre)) || ''); }

function matchHtml(m){
  var score = m.marcador ? (m.marcador.local + ' – ' + m.marcador.visita) : '';
  return '<div class="mlp-match">' +
    '<div class="mlp-team">' + crest(m.local) + '<span class="mlp-tname">' + nombre(m.local) + '</span></div>' +
    '<div class="mlp-mid"><img class="mlp-vsico" src="assets/imagenes/vs.png" alt="vs">' +
      (score ? '<div class="mlp-score">' + esc(score) + '</div>' : '') + estadoHtml(m) + '</div>' +
    '<div class="mlp-team r"><span class="mlp-tname">' + nombre(m.visita) + '</span>' + crest(m.visita) + '</div>' +
  '</div>';
}

async function pintarPartidos(){
  var cont = document.getElementById('mlp-matches');
  if (!cont) return;
  try {
    var mod = await import('./datos/proveedor.js');
    var todos = await mod.listarPartidos();
    var lista = (todos || []).filter(function(m){ return m && m.local && m.visita; }).slice(0, 5);
    cont.innerHTML = lista.length ? lista.map(matchHtml).join('') : '<div class="mlp-empty">No matches scheduled right now.</div>';
  } catch (_) {
    cont.innerHTML = '<div class="mlp-empty">Could not load matches.</div>';
  }
}

/* ---------- Jugador destacado: ROTA cada 6h, fotos oficiales (CDN NBA/MLB) ---------- */
function fotoNBA(id){ return 'https://cdn.nba.com/headshots/nba/latest/1040x760/' + id + '.png'; }
function fotoMLB(id){ return 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_360,q_auto:best/v1/people/' + id + '/headshot/67/current'; }
var DESTACADOS = [
  { nm:'Shohei Ohtani',  tm:'Los Angeles Dodgers',   lb:'MLB', img: fotoMLB(660271) },
  { nm:'Aaron Judge',    tm:'New York Yankees',       lb:'MLB', img: fotoMLB(592450) },
  { nm:'LeBron James',   tm:'Los Angeles Lakers',     lb:'NBA', img: fotoNBA(2544)   },
  { nm:'Stephen Curry',  tm:'Golden State Warriors',  lb:'NBA', img: fotoNBA(201939) },
  { nm:'Nikola Jokic',   tm:'Denver Nuggets',         lb:'NBA', img: fotoNBA(203999) },
  { nm:'Mike Trout',     tm:'Los Angeles Angels',     lb:'MLB', img: fotoMLB(545361) }
];
function pintarDestacado(){
  var img = document.getElementById('mlp-leader-img'); if (!img) return;
  var i = Math.floor(Date.now() / (6*3600*1000)) % DESTACADOS.length;   // cambia cada 6 horas
  var p = DESTACADOS[i];
  document.getElementById('mlp-leader-nm').textContent = p.nm;
  document.getElementById('mlp-leader-tm').textContent = p.tm;
  document.getElementById('mlp-leader-lb').textContent = p.lb;
  img.onerror = function(){ img.style.display='none'; };
  img.src = p.img;
}

/* ---------- Tabs de Key stats (promedios generales de muestra) ---------- */
function tabs(){
  var keys = ['soccer','nba','mlb','nhl'];
  var data = {
    soccer: [['Goals','2.45','Avg per match'],['Possession','58%','Avg per match'],['Shots','12.7','Avg per match'],['Passes','87%','Avg accuracy']],
    nba:    [['Points','112.4','Avg per game'],['FG %','47.2%','Field goals'],['Rebounds','44.1','Avg per game'],['Assists','25.3','Avg per game']],
    mlb:    [['Runs','4.6','Avg per game'],['AVG','.258','Batting'],['Hits','8.7','Avg per game'],['ERA','3.92','Earned runs']],
    nhl:    [['Goals','3.1','Avg per game'],['Shots','31.4','Avg per game'],['Save %','90.8%','Goaltending'],['Power play','21%','Conversion']]
  };
  var T = document.querySelectorAll('.mlp-tab'), C = document.querySelectorAll('.mlp-stat');
  T.forEach(function(t,i){ t.addEventListener('click', function(){
    T.forEach(function(x){x.classList.remove('on');}); t.classList.add('on');
    var d = data[keys[i]] || data.soccer;
    C.forEach(function(c,j){ if(!d[j]) return; c.querySelector('.k').textContent=d[j][0]; c.querySelector('.v').textContent=d[j][1]; c.querySelector('.d').textContent=d[j][2]; });
  }); });
}

function init(){ pintarPartidos(); pintarDestacado(); tabs(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
