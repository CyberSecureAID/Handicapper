/* =====================================================================
   AVISO DE COOKIES — Sports Expectations LLC (Florida)

   Escritorio: BARRA HORIZONTAL (ancha y baja) de cristal que flota sobre el
   heroe, abajo a la derecha, donde el usuario la dibujo. Icono + texto +
   botones en UNA sola fila. Mismo cristal de las paginas legales del sitio
   (navy translucido + desenfoque) para que el heroe se vea detras y no
   desentone. Filo azul/dorado/rojo, sombra fuerte (3D), esquinas redondeadas.

   Movil: franja delgada ARRIBA (el banner de instalar PWA vive abajo; asi
          nunca se tocan ni rompen la experiencia app-like).

   La galleta es una imagen propia: assets/imagenes/cookie.png (toda la foto
   es la galleta). Si aun no se ha subido, hay un respaldo dibujado.

   El sitio solo usa cookies/almacenamiento ESENCIALES (sesion de Firebase y
   preferencias). NO hay analitica ni rastreadores de publicidad.
   ===================================================================== */
import { idiomaActual } from './idioma.js';

const LS = 'se-cookies-v1';
const L = (en, es) => (idiomaActual() === 'es' ? es : en);
const COOKIE_IMG = 'assets/imagenes/cookie.png';

export function cookiesDecididas() { try { return !!localStorage.getItem(LS); } catch (_) { return false; } }
export function cookiesAceptadas() { try { return localStorage.getItem(LS) === 'accept'; } catch (_) { return false; } }
function guardar(v) { try { localStorage.setItem(LS, v); } catch (_) {} }

/* Respaldo mientras no se suba cookie.png: galleta dibujada (nunca se rompe). */
const COOKIE_FB = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="ckg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#e7b86a"/><stop offset="1" stop-color="#b9823c"/></radialGradient></defs><circle cx="12" cy="12" r="10" fill="url(#ckg)"/><circle cx="8.3" cy="9.3" r="1.35" fill="#6b4420"/><circle cx="13.2" cy="7.9" r="1.05" fill="#6b4420"/><circle cx="15.6" cy="12.8" r="1.35" fill="#6b4420"/><circle cx="9" cy="15.2" r="1.15" fill="#6b4420"/><circle cx="12.6" cy="12.1" r="1" fill="#6b4420"/></svg>';

