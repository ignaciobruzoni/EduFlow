/**
 * onboarding.js — Configuración inicial obligatoria: año y modalidad.
 */

import { $, $$, esc, mostrar } from '../utils/dom.js';
import { ANIOS, modalidadesDeAnio, armarCursoKey, materiasDeCurso, MATERIAS_CONFIG } from '../config.js';
import * as store from '../services/store.js';
import { toast } from '../components/toast.js';

const seleccion = { anio: null, modalidad: null };

/**
 * Prepara la pantalla de onboarding.
 * @param {Function} alTerminar   Callback cuando el perfil queda guardado.
 * @param {Function} alSalir      Callback del botón secundario.
 * @param {string}   [textoSalir] Texto del botón secundario ("Cerrar sesión" / "Cancelar").
 */
export function montarOnboarding({ alTerminar, alSalir, textoSalir = 'Cerrar sesión' }) {
  const contAnios = $('#onb-anios');
  const contModalidades = $('#onb-modalidades');
  const wrapModalidad = $('#onb-modalidad-wrap');
  const hint = $('#onb-modalidad-hint');
  const preview = $('#onb-preview');
  const listaMaterias = $('#onb-materias');
  const btnGuardar = $('#btn-onb-guardar');
  const error = $('#onb-error');

  // Precarga si el alumno ya tenía un curso configurado (cambio de curso)
  const perfil = store.obtenerEstado().perfil;
  seleccion.anio = perfil ? perfil.anio : null;
  seleccion.modalidad = perfil ? perfil.modalidad : null;

  contAnios.innerHTML = ANIOS.map((a) => `
    <button type="button" class="chip" role="radio" data-anio="${a.valor}"
            aria-checked="${seleccion.anio === a.valor}">${esc(a.etiqueta)}</button>
  `).join('');

  function pintarModalidades() {
    if (!seleccion.anio) return;
    const opciones = modalidadesDeAnio(seleccion.anio);
    contModalidades.innerHTML = opciones.map((m) => `
      <button type="button" class="chip" role="radio" data-modalidad="${m.valor}"
              aria-checked="${seleccion.modalidad === m.valor}">${esc(m.etiqueta)}</button>
    `).join('');
    wrapModalidad.disabled = false;
    hint.textContent = Number(seleccion.anio) <= 3
      ? 'En el ciclo básico elegí tu división.'
      : 'En el ciclo superior elegí tu orientación.';
  }

  function pintarPreview() {
    const completo = seleccion.anio && seleccion.modalidad;
    mostrar(preview, completo);
    btnGuardar.disabled = !completo;
    if (!completo) return;

    const cursoKey = armarCursoKey(seleccion.anio, seleccion.modalidad);
    const configuradas = (MATERIAS_CONFIG[cursoKey] || []).filter((m) => m.toLowerCase() !== 'completar');
    listaMaterias.innerHTML = materiasDeCurso(cursoKey).map((m) => {
      const pendiente = !configuradas.includes(m) && m.includes('completar');
      return `<li class="${pendiente ? 'es-placeholder' : ''}">${esc(m)}</li>`;
    }).join('');
  }

  contAnios.onclick = (e) => {
    const chip = e.target.closest('[data-anio]');
    if (!chip) return;
    const previo = seleccion.anio;
    seleccion.anio = chip.dataset.anio;
    // Al cambiar de ciclo, la modalidad anterior deja de ser válida
    if (previo && Number(previo) <= 3 !== Number(seleccion.anio) <= 3) seleccion.modalidad = null;
    $$('[data-anio]', contAnios).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
    pintarModalidades();
    pintarPreview();
  };

  contModalidades.onclick = (e) => {
    const chip = e.target.closest('[data-modalidad]');
    if (!chip) return;
    seleccion.modalidad = chip.dataset.modalidad;
    $$('[data-modalidad]', contModalidades).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
    pintarPreview();
  };

  $('#form-onboarding').onsubmit = (e) => {
    e.preventDefault();
    if (!seleccion.anio || !seleccion.modalidad) {
      error.textContent = 'Elegí tu año y tu modalidad para continuar.';
      mostrar(error, true);
      return;
    }
    mostrar(error, false);
    store.guardarPerfil({ anio: seleccion.anio, modalidad: seleccion.modalidad });
    toast('¡Listo! Tu curso quedó configurado', 'exito');
    alTerminar();
  };

  const btnSalir = $('#btn-onb-salir');
  btnSalir.textContent = textoSalir;
  btnSalir.onclick = () => alSalir();

  if (seleccion.anio) pintarModalidades();
  pintarPreview();
}
