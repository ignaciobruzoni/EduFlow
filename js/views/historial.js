/**
 * historial.js — Registro de eventos pasados, estadísticas y exportación.
 */

import { esc, delegar } from '../utils/dom.js';
import { hoyISO, sumarDias, claveMes, MESES, formatoMedio } from '../utils/fecha.js';
import { TIPOS_EVENTO, ORDEN_TIPOS } from '../config.js';
import * as store from '../services/store.js';
import { abrirDetalleEvento } from './evento.js';
import { tarjetaEvento, plantillaVacio } from './calendario.js';
import { toast } from '../components/toast.js';

const filtros = { tipo: 'todos', materia: 'todas', periodo: '90', busqueda: '' };
let listo = false;

export function renderHistorial(contenedor) {
  const pasados = store.eventosPasados(store.eventosDelCurso());
  const filtrados = aplicarFiltros(pasados);

  contenedor.innerHTML = `
    ${plantillaStats(pasados)}
    ${plantillaFiltros()}
    <div class="hist-layout">
      <div class="card">
        <div class="card__head">
          <div>
            <h2 class="card__title">Línea de tiempo</h2>
            <p class="card__sub">${filtrados.length} evento${filtrados.length === 1 ? '' : 's'} en el período seleccionado</p>
          </div>
          <button class="btn btn--sm btn--ghost" data-accion="exportar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>
            Exportar CSV
          </button>
        </div>
        ${filtrados.length ? plantillaTimeline(filtrados) : plantillaVacio('Sin registros', 'Todavía no hay eventos pasados que coincidan con los filtros.')}
      </div>
      <div class="rail">
        ${plantillaPorMateria(pasados)}
        ${plantillaResumenTipos(pasados)}
      </div>
    </div>
  `;

  if (!listo) {
    conectarEventos(contenedor);
    listo = true;
  }
}

/* ------------------------------------------------------------
   Estadísticas
   ------------------------------------------------------------ */

