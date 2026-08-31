/* Portada móvil (solo <=640px).
   - Partidos destacados: REALES desde el proveedor del repo (ESPN). Sin probabilidades.
   - Fotos de jugador por Wikipedia (mismo método de la app).
   - Tabs de Key stats: promedios generales de muestra (no probabilidad). */
import { listarPartidos } from './datos/proveedor.js';

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
  var score = m.marcador ? (m.marcador.local + ' – ' + m.marcador.visita) : 'vs';
  return '<div class="mlp-match">' +
    '<div class="mlp-team">' + crest(m.local) + '<span class="mlp-tname">' + nombre(m.local) + '</span></div>' +
    '<div class="mlp-mid"><div class="mlp-score">' + esc(score) + '</div>' + estadoHtml(m) + '</div>' +
    '<div class="mlp-team r"><span class="mlp-tname">' + nombre(m.visita) + '</span>' + crest(m.visita) + '</div>' +
  '</div>';
}

async function pintarPartidos(){
  var cont = document.getElementById('mlp-matches');
  if (!cont) return;
  try {
    var todos = await listarPartidos();
    var lista = (todos || []).filter(function(m){ return m && m.local && m.visita; }).slice(0, 5);
    cont.innerHTML = lista.length ? lista.map(matchHtml).join('') : '<div class="mlp-empty">No matches scheduled right now.</div>';
  } catch (_) {
    cont.innerHTML = '<div class="mlp-empty">Could not load matches.</div>';
  }
}

/* ---------- Foto de jugador (Wikipedia) ---------- */
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }
async function pintarFotos(){
  var faces = document.querySelectorAll('.mlp-face[data-name]');
  if (!faces.length) return;
  var names = []; faces.forEach(function(f){ var n=f.getAttribute('data-name'); if(names.indexOf(n)<0) names.push(n); });
  try {
    var r = await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=240&titles=' + encodeURIComponent(names.join('|')));
    var d = await r.json(); var map = {}, alias = {};
    (d.query.normalized||[]).forEach(function(n){ alias[norm(n.to)] = norm(n.from); });
    (d.query.redirects||[]).forEach(function(n){ alias[norm(n.to)] = alias[norm(n.from)] || norm(n.from); });
    Object.keys(d.query.pages||{}).forEach(function(k){ var p=d.query.pages[k]; var s=p.thumbnail&&p.thumbnail.source; if(!s) return; map[norm(p.title)]=s; if(alias[norm(p.title)]) map[alias[norm(p.title)]]=s; });
    faces.forEach(function(f){ var k=norm(f.getAttribute('data-name')); if(map[k]) f.style.backgroundImage='url("'+map[k]+'")'; });
  } catch(_){}
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

function init(){ pintarPartidos(); pintarFotos(); tabs(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
