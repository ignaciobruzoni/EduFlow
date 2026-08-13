/**
 * foro.js — Foro de consultas y coordinación entre cursos.
 */

import { esc, delegar, avatarPorDefecto } from '../utils/dom.js';
import { haceCuanto } from '../utils/fecha.js';
import { CURSOS, CANAL_GENERAL, etiquetaCurso, etiquetaCursoCorta } from '../config.js';
import * as store from '../services/store.js';
import { abrirModal, cerrarModal, confirmar } from '../components/modal.js';
import { toast } from '../components/toast.js';

let canalActivo = CANAL_GENERAL;
const abiertos = new Set(); // hilos con respuestas desplegadas
let listo = false;

export function renderForo(contenedor) {
  const miCurso = store.cursoActual();
  const hilos = store.hilosDeCanal(canalActivo);
  const puedePublicar = canalActivo === CANAL_GENERAL || canalActivo === miCurso;

  contenedor.innerHTML = `
    <div class="foro-layout">
      <nav class="canales" aria-label="Canales del foro">
        <p class="canales__titulo">Canales</p>
        ${canalBtn(CANAL_GENERAL, 'General', false)}
        ${miCurso ? canalBtn(miCurso, etiquetaCursoCorta(miCurso), true) : ''}
        <p class="canales__titulo">Otros cursos</p>
        ${CURSOS.filter((c) => c !== miCurso).map((c) => canalBtn(c, etiquetaCursoCorta(c), false)).join('')}
      </nav>

      <div>
        ${plantillaComposer(puedePublicar)}
        <div class="hilos">
          ${hilos.length
            ? hilos.map((h) => plantillaHilo(h, puedePublicar)).join('')
            : `<div class="card">${plantillaVacioForo(puedePublicar)}</div>`}
        </div>
      </div>
    </div>
  `;

  if (!listo) {
    conectarEventos(contenedor);
    listo = true;
  }
  store.marcarForoVisitado();
}

function canalBtn(id, etiqueta, esPropio) {
  const cantidad = store.hilosDeCanal(id).length;
  return `
    <button class="canal${id === canalActivo ? ' is-active' : ''}${esPropio ? ' canal--propio' : ''}" data-canal="${esc(id)}">
      <span class="canal__hash">#</span>
      <span class="canal__nombre">${esc(etiqueta)}</span>
      <span class="canal__cuenta">${cantidad}</span>
    </button>`;
}

function plantillaComposer(puedePublicar) {
  const s = store.obtenerEstado().sesion;
  if (!puedePublicar) {
    return `
      <div class="composer">
        <span class="text-sm text-3" style="padding:var(--sp-2)">
          Estás viendo el canal de otro curso. Podés leer y responder, pero las publicaciones nuevas van en
          <strong>#General</strong> o en el canal de tu curso.
        </span>
      </div>`;
  }
  return `
    <div class="composer">
      <img class="composer__avatar" src="${esc(s.foto || avatarPorDefecto(s.nombre, s.email))}" alt="" />
      <button class="composer__fake" data-accion="nuevo-hilo">¿Qué querés compartir con el curso?</button>
      <button class="btn btn--primary btn--sm" data-accion="nuevo-hilo">Publicar</button>
    </div>`;
}

function plantillaVacioForo(puedePublicar) {
  return `
    <div class="vacio">
      <span class="vacio__icono">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg>
      </span>
      <p class="vacio__titulo">Todavía no hay publicaciones</p>
      <p class="text-sm">${puedePublicar ? 'Sé el primero en escribir en este canal.' : 'Este curso todavía no publicó nada.'}</p>
    </div>`;
}

