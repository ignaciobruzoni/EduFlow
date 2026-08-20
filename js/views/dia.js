/**
 * dia.js — Pop-up informativo de un día del calendario.
 *
 * Al tocar una celda del calendario se abre este modal con todos los eventos
 * ya publicados para esa fecha (legible en pantallas chicas, sin tener que
 * acertarle a los títulos diminutos de la grilla) y un botón destacado para
 * crear uno nuevo con la fecha ya precargada.
 */

import { abrirModal, cerrarModal } from '../components/modal.js';
import { delegar, esc } from '../utils/dom.js';
import { formatoLargo, textoRelativo, hoyISO } from '../utils/fecha.js';
import { TIPOS_EVENTO, ORDEN_TIPOS } from '../config.js';
import * as store from '../services/store.js';
import { tarjetaEvento } from './partes.js';
import { abrirFormularioEvento, abrirDetalleEvento } from './evento.js';

export function abrirDiaModal(iso) {
  const eventos = store.eventosDeDia(iso);
  const esPasado = iso < hoyISO();

  const conteo = ORDEN_TIPOS
    .map((tipo) => ({ tipo, total: eventos.filter((e) => e.tipo === tipo).length }))
    .filter((c) => c.total > 0);

  const contenido = `
    <div class="dia-modal">
      <div class="row row--between wrap" style="gap:var(--sp-2)">
        <span class="text-sm text-2">${esc(textoRelativo(iso))}${esPasado ? ' · día pasado' : ''}</span>
        ${conteo.length ? `
          <span class="dia-modal__resumen">
            ${conteo.map((c) => `
              <span class="badge badge--${c.tipo}">
                <span class="badge__punto"></span>${c.total} ${esc(TIPOS_EVENTO[c.tipo].plural.toLowerCase())}
              </span>`).join('')}
          </span>` : ''}
      </div>

      ${eventos.length
        ? `<div class="dia-modal__lista">${eventos.map(tarjetaEvento).join('')}</div>`
        : '<p class="dia-modal__vacio">No hay eventos publicados para este día.</p>'}

      <button type="button" class="btn btn--primary dia-modal__crear" data-crear-en="${esc(iso)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        Crear nuevo evento
      </button>
    </div>
  `;

  abrirModal({
    // Primera letra en mayúscula: "Viernes 14 de agosto de 2026"
    titulo: formatoLargo(iso).replace(/^./, (c) => c.toUpperCase()),
    contenido,
    acciones: [{ texto: 'Cerrar', clase: 'btn--ghost' }],
    alMontar: (modal) => {
      delegar(modal, 'click', '[data-crear-en]', (e, btn) => {
        cerrarModal();
        abrirFormularioEvento({ fecha: btn.dataset.crearEn });
      });

      delegar(modal, 'click', '[data-completar]', (e, btn) => {
        e.stopPropagation();
        const marcado = store.alternarCompletado(btn.dataset.completar);
        btn.setAttribute('aria-checked', String(marcado));
        btn.closest('.evento').classList.toggle('esta-hecho', marcado);
        btn.style.cssText = marcado
          ? 'background:var(--acento-fuerte);border-color:var(--acento-fuerte);color:#fff'
          : '';
      });

      delegar(modal, 'click', '[data-evento]', (e, el) => {
        abrirDetalleEvento(el.dataset.evento);
      });
    }
  });
}
