/**
 * evento.js — Alta, edición, detalle y borrado de eventos del calendario.
 */

import { abrirModal, cerrarModal, confirmar } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { esc, $$ } from '../utils/dom.js';
import { hoyISO, formatoLargo, textoRelativo } from '../utils/fecha.js';
import { TIPOS_EVENTO, ORDEN_TIPOS, etiquetaCurso } from '../config.js';
import * as store from '../services/store.js';

/* ------------------------------------------------------------
   Formulario (alta / edición)
   ------------------------------------------------------------ */

export function abrirFormularioEvento({ evento = null, fecha = hoyISO() } = {}) {
  const esEdicion = Boolean(evento);
  const materias = store.misMaterias();
  const tipoInicial = evento ? evento.tipo : 'tarea';

  const html = `
    <form id="form-evento" novalidate>
      <div class="field">
        <span class="field__label">Tipo de evento</span>
        <div class="chip-group" id="tipo-group" role="radiogroup" aria-label="Tipo de evento">
          ${ORDEN_TIPOS.map((t) => `
            <button type="button" class="chip chip--tipo" data-tipo="${t}"
                    role="radio" aria-checked="${t === tipoInicial}"
                    style="--color-punto:${TIPOS_EVENTO[t].color}">
              <span class="chip__punto"></span>${esc(TIPOS_EVENTO[t].etiqueta)}
            </button>`).join('')}
        </div>
      </div>

      <label class="field" style="margin-top:var(--sp-4)">
        <span class="field__label">Título</span>
        <input type="text" id="ev-titulo" class="field__input" maxlength="90" required
               placeholder="Ej: Examen de Matemática — Unidad 3"
               value="${esc(evento ? evento.titulo : '')}" />
      </label>

      <label class="field" id="wrap-materia" style="margin-top:var(--sp-4)">
        <span class="field__label">Materia</span>
        <select id="ev-materia" class="field__select">
          <option value="">Seleccioná una materia…</option>
          ${materias.map((m) => `<option value="${esc(m)}"${evento && evento.materia === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}
        </select>
      </label>

      <div class="field-row" style="margin-top:var(--sp-4)">
        <label class="field">
          <span class="field__label">Fecha</span>
          <input type="date" id="ev-fecha" class="field__input" required value="${esc(evento ? evento.fecha : fecha)}" />
        </label>
        <label class="field">
          <span class="field__label">Hora <span class="text-3">(opcional)</span></span>
          <input type="time" id="ev-hora" class="field__input" value="${esc(evento ? evento.hora : '')}" />
        </label>
      </div>

      <label class="field" style="margin-top:var(--sp-4)">
        <span class="field__label">Detalles <span class="text-3">(opcional)</span></span>
        <textarea id="ev-desc" class="field__textarea" maxlength="600"
                  placeholder="Temas que entran, consignas, material a llevar…">${esc(evento ? evento.descripcion : '')}</textarea>
      </label>

      <p class="field__hint" id="ev-alcance" style="margin-top:var(--sp-3)"></p>
      <p class="auth__error hidden" id="ev-error" role="alert"></p>
    </form>
  `;

  abrirModal({
    titulo: esEdicion ? 'Editar evento' : 'Nuevo evento',
    contenido: html,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      {
        texto: esEdicion ? 'Guardar cambios' : 'Crear evento',
        clase: 'btn--primary',
        cerrar: false,
        onClick: (modal) => guardarDesdeFormulario(modal, evento)
      }
    ],
    alMontar: (modal) => {
      const grupo = modal.querySelector('#tipo-group');
      const sincronizarTipo = () => {
        const tipo = grupo.querySelector('[aria-checked="true"]').dataset.tipo;
        const requiereMateria = TIPOS_EVENTO[tipo].requiereMateria;
        modal.querySelector('#wrap-materia').classList.toggle('hidden', !requiereMateria);
        modal.querySelector('#ev-alcance').textContent = requiereMateria
          ? `Visible para tu curso: ${etiquetaCurso(store.cursoActual())}.`
          : 'Los feriados y días sin clases se comparten con todos los cursos del colegio.';
      };

      grupo.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip--tipo');
        if (!chip) return;
        $$('.chip--tipo', grupo).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
        sincronizarTipo();
      });

      sincronizarTipo();
      modal.querySelector('#form-evento').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarDesdeFormulario(modal, evento);
      });
    }
  });
}

function guardarDesdeFormulario(modal, eventoExistente) {
  const tipo = modal.querySelector('#tipo-group [aria-checked="true"]').dataset.tipo;
  const titulo = modal.querySelector('#ev-titulo').value.trim();
  const materia = modal.querySelector('#ev-materia').value;
  const fecha = modal.querySelector('#ev-fecha').value;
  const hora = modal.querySelector('#ev-hora').value;
  const descripcion = modal.querySelector('#ev-desc').value;
  const error = modal.querySelector('#ev-error');

  const fallar = (msg) => {
    error.textContent = msg;
    error.classList.remove('hidden');
    return false;
  };

  if (titulo.length < 3) return fallar('El título tiene que tener al menos 3 caracteres.');
  if (!fecha) return fallar('Elegí una fecha para el evento.');
  if (TIPOS_EVENTO[tipo].requiereMateria && !materia) return fallar('Seleccioná la materia correspondiente.');

  const datos = { tipo, titulo, materia, fecha, hora, descripcion };

  if (eventoExistente) {
    store.actualizarEvento(eventoExistente.id, datos);
    toast('Evento actualizado', 'exito');
  } else {
    store.crearEvento(datos);
    toast(`${TIPOS_EVENTO[tipo].etiqueta} agregado al calendario`, 'exito');
  }
  cerrarModal();
  return true;
}

/* ------------------------------------------------------------
   Detalle
   ------------------------------------------------------------ */

export function abrirDetalleEvento(id) {
  const evento = store.obtenerEstado().eventos.find((e) => e.id === id);
  if (!evento) return;

  const tipo = TIPOS_EVENTO[evento.tipo];
  const hecho = store.estaCompletado(evento.id);
  const esMio = store.puedeEditar(evento);

  const filas = [
    ['Tipo', `<span class="badge badge--${evento.tipo}"><span class="badge__punto"></span>${esc(tipo.etiqueta)}</span>`],
    evento.materia ? ['Materia', esc(evento.materia)] : null,
    ['Fecha', `${esc(formatoLargo(evento.fecha))} <span class="text-3">· ${esc(textoRelativo(evento.fecha))}</span>`],
    evento.hora ? ['Hora', esc(evento.hora)] : null,
    ['Alcance', evento.cursoKey === '*' ? 'Todo el colegio' : esc(etiquetaCurso(evento.cursoKey))],
    ['Publicado por', esc(evento.autor ? evento.autor.nombre : '—')]
  ].filter(Boolean);

  const contenido = `
    <div class="stack">
      ${filas.map(([k, v]) => `
        <div class="detalle__fila">
          <span class="detalle__clave">${k}</span>
          <span class="detalle__valor">${v}</span>
        </div>`).join('')}
      ${evento.descripcion ? `<div class="detalle__desc">${esc(evento.descripcion)}</div>` : ''}
      ${evento.tipo !== 'feriado' ? `
        <button type="button" class="check" id="btn-check-detalle" aria-checked="${hecho}" role="checkbox">
          <span class="check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span>
          <span>${hecho ? 'Marcado como completado' : 'Marcar como completado'}</span>
        </button>` : ''}
    </div>
  `;

  const acciones = [{ texto: 'Cerrar', clase: 'btn--ghost' }];
  if (esMio) {
    acciones.unshift(
      {
        texto: 'Eliminar',
        clase: 'btn--peligro',
        cerrar: false,
        onClick: async () => {
          const ok = await confirmar({
            titulo: 'Eliminar evento',
            mensaje: `¿Seguro que querés eliminar "${evento.titulo}"? Se borra para todo el curso.`,
            textoOk: 'Eliminar',
            peligro: true
          });
          if (ok) {
            store.eliminarEvento(evento.id);
            toast('Evento eliminado', 'exito');
          }
        }
      },
      {
        texto: 'Editar',
        clase: 'btn--primary',
        cerrar: false,
        onClick: () => abrirFormularioEvento({ evento })
      }
    );
  }

  abrirModal({
    titulo: evento.titulo,
    contenido,
    acciones,
    alMontar: (modal) => {
      const check = modal.querySelector('#btn-check-detalle');
      if (!check) return;
      check.addEventListener('click', () => {
        const nuevo = store.alternarCompletado(evento.id);
        check.setAttribute('aria-checked', String(nuevo));
        check.querySelector('span:last-child').textContent = nuevo ? 'Marcado como completado' : 'Marcar como completado';
      });
    }
  });
}
