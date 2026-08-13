/**
 * modal.js — Diálogos accesibles reutilizables.
 */

import { $, crear, esc } from '../utils/dom.js';

const root = $('#modal-root');
let modalActivo = null;

/**
 * Abre un modal.
 * @param {Object} cfg
 * @param {string} cfg.titulo
 * @param {string|Node} cfg.contenido  HTML (ya escapado) o nodo.
 * @param {Array} [cfg.acciones]       [{ texto, clase, onClick, cerrar, id }]
 * @param {boolean} [cfg.ancho]
 * @param {Function} [cfg.alMontar]    Recibe el nodo del modal.
 * @returns {{ cerrar: Function, nodo: HTMLElement }}
 */
export function abrirModal({ titulo, contenido, acciones = [], ancho = false, alMontar }) {
  cerrarModal();

  const scrim = crear('div', { class: 'modal-root__scrim' });
  const modal = crear('div', {
    class: `modal${ancho ? ' modal--ancho' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': titulo
  });

  const head = crear('div', { class: 'modal__head' }, [
    crear('h2', { class: 'modal__title', text: titulo }),
    crear('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => cerrarModal() }, [
      crear('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' })
    ])
  ]);

  const body = crear('div', { class: 'modal__body' });
  if (typeof contenido === 'string') body.innerHTML = contenido;
  else if (contenido) body.append(contenido);

  modal.append(head, body);

  if (acciones.length) {
    const foot = crear('div', { class: 'modal__foot' });
    acciones.forEach((a) => {
      const btn = crear('button', {
        class: `btn ${a.clase || 'btn--ghost'}`,
        type: 'button',
        id: a.id || null,
        text: a.texto
      });
      btn.addEventListener('click', () => {
        const resultado = a.onClick ? a.onClick(modal) : true;
        if (a.cerrar !== false && resultado !== false) cerrarModal();
      });
      foot.append(btn);
    });
    modal.append(foot);
  }

  root.innerHTML = '';
  root.append(scrim, modal);
  root.hidden = false;
  document.body.style.overflow = 'hidden';

  scrim.addEventListener('click', () => cerrarModal());
  document.addEventListener('keydown', alPresionarTecla);

  modalActivo = { modal, previo: document.activeElement };
  if (alMontar) alMontar(modal);

  // Foco en el primer control interactivo
  const foco = modal.querySelector('input, select, textarea, button.btn--primary, button');
  if (foco) foco.focus();

  return { cerrar: cerrarModal, nodo: modal };
}

function alPresionarTecla(e) {
  if (e.key === 'Escape') {
    cerrarModal();
    return;
  }
  if (e.key !== 'Tab' || !modalActivo) return;
  // Ciclo de foco dentro del modal
  const focusables = modalActivo.modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const primero = focusables[0];
  const ultimo = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault();
    primero.focus();
  }
}

export function cerrarModal() {
  if (!modalActivo) return;
  document.removeEventListener('keydown', alPresionarTecla);
  root.innerHTML = '';
  root.hidden = true;
  document.body.style.overflow = '';
  if (modalActivo.previo && modalActivo.previo.focus) modalActivo.previo.focus();
  modalActivo = null;
}

/** Diálogo de confirmación. Devuelve una promesa con true/false. */
export function confirmar({ titulo = '¿Confirmás?', mensaje = '', textoOk = 'Confirmar', peligro = false }) {
  return new Promise((resolve) => {
    abrirModal({
      titulo,
      contenido: `<p class="text-2">${esc(mensaje)}</p>`,
      acciones: [
        { texto: 'Cancelar', clase: 'btn--ghost', onClick: () => resolve(false) },
        { texto: textoOk, clase: peligro ? 'btn--peligro' : 'btn--primary', onClick: () => resolve(true) }
      ]
    });
  });
}