function plantillaHilo(h) {
  const email = store.obtenerEstado().sesion.email;
  const meGusta = h.likes.includes(email);
  const esMio = h.autor.email === email;
  const abierto = abiertos.has(h.id);

  return `
    <article class="hilo" data-hilo="${h.id}">
      <header class="hilo__head">
        <img class="hilo__avatar" src="${esc(h.autor.foto || avatarPorDefecto(h.autor.nombre, h.autor.email))}" alt="" />
        <div class="grow">
          <p class="hilo__autor">${esc(h.autor.nombre)}</p>
          <p class="hilo__meta">
            ${h.autor.curso ? `<span class="badge badge--curso">${esc(etiquetaCursoCorta(h.autor.curso))}</span>` : ''}
            <span>${esc(haceCuanto(h.creadoEn))}</span>
            ${h.materia ? `<span>· ${esc(h.materia)}</span>` : ''}
          </p>
        </div>
        ${esMio ? `
          <button class="icon-btn icon-btn--sm" data-borrar-hilo="${h.id}" aria-label="Eliminar publicación">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
          </button>` : ''}
      </header>

      <h3 class="hilo__titulo">${esc(h.titulo)}</h3>
      ${h.cuerpo ? `<p class="hilo__cuerpo">${esc(h.cuerpo)}</p>` : ''}

      <div class="hilo__acciones">
        <button class="accion${meGusta ? ' is-active' : ''}" data-like="${h.id}" aria-pressed="${meGusta}">
          <svg viewBox="0 0 24 24" aria-hidden="true" ${meGusta ? 'fill="currentColor"' : ''}><path d="M12 20s-7-4.5-9-8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 5.5C19 15.5 12 20 12 20z"/></svg>
          ${h.likes.length || ''} Me sirve
        </button>
        <button class="accion${abierto ? ' is-active' : ''}" data-toggle-resp="${h.id}" aria-expanded="${abierto}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg>
          ${h.respuestas.length} respuesta${h.respuestas.length === 1 ? '' : 's'}
        </button>
      </div>

      ${abierto ? `
        <div class="respuestas">
          ${h.respuestas.map((r) => plantillaRespuesta(h.id, r, r.autor.email === email)).join('')}
          <form class="responder" data-form-resp="${h.id}">
            <input type="text" class="field__input responder__input" name="texto" maxlength="400"
                   placeholder="Escribí una respuesta…" aria-label="Respuesta" />
            <button type="submit" class="btn btn--primary btn--sm">Responder</button>
          </form>
        </div>` : ''}
    </article>
  `;
}

function plantillaRespuesta(hiloId, r, esMia) {
  return `
    <div class="respuesta">
      <img class="respuesta__avatar" src="${esc(r.autor.foto || avatarPorDefecto(r.autor.nombre, r.autor.email))}" alt="" />
      <div class="respuesta__burbuja">
        <div class="row row--between">
          <span class="respuesta__autor">${esc(r.autor.nombre)}
            ${r.autor.curso ? `<span class="text-3" style="font-weight:500"> · ${esc(etiquetaCursoCorta(r.autor.curso))}</span>` : ''}
          </span>
          <span class="row" style="gap:6px">
            <span class="respuesta__fecha">${esc(haceCuanto(r.creadoEn))}</span>
            ${esMia ? `<button class="icon-btn icon-btn--sm" data-borrar-resp="${r.id}" data-hilo-padre="${hiloId}" aria-label="Eliminar respuesta">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>` : ''}
          </span>
        </div>
        <p class="respuesta__texto">${esc(r.texto)}</p>
      </div>
    </div>`;
}

/* ------------------------------------------------------------
   Nuevo hilo
   ------------------------------------------------------------ */

