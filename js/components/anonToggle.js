/**
 * anonToggle.js — Selector deslizante Perfil ↔ Incógnito.
 *
 * Izquierda (por defecto): la publicación sale con el nombre y el avatar del
 * alumno. Derecha: se guarda como "Anónimo".
 */

import { delegar } from '../utils/dom.js';

const ICONO_PERFIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
const ICONO_INCOGNITO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13h18"/><path d="M6 13l1.6-5A2.2 2.2 0 0 1 9.7 6.4h4.6A2.2 2.2 0 0 1 16.4 8L18 13"/><circle cx="7.4" cy="16.6" r="2.6"/><circle cx="16.6" cy="16.6" r="2.6"/></svg>';

/**
 * Devuelve el HTML del selector.
 * @param {string} id       Identificador del control (para leerlo después).
 * @param {boolean} activo  true = arranca en incógnito.
 */
export function plantillaAnonToggle(id, activo = false) {
  return `
    <button type="button" class="anon-toggle" id="${id}" data-anon-toggle
            role="switch" aria-checked="${activo}"
            aria-label="Publicar como anónimo">
      <span class="anon-toggle__pista">
        <span class="anon-toggle__thumb"></span>
        <span class="anon-toggle__icono anon-toggle__icono--perfil">${ICONO_PERFIL}</span>
        <span class="anon-toggle__icono anon-toggle__icono--incognito">${ICONO_INCOGNITO}</span>
      </span>
      <span class="anon-toggle__texto">
        Publicás como <strong data-anon-label>${activo ? 'Anónimo' : 'tu perfil'}</strong>
      </span>
    </button>`;
}

/**
 * Activa todos los selectores que haya dentro de un contenedor.
 * Se puede llamar una sola vez por contenedor (usa delegación).
 */
export function conectarAnonToggles(contenedor) {
  delegar(contenedor, 'click', '[data-anon-toggle]', (e, btn) => {
    e.preventDefault();
    const nuevo = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(nuevo));
    const label = btn.querySelector('[data-anon-label]');
    if (label) label.textContent = nuevo ? 'Anónimo' : 'tu perfil';
  });
}

/** Lee el estado de un selector por id. */
export function esAnonimo(contenedor, id) {
  const btn = contenedor.querySelector(`#${id}`);
  return Boolean(btn && btn.getAttribute('aria-checked') === 'true');
}