function inyectar() {
  if (document.getElementById('ck-css')) return;
  const st = document.createElement('style'); st.id = 'ck-css';
  st.textContent = `
  /* ===== Escritorio: barra horizontal ancha y baja ===== */
  .ck-card{position:fixed;z-index:1200;right:40px;bottom:clamp(110px,calc(54vh - 210px),380px);
    width:min(720px,calc(100vw - 72px));
    display:flex;align-items:center;gap:16px;
    padding:14px 18px;border-radius:18px;
    background:linear-gradient(120deg,rgba(17,25,38,.56),rgba(8,13,21,.66));
    border:1px solid rgba(255,255,255,.10);
    box-shadow:0 30px 64px -22px rgba(0,0,0,.72),0 12px 26px -16px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08);
    backdrop-filter:blur(17px) saturate(122%);-webkit-backdrop-filter:blur(17px) saturate(122%);
    color:var(--tinta,#f2f5f8);
    opacity:0;transform:translateY(20px) scale(.985);
    transition:opacity .42s cubic-bezier(.2,.75,.2,1),transform .42s cubic-bezier(.2,.75,.2,1)}
  .ck-card.on{opacity:1;transform:none}
  .ck-card::before{content:"";position:absolute;left:0;top:13px;bottom:13px;width:4px;border-radius:0 6px 6px 0;
    background:linear-gradient(180deg,var(--azul,#1d9bf0),var(--oro,#E8B84B),var(--rojo,#e23b3f))}
  .ck-top{display:flex;align-items:center;gap:14px;flex:1;min-width:0;margin:0}
  .ck-ic{flex:none;width:48px;height:48px;display:grid;place-items:center;overflow:visible;
    background:none;border:0;box-shadow:none;border-radius:0}
  .ck-ic img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))}
  .ck-ic svg{width:40px;height:40px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))}
  .ck-htx{min-width:0;flex:1}
  .ck-ttl{font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:15.5px;
    letter-spacing:.01em;color:var(--tinta,#f2f5f8);line-height:1.15}
  .ck-sub{display:block;font-size:12px;line-height:1.4;color:var(--tinta-2,#9aa7b6);margin-top:2px}
  .ck-sub a{color:var(--oro,#E8B84B);text-decoration:none;border-bottom:1px solid rgba(232,184,75,.4);white-space:nowrap}
  .ck-sub a:hover{color:#f6dca0}
  .ck-x{display:none}
  .ck-row{flex:none;display:flex;gap:10px;align-items:center}
  .ck-b{font-family:var(--display,"Chakra Petch",sans-serif);font-weight:800;font-size:13px;
    border-radius:12px;padding:11px 18px;cursor:pointer;transition:all .16s;white-space:nowrap}
  .ck-no{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03);color:var(--tinta-2,#9aa7b6)}
  .ck-no:hover{color:var(--tinta,#f2f5f8);border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}
  .ck-yes{border:0;color:#2a1d04;background:linear-gradient(135deg,#F3CE6E,var(--oro,#E8B84B));
    box-shadow:0 10px 22px -8px rgba(232,184,75,.55),inset 0 1px 0 rgba(255,255,255,.42)}
  .ck-yes:hover{filter:brightness(1.05)}

  /* ===== Movil: franja delgada arriba (aprobada) ===== */
  @media(max-width:600px){
    .ck-card{left:11px;right:11px;top:calc(10px + env(safe-area-inset-top,0));bottom:auto;
      width:auto;flex-direction:column;align-items:stretch;gap:0;
      padding:12px 13px;border-radius:16px;transform:translateY(-16px) scale(.98)}
    .ck-card.on{transform:none}
    .ck-card::before{top:12px;bottom:12px}
    .ck-top{gap:11px;flex:none}
    .ck-ic{width:40px;height:40px}.ck-ic svg{width:34px;height:34px}
    .ck-ttl{font-size:13px}
    .ck-sub{font-size:11px}
    .ck-x{display:grid;flex:none;width:30px;height:30px;border-radius:9px;place-items:center;cursor:pointer;
      align-self:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);
      color:var(--tinta-2,#9aa7b6);font-size:19px;line-height:1}
    .ck-x:hover{color:var(--tinta,#f2f5f8);border-color:rgba(255,255,255,.3)}
    .ck-row{margin-top:11px;gap:9px}
    .ck-no{display:none}
    .ck-yes{flex:1;padding:11px;font-size:13px;border-radius:12px;text-align:center}
  }`;
  document.head.appendChild(st);
}

export function initCookies() {
  try {
    if (cookiesDecididas()) return;
    if (document.getElementById('ck-card')) return;
    inyectar();

    const politica = L('Cookie Policy', 'Politica de cookies');
    const card = document.createElement('div');
    card.className = 'ck-card'; card.id = 'ck-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', L('Cookie notice', 'Aviso de cookies'));
    card.innerHTML = `
      <div class="ck-top">
        <span class="ck-ic"><img src="${COOKIE_IMG}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${COOKIE_FB}</span></span>
        <div class="ck-htx">
          <div class="ck-ttl">${L('We value your privacy', 'Cuidamos tu privacidad')}</div>
          <div class="ck-sub">${L(
            `Essential cookies only. No advertising trackers. <a href="cookies.html" target="_blank" rel="noopener">${politica}</a>`,
            `Solo cookies esenciales. Sin rastreadores de publicidad. <a href="cookies.html" target="_blank" rel="noopener">${politica}</a>`
          )}</div>
        </div>
        <button class="ck-x" id="ck-x" type="button" aria-label="${L('Decline', 'Rechazar')}">&times;</button>
      </div>
      <div class="ck-row">
        <button class="ck-b ck-no" id="ck-no" type="button">${L('Decline', 'Rechazar')}</button>
        <button class="ck-b ck-yes" id="ck-yes" type="button">${L('Accept', 'Aceptar')}</button>
      </div>`;

    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('on'));

    const cerrar = (val) => { guardar(val); card.classList.remove('on'); setTimeout(() => card.remove(), 300); };
    card.querySelector('#ck-yes').addEventListener('click', () => cerrar('accept'));
    card.querySelector('#ck-no').addEventListener('click', () => cerrar('reject'));
    card.querySelector('#ck-x').addEventListener('click', () => cerrar('reject'));
  } catch (_) {}
}
