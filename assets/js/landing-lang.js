/* Traductor ligero para páginas secundarias (About, Features, Sports…).
   Reutiliza el MISMO diccionario compartido (idioma.js), sin cargar Firebase.
   Lee el idioma guardado, aplica [data-i18n] / [data-i18n-html] y conecta el botón #lang-toggle. */
import { t, initIdioma, fijarIdioma, idiomaActual } from './ui/idioma.js';

initIdioma();

function aplicar() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n'); const v = t(k);
    if (v && v !== k) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const k = el.getAttribute('data-i18n-html'); const v = t(k);
    if (v && v !== k) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.getAttribute('data-i18n-ph'); const v = t(k);
    if (v && v !== k) el.setAttribute('placeholder', v);
  });
  document.documentElement.setAttribute('lang', idiomaActual());
}

aplicar();

const btn = document.getElementById('lang-toggle');
if (btn) {
  const pintar = () => { btn.textContent = idiomaActual().toUpperCase(); };
  pintar();
  btn.addEventListener('click', () => {
    fijarIdioma(idiomaActual() === 'en' ? 'es' : 'en');
    aplicar(); pintar();
  });
}