function abrirFormularioHilo() {
  const miCurso = store.cursoActual();
  const materias = store.misMaterias();
  const destino = canalActivo === CANAL_GENERAL ? CANAL_GENERAL : miCurso;

  abrirModal({
    titulo: 'Nueva publicación',
    contenido: `
      <form id="form-hilo" novalidate class="stack">
        <label class="field">
          <span class="field__label">Canal</span>
          <select id="hilo-canal" class="field__select">
            <option value="${CANAL_GENERAL}"${destino === CANAL_GENERAL ? ' selected' : ''}>#General · todos los cursos</option>
            ${miCurso ? `<option value="${esc(miCurso)}"${destino === miCurso ? ' selected' : ''}>#${esc(etiquetaCurso(miCurso))} · sólo tu curso</option>` : ''}
          </select>
        </label>
        <label class="field">
          <span class="field__label">Título</span>
          <input type="text" id="hilo-titulo" class="field__input" maxlength="120" required placeholder="Ej: ¿Qué entra en el examen de Historia?" />
        </label>
        <label class="field">
          <span class="field__label">Mensaje</span>
          <textarea id="hilo-cuerpo" class="field__textarea" maxlength="1200" placeholder="Contá tu consulta o aviso con el mayor detalle posible…"></textarea>
        </label>
        <label class="field">
          <span class="field__label">Materia <span class="text-3">(opcional)</span></span>
          <select id="hilo-materia" class="field__select">
            <option value="">Sin materia específica</option>
            ${materias.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
          </select>
        </label>
        <p class="auth__error hidden" id="hilo-error" role="alert"></p>
      </form>
    `,
    acciones: [
      { texto: 'Cancelar', clase: 'btn--ghost' },
      { texto: 'Publicar', clase: 'btn--primary', cerrar: false, onClick: (modal) => guardarHilo(modal) }
    ],
    alMontar: (modal) => {
      modal.querySelector('#form-hilo').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarHilo(modal);
      });
    }
  });
}

function guardarHilo(modal) {
  const titulo = modal.querySelector('#hilo-titulo').value.trim();
  const cuerpo = modal.querySelector('#hilo-cuerpo').value.trim();
  const canal = modal.querySelector('#hilo-canal').value;
  const materia = modal.querySelector('#hilo-materia').value;
  const error = modal.querySelector('#hilo-error');

  if (titulo.length < 4) {
    error.textContent = 'El título tiene que tener al menos 4 caracteres.';
    error.classList.remove('hidden');
    return false;
  }

  store.crearHilo({ canal, titulo, cuerpo, materia });
  canalActivo = canal;
  cerrarModal();
  toast('Publicación creada', 'exito');
  return true;
}

/* ------------------------------------------------------------
   Interacción
   ------------------------------------------------------------ */

function conectarEventos(contenedor) {
  delegar(contenedor, 'click', '[data-canal]', (e, btn) => {
    canalActivo = btn.dataset.canal;
    renderForo(contenedor);
  });

  delegar(contenedor, 'click', '[data-accion="nuevo-hilo"]', () => abrirFormularioHilo());

  delegar(contenedor, 'click', '[data-like]', (e, btn) => store.alternarLike(btn.dataset.like));

  delegar(contenedor, 'click', '[data-toggle-resp]', (e, btn) => {
    const id = btn.dataset.toggleResp;
    abiertos.has(id) ? abiertos.delete(id) : abiertos.add(id);
    renderForo(contenedor);
    const form = contenedor.querySelector(`[data-form-resp="${id}"] input`);
    if (form) form.focus();
  });

  delegar(contenedor, 'click', '[data-borrar-hilo]', async (e, btn) => {
    const ok = await confirmar({
      titulo: 'Eliminar publicación',
      mensaje: 'Se borrará junto con todas sus respuestas. Esta acción no se puede deshacer.',
      textoOk: 'Eliminar',
      peligro: true
    });
    if (ok) {
      store.eliminarHilo(btn.dataset.borrarHilo);
      toast('Publicación eliminada', 'exito');
    }
  });

  delegar(contenedor, 'click', '[data-borrar-resp]', (e, btn) => {
    store.eliminarRespuesta(btn.dataset.hiloPadre, btn.dataset.borrarResp);
  });

  contenedor.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form-resp]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input[name="texto"]');
    const texto = input.value.trim();
    if (!texto) return;
    abiertos.add(form.dataset.formResp);
    store.responderHilo(form.dataset.formResp, texto);
    input.value = '';
  });
}

/** Permite que otras vistas abran el foro en un canal puntual. */
export function irACanal(canal) {
  canalActivo = canal;
}
