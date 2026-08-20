/**
 * partes.js — Fragmentos de interfaz compartidos entre vistas
 * (tarjeta de evento, estado vacío, insignias).
 *
 * Vive aparte para que calendario, historial y el pop-up del día usen
 * exactamente la misma tarjeta sin depender unos de otros.
 */

import { esc } from '../utils/dom.js';
import { TIPOS_EVENTO } from '../config.js';
import * as store from '../services/store.js';

/** Insignia con el color del tipo de evento. */
export function badgeTipo(tipo) {
  const config = TIPOS_EVENTO[tipo];
  if (!config) return '';
  return `<span class="badge badge--${tipo}"><span class="badge__punto"></span>${esc(config.etiqueta)}</span>`;
}

/**
 * Tarjeta de evento. La casilla de completado sólo aparece en los tipos que
 * lo admiten (hoy: Tareas / TPs), porque es una marca personal del alumno.
 */
export function tarjetaEvento(e) {
  const config = TIPOS_EVENTO[e.tipo];
  const completable = store.esCompletable(e);
  const hecho = completable && store.estaCompletado(e.id);

  return `
    <div class="evento ${config.clase}${hecho ? ' esta-hecho' : ''}">
      ${completable ? `
        <button class="check__box evento__check" data-completar="${e.id}" role="checkbox"
                aria-checked="${hecho}" aria-label="Marcar como completada"
                style="${hecho ? 'background:var(--acento-fuerte);border-color:var(--acento-fuerte);color:#fff' : ''}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
        </button>` : ''}
      <button class="evento__cuerpo" data-evento="${e.id}">
        <span class="evento__titulo">${esc(e.titulo)}</span>
        <span class="evento__meta">
          ${badgeTipo(e.tipo)}
          ${e.materia ? `<span>${esc(e.materia)}</span>` : ''}
          ${e.hora ? `<span>· ${esc(e.hora)}</span>` : ''}
        </span>
      </button>
    </div>`;
}

/** Estado vacío reutilizable. */
export function plantillaVacio(titulo, texto) {
  return `
    <div class="vacio">
      <span class="vacio__icono">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      </span>
      <p class="vacio__titulo">${esc(titulo)}</p>
      <p class="text-sm">${esc(texto)}</p>
    </div>`;
}
