/**
 * toast.js — Notificaciones efímeras.
 */

import { $, crear } from '../utils/dom.js';

const root = $('#toast-root');

const ICONOS = {
  exito: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3l9-16z"/><path d="M12 10v4M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'
};

/**
 * @param {string} mensaje
 * @param {'exito'|'error'|'alerta'|'info'} tipo
 * @param {number} duracion  ms
 */
export function toast(mensaje, tipo = 'info', duracion = 3200) {
  const nodo = crear('div', { class: `toast toast--${tipo}` }, [
    crear('span', { html: ICONOS[tipo] || ICONOS.info }),
    crear('span', { class: 'grow', text: mensaje })
  ]);
  root.append(nodo);

  setTimeout(() => {
    nodo.classList.add('is-saliendo');
    setTimeout(() => nodo.remove(), 220);
  }, duracion);

  return nodo;
}
