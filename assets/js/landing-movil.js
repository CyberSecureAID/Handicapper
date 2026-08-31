/* Portada móvil: fotos de jugadores por NOMBRE desde Wikipedia (gratis, CORS),
   el mismo método que ya usa la app. Rellena los avatares de los enfrentamientos. */
(function () {
  function norm(s){ return String(s||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }

  function run(){
    var faces = document.querySelectorAll('.mlp-face[data-name]');
    if (!faces.length) return;
    var names = []; faces.forEach(function(f){ var n=f.getAttribute('data-name'); if(names.indexOf(n)<0) names.push(n); });

    function query(lang){
      var url='https://'+lang+'.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=240&titles='+encodeURIComponent(names.join('|'));
      return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
        var map={}; if(!d||!d.query) return map;
        var alias={};
        (d.query.normalized||[]).forEach(function(n){ alias[norm(n.to)]=norm(n.from); });
        (d.query.redirects||[]).forEach(function(n){ alias[norm(n.to)]=alias[norm(n.from)]||norm(n.from); });
        Object.keys(d.query.pages||{}).forEach(function(k){
          var p=d.query.pages[k]; var src=p.thumbnail&&p.thumbnail.source; if(!src) return;
          map[norm(p.title)]=src; if(alias[norm(p.title)]) map[alias[norm(p.title)]]=src;
        });
        return map;
      }).catch(function(){ return {}; });
    }

    query('en').then(function(map){
      faces.forEach(function(f){
        var k=norm(f.getAttribute('data-name'));
        if(map[k]){ f.style.backgroundImage='url("'+map[k]+'")'; f.classList.add('has'); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