function plantillaStats(pasados) {
  const examenes = pasados.filter((e) => e.tipo === 'examen');
  const tareas = pasados.filter((e) => e.tipo === 'tarea');
  const pendientes = [...examenes, ...tareas];
  const hechos = pendientes.filter((e) => store.estaCompletado(e.id)).length;
  const pct = pendientes.length ? Math.round((hechos / pendientes.length) * 100) : 0;

  return `
    <div class="hist-stats">
      <div class="stat stat--examen">
        <span class="stat__valor">${examenes.length}</span>
        <span class="stat__label">Exámenes rendidos</span>
      </div>
      <div class="stat stat--tarea">
        <span class="stat__valor">${tareas.length}</span>
        <span class="stat__label">Tareas y TPs</span>
      </div>
      <div class="stat stat--feriado">
        <span class="stat__valor">${pasados.filter((e) => e.tipo === 'feriado').length}</span>
        <span class="stat__label">Días sin clases</span>
      </div>
      <div class="stat stat--acento">
        <span class="stat__valor">${pct}%</span>
        <span class="stat__label">Cumplimiento</span>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   Filtros
   ------------------------------------------------------------ */

function plantillaFiltros() {
  const materias = store.misMaterias();
  return `
    <div class="toolbar">
      <div class="toolbar__group filtros">
        <span class="filtros__label">Tipo</span>
        <button class="chip" data-f-tipo="todos" aria-pressed="${filtros.tipo === 'todos'}">Todos</button>
        ${ORDEN_TIPOS.map((t) => `
          <button class="chip" data-f-tipo="${t}" aria-pressed="${filtros.tipo === t}"
                  style="--color-punto:${TIPOS_EVENTO[t].color}">
            <span class="chip__punto"></span>${esc(TIPOS_EVENTO[t].plural)}
          </button>`).join('')}
      </div>
      <div class="toolbar__group">
        <select class="field__select" id="f-materia" style="width:auto" aria-label="Filtrar por materia">
          <option value="todas">Todas las materias</option>
          ${materias.map((m) => `<option value="${esc(m)}"${filtros.materia === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}
        </select>
        <select class="field__select" id="f-periodo" style="width:auto" aria-label="Filtrar por período">
          ${[['30', 'Último mes'], ['90', 'Últimos 3 meses'], ['180', 'Últimos 6 meses'], ['todo', 'Todo el historial']]
            .map(([v, l]) => `<option value="${v}"${filtros.periodo === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select>
        <input type="search" id="f-busqueda" class="field__input" style="width:auto;min-width:180px"
               placeholder="Buscar…" value="${esc(filtros.busqueda)}" aria-label="Buscar en el historial" />
      </div>
    </div>
  `;
}

function aplicarFiltros(lista) {
  const desde = filtros.periodo === 'todo' ? '0000-00-00' : sumarDias(hoyISO(), -Number(filtros.periodo));
  const q = filtros.busqueda.trim().toLowerCase();
  return lista.filter((e) => {
    if (e.fecha < desde) return false;
    if (filtros.tipo !== 'todos' && e.tipo !== filtros.tipo) return false;
    if (filtros.materia !== 'todas' && e.materia !== filtros.materia) return false;
    if (q && !(`${e.titulo} ${e.materia || ''} ${e.descripcion || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

/* ------------------------------------------------------------
   Línea de tiempo
   ------------------------------------------------------------ */

function plantillaTimeline(eventos) {
  const grupos = new Map();
  eventos.forEach((e) => {
    const clave = claveMes(e.fecha);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(e);
  });

  return `
    <div class="timeline">
      ${[...grupos.entries()].map(([clave, items]) => {
        const [anio, mes] = clave.split('-');
        return `
          <section class="timeline__mes">
            <h3 class="timeline__titulo">${esc(MESES[Number(mes) - 1])} ${esc(anio)}</h3>
            <div class="timeline__items">
              ${items.map((e) => `
                <div class="timeline__fila ${TIPOS_EVENTO[e.tipo].clase}">
                  <span class="timeline__punto" style="top:18px"></span>
                  ${tarjetaEvento(e)}
                </div>`).join('')}
            </div>
          </section>`;
      }).join('')}
    </div>
  `;
}

/* ------------------------------------------------------------
   Panel lateral
   ------------------------------------------------------------ */

function plantillaPorMateria(pasados) {
  const porMateria = new Map();
  pasados.filter((e) => e.materia).forEach((e) => {
    const actual = porMateria.get(e.materia) || { total: 0, hechos: 0, examenes: 0 };
    actual.total += 1;
    if (store.estaCompletado(e.id)) actual.hechos += 1;
    if (e.tipo === 'examen') actual.examenes += 1;
    porMateria.set(e.materia, actual);
  });

  const filas = [...porMateria.entries()].sort((a, b) => b[1].total - a[1].total);

  return `
    <div class="card">
      <div class="card__head"><h2 class="card__title">Por materia</h2></div>
      ${filas.length ? filas.map(([materia, d]) => {
        const pct = d.total ? Math.round((d.hechos / d.total) * 100) : 0;
        return `
          <div class="materia-stat">
            <div class="materia-stat__head">
              <span class="materia-stat__nombre">${esc(materia)}</span>
              <span class="materia-stat__valor">${d.hechos}/${d.total} · ${pct}%</span>
            </div>
            <div class="progreso"><div class="progreso__barra" style="width:${pct}%"></div></div>
          </div>`;
      }).join('') : '<p class="text-3 text-sm">Todavía no hay actividad registrada.</p>'}
    </div>
  `;
}

function plantillaResumenTipos(pasados) {
  return `
    <div class="card">
      <div class="card__head"><h2 class="card__title">Resumen</h2></div>
      <div class="stack">
        ${ORDEN_TIPOS.map((t) => {
          const total = pasados.filter((e) => e.tipo === t).length;
          return `
            <div class="row row--between">
              <span class="badge badge--${t}"><span class="badge__punto"></span>${esc(TIPOS_EVENTO[t].plural)}</span>
              <strong>${total}</strong>
            </div>`;
        }).join('')}
        <div class="row row--between" style="padding-top:var(--sp-2);border-top:1px solid var(--borde)">
          <span class="text-2 text-sm">Total histórico</span>
          <strong>${pasados.length}</strong>
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   Interacción
   ------------------------------------------------------------ */

function conectarEventos(contenedor) {
  delegar(contenedor, 'click', '[data-f-tipo]', (e, btn) => {
    filtros.tipo = btn.dataset.fTipo;
    renderHistorial(contenedor);
  });

  delegar(contenedor, 'click', '[data-evento]', (e, el) => {
    abrirDetalleEvento(el.dataset.evento);
  });

  delegar(contenedor, 'click', '[data-completar]', (e, btn) => {
    e.stopPropagation();
    store.alternarCompletado(btn.dataset.completar);
  });

  delegar(contenedor, 'click', '[data-accion="exportar"]', () => {
    exportarCSV(aplicarFiltros(store.eventosPasados(store.eventosDelCurso())));
  });

  contenedor.addEventListener('change', (e) => {
    if (e.target.id === 'f-materia') filtros.materia = e.target.value;
    else if (e.target.id === 'f-periodo') filtros.periodo = e.target.value;
    else return;
    renderHistorial(contenedor);
  });

  let debounce;
  contenedor.addEventListener('input', (e) => {
    if (e.target.id !== 'f-busqueda') return;
    clearTimeout(debounce);
    const valor = e.target.value;
    debounce = setTimeout(() => {
      filtros.busqueda = valor;
      renderHistorial(contenedor);
      const input = contenedor.querySelector('#f-busqueda');
      if (input) { input.focus(); input.setSelectionRange(valor.length, valor.length); }
    }, 260);
  });
}

/** Descarga el historial filtrado como CSV (Excel / Sheets). */
function exportarCSV(eventos) {
  if (!eventos.length) {
    toast('No hay eventos para exportar', 'alerta');
    return;
  }
  const encabezado = ['Fecha', 'Tipo', 'Materia', 'Título', 'Hora', 'Completado', 'Detalles'];
  const filas = eventos.map((e) => [
    formatoMedio(e.fecha),
    TIPOS_EVENTO[e.tipo].etiqueta,
    e.materia || '',
    e.titulo,
    e.hora || '',
    e.tipo === 'feriado' ? '' : (store.estaCompletado(e.id) ? 'Sí' : 'No'),
    (e.descripcion || '').replace(/\s+/g, ' ')
  ]);

  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial-eduflow-${hoyISO()}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Historial exportado', 'exito');
}
