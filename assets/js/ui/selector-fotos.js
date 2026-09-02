/* ============================================================
   SELECTOR DE FOTOS — modal reutilizable (usa las clases .ca-* de app.css).
   Lo usa el panel admin para asignar/cambiar la foto de un analista.
   ============================================================ */
import { FOTOS_HOMBRE, FOTOS_MUJER, rutaFotoAnalista } from '../datos/fotos-analistas.js';
import { fotosOcupadas } from '../mesa/mesa-datos.js';

export async function abrirSelectorFotos({
  actual = null, uidAnalista = null, onGuardar,
  titulo = 'Choose a photo', sub = '',
  txtOk = 'Assign', txtCancel = 'Cancel',
  secHombres = 'Men', secMujeres = 'Women',
} = {}) {
  const ocupadas = await fotosOcupadas().catch(() => ({}));
  let sel = actual ? String(actual).toLowerCase() : null;

  const celda = (id) => {
    const dueno = ocupadas[id];
    const bloq = dueno && dueno !== uidAnalista;   // ocupada por OTRO analista
    return `<button type="button" class="ca-foto${sel === id ? ' sel' : ''}${bloq ? ' bloq' : ''}" data-foto="${id}" ${bloq ? 'disabled' : ''}>
      <img src="${rutaFotoAnalista(id)}" alt="" loading="lazy">
      ${bloq ? '<span class="ca-lock">🔒</span>' : ''}
      <span class="ca-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
    </button>`;
  };

  const ov = document.createElement('div');
  ov.className = 'ca-ov';
  ov.innerHTML = `<div class="ca-modal">
    <div class="ca-head"><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
    <div class="ca-pick">
      <div class="ca-sec-t">${secHombres}</div>
      <div class="ca-grid">${FOTOS_HOMBRE.map(celda).join('')}</div>
      <div class="ca-sec-t">${secMujeres}</div>
      <div class="ca-grid">${FOTOS_MUJER.map(celda).join('')}</div>
    </div>
    <div class="ca-foot">
      <button type="button" class="ca-cancel" data-x>${txtCancel}</button>
      <button type="button" class="ca-save" data-ok disabled>${txtOk}</button>
    </div>
    <div class="ca-err" data-err></div>
  </div>`;
  document.body.appendChild(ov);

  const btn = ov.querySelector('[data-ok]');
  const err = ov.querySelector('[data-err]');
  const cerrar = () => ov.remove();

  ov.querySelectorAll('.ca-foto').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('bloq')) return;
    ov.querySelectorAll('.ca-foto.sel').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); sel = b.dataset.foto; btn.disabled = false;
  }));
  ov.querySelector('[data-x]').addEventListener('click', cerrar);
  ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });

  btn.disabled = !sel;
  btn.addEventListener('click', async () => {
    if (!sel) return;
    btn.disabled = true; err.textContent = '';
    let ok = true;
    try { if (onGuardar) ok = await onGuardar(sel); } catch (_) { ok = false; }
    if (ok === false) { err.textContent = 'Could not assign. Try another.'; btn.disabled = false; return; }
    cerrar();
  });
}
