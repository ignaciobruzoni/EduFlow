/**
 * configuracion.js — Panel de configuración: tema, filtros de materias y cuenta.
 */

import { esc, delegar } from '../utils/dom.js';
import { abrirModal, cerrarModal, confirmar } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { TIPOS_EVENTO, ORDEN_TIPOS, etiquetaCurso } from '../config.js';
import * as store from '../services/store.js';

/**
 * @param {Object} acciones
 * @param {Function} acciones.alCambiarCurso
 * @param {Function} acciones.alCerrarSesion
 * @param {Function} acciones.alRestablecer
 */
export function abrirConfiguracion({ alCambiarCurso, alCerrarSesion, alRestablecer }) {
  const { nodo } = abrirModal({
    titulo: 'Configuración',
    ancho: true,
    contenido: plantilla(),
    acciones: [{ texto: 'Listo', clase: 'btn--primary' }],
    alMontar: (modal) => conectar(modal, { alCambiarCurso, alCerrarSesion, alRestablecer })
  });
  return nodo;
}

function plantilla() {
  const estado = store.obtenerEstado();
  const esOscuro = estado.tema === 'dark';
  const materias = store.misMaterias();
  const { materiasOcultas, tiposOcultos, mostrarFeriadosGlobales } = estado.prefs;
  const sesion = estado.sesion;

  return `
    <section class="stack">
      <h3 class="card__title">Apariencia</h3>
      <button type="button" class="switch" id="sw-tema" role="switch" aria-checked="${esOscuro}">
        <span class="stack" style="gap:0;text-align:left">
          <span style="font-weight:600">Modo oscuro</span>
          <span class="text-3 text-xs">Menos brillo para estudiar de noche</span>
        </span>
        <span class="switch__track"></span>
      </button>
      <button type="button" class="switch" id="sw-sidebar" role="switch" aria-checked="${estado.prefs.sidebarColapsada}">
        <span class="stack" style="gap:0;text-align:left">
          <span style="font-weight:600">Menú lateral compacto</span>
          <span class="text-3 text-xs">Muestra sólo los íconos en escritorio</span>
        </span>
        <span class="switch__track"></span>
      </button>
    </section>

    <hr style="border:none;border-top:1px solid var(--borde)" />

    <section class="stack">
      <h3 class="card__title">Visibilidad de eventos</h3>
      <p class="text-3 text-sm">Ocultá lo que no querés ver en el calendario y en el historial.</p>
      <div class="chip-group">
        ${ORDEN_TIPOS.map((t) => `
          <button type="button" class="chip" data-cfg-tipo="${t}" aria-pressed="${!tiposOcultos.includes(t)}"
                  style="--color-punto:${TIPOS_EVENTO[t].color}">
            <span class="chip__punto"></span>${esc(TIPOS_EVENTO[t].plural)}
          </button>`).join('')}
      </div>

      <button type="button" class="switch" id="sw-feriados" role="switch" aria-checked="${mostrarFeriadosGlobales}">
        <span class="stack" style="gap:0;text-align:left">
          <span style="font-weight:600">Feriados de todo el colegio</span>
          <span class="text-3 text-xs">Días sin clases publicados por otros cursos</span>
        </span>
        <span class="switch__track"></span>
      </button>
    </section>

    <hr style="border:none;border-top:1px solid var(--borde)" />

    <section class="stack">
      <div class="row row--between">
        <h3 class="card__title">Materias visibles</h3>
        <button type="button" class="btn btn--sm btn--ghost" id="btn-todas-materias">Mostrar todas</button>
      </div>
      <div class="stack" style="gap:0" id="lista-materias">
        ${materias.map((m) => {
          const visible = !materiasOcultas.includes(m);
          return `
            <button type="button" class="check" data-cfg-materia="${esc(m)}" role="checkbox" aria-checked="${visible}">
              <span class="check__box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span>
              <span>${esc(m)}</span>
            </button>`;
        }).join('')}
      </div>
    </section>

    <hr style="border:none;border-top:1px solid var(--borde)" />

    <section class="stack">
      <h3 class="card__title">Cuenta</h3>
      <div class="row row--between">
        <span class="stack" style="gap:0">
          <span style="font-weight:600">${esc(sesion.nombre)}</span>
          <span class="text-3 text-xs">${esc(sesion.email)}</span>
        </span>
        <span class="row" style="gap:6px">
          ${store.esModerador() ? '<span class="badge badge--moderador">Moderador</span>' : ''}
          <span class="badge badge--curso">${esc(etiquetaCurso(store.cursoActual()))}</span>
        </span>
      </div>
      ${store.esModerador() ? `
        <p class="text-3 text-xs">
          Como moderador podés eliminar publicaciones y eventos de tu curso y del canal #General,
          y ver los reportes que dejan tus compañeros.
        </p>` : ''}
      <div class="row wrap">
        <button type="button" class="btn btn--ghost" id="btn-cambiar-curso">Cambiar año / modalidad</button>
        <button type="button" class="btn btn--ghost" id="btn-cerrar-sesion">Cerrar sesión</button>
        <button type="button" class="btn btn--peligro" id="btn-reset">Restablecer datos</button>
      </div>
      <p class="text-3 text-xs">
        "Restablecer datos" borra los eventos, publicaciones y preferencias guardados en este dispositivo.
      </p>
    </section>
  `;
}

