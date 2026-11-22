/* ============================================================================
   SEO: ajusta canonical y Open Graph al dominio REAL que sirve la pagina.

   Asi, cuando actives el dominio .com no hay que cambiar ningun valor en el
   codigo: estas etiquetas se adaptan solas (hoy el dominio de GitHub Pages,
   manana sportsexpectations.com). Las etiquetas estaticas del HTML quedan de
   respaldo para los rastreadores que no ejecutan JavaScript.
   ============================================================================ */
(function () {
  try {
    var origin = location.origin;
    var path = location.pathname.replace(/index\.html$/, '');
    var url = origin + path + location.search;
    var img = new URL('assets/imagenes/logo-portada.webp', document.baseURI).href;
    function set(sel, attr, val) { var el = document.querySelector(sel); if (el) el.setAttribute(attr, val); }
    set('link[rel="canonical"]', 'href', origin + path);
    set('meta[property="og:url"]', 'content', url);
    set('meta[name="twitter:url"]', 'content', url);
    set('meta[property="og:image"]', 'content', img);
    set('meta[name="twitter:image"]', 'content', img);
  } catch (e) {}
})();