function conectar(modal, { alCambiarCurso, alCerrarSesion, alRestablecer }) {
  const swTema = modal.querySelector('#sw-tema');
  swTema.addEventListener('click', () => {
    const tema = store.alternarTema();
    swTema.setAttribute('aria-checked', String(tema === 'dark'));
  });

  const swSidebar = modal.querySelector('#sw-sidebar');
  swSidebar.addEventListener('click', () => {
    const nuevo = !store.obtenerEstado().prefs.sidebarColapsada;
    store.setPref('sidebarColapsada', nuevo);
    swSidebar.setAttribute('aria-checked', String(nuevo));
  });

  const swFeriados = modal.querySelector('#sw-feriados');
  swFeriados.addEventListener('click', () => {
    const nuevo = !store.obtenerEstado().prefs.mostrarFeriadosGlobales;
    store.setPref('mostrarFeriadosGlobales', nuevo);
    swFeriados.setAttribute('aria-checked', String(nuevo));
  });

  delegar(modal, 'click', '[data-cfg-tipo]', (e, btn) => {
    store.alternarTipoOculto(btn.dataset.cfgTipo);
    btn.setAttribute('aria-pressed', String(!store.obtenerEstado().prefs.tiposOcultos.includes(btn.dataset.cfgTipo)));
  });

  delegar(modal, 'click', '[data-cfg-materia]', (e, btn) => {
    const materia = btn.dataset.cfgMateria;
    store.alternarMateriaOculta(materia);
    btn.setAttribute('aria-checked', String(!store.obtenerEstado().prefs.materiasOcultas.includes(materia)));
  });

  modal.querySelector('#btn-todas-materias').addEventListener('click', () => {
    store.mostrarTodasLasMaterias();
    modal.querySelectorAll('[data-cfg-materia]').forEach((b) => b.setAttribute('aria-checked', 'true'));
    modal.querySelectorAll('[data-cfg-tipo]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
    toast('Se muestran todas las materias', 'exito');
  });

  modal.querySelector('#btn-cambiar-curso').addEventListener('click', () => {
    cerrarModal();
    alCambiarCurso();
  });

  modal.querySelector('#btn-cerrar-sesion').addEventListener('click', () => {
    cerrarModal();
    alCerrarSesion();
  });

  modal.querySelector('#btn-reset').addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: 'Restablecer datos',
      mensaje: 'Se borrarán todos los eventos, publicaciones y preferencias guardados en este dispositivo. ¿Continuar?',
      textoOk: 'Borrar todo',
      peligro: true
    });
    if (ok) alRestablecer();
  });
}
