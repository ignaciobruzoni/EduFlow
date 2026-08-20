/**
 * calendario.js — Vista de calendario mensual / semanal + productividad semanal.
 *
 * La grilla arranca en domingo (columna 1) y termina en sábado (columna 7).
 * Tocar cualquier celda abre el pop-up del día (ver `dia.js`).
 */

import { esc, delegar } from '../utils/dom.js';
import {
  hoyISO, aFecha, aISO, sumarDias, diasDeMes, diasDeSemana, nombreMes,
  formatoCorto, textoRelativo, inicioSemana, finSemana, diffDias, DIAS_CORTOS, formatoMedio
} from '../utils/fecha.js';
import { TIPOS_EVENTO, ORDEN_TIPOS } from '../config.js';
import * as store from '../services/store.js';
import { abrirFormularioEvento, abrirDetalleEvento } from './evento.js';
import { tarjetaEvento, plantillaVacio } from './partes.js';
import { abrirDiaModal } from './dia.js';

/** Fecha de referencia de la vista (define el mes/semana mostrada). */
let refISO = hoyISO();
let listo = false;

export function renderCalendario(contenedor) {
  const prefs = store.obtenerEstado().prefs;
  const modo = prefs.vistaCalendario === 'semana' ? 'semana' : 'mes';
  const eventos = store.eventosVisibles();

  contenedor.innerHTML = `
    ${plantillaToolbar(modo)}
    <div class="cal-layout">
      <div class="card" style="padding:var(--sp-3)">
        ${modo === 'mes' ? plantillaMes(eventos) : plantillaSemana(eventos)}
      </div>
      <div class="rail">
        ${plantillaProductividad(eventos)}
        ${plantillaProximos(eventos)}
        ${plantillaLeyenda()}
      </div>
    </div>
  `;

  if (!listo) {
    conectarEventos(contenedor);
    listo = true;
  }
}

/* ------------------------------------------------------------
   Barra superior
   ------------------------------------------------------------ */

function plantillaToolbar(modo) {
  const f = aFecha(refISO);
  const titulo = modo === 'mes'
    ? nombreMes(f.getFullYear(), f.getMonth())
    : `${formatoCorto(inicioSemana(refISO))} — ${formatoCorto(finSemana(refISO))}`;
  const tiposOcultos = store.obtenerEstado().prefs.tiposOcultos;

  return `
    <div class="toolbar">
      <div class="toolbar__group">
        <div class="cal-nav">
          <button class="icon-btn" data-accion="anterior" aria-label="Anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
          </button>
          <button class="icon-btn" data-accion="siguiente" aria-label="Siguiente">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
          </button>
          <span class="cal-nav__mes">${esc(titulo)}</span>
          <button class="btn btn--sm btn--ghost" data-accion="hoy">Hoy</button>
        </div>
      </div>

      <div class="toolbar__group">
        <div class="segmented" role="tablist" aria-label="Modo de vista">
          <button class="segmented__btn ${modo === 'mes' ? 'is-active' : ''}" data-modo="mes" role="tab" aria-selected="${modo === 'mes'}">Mes</button>
          <button class="segmented__btn ${modo === 'semana' ? 'is-active' : ''}" data-modo="semana" role="tab" aria-selected="${modo === 'semana'}">Semana</button>
        </div>

        <div class="filtros">
          ${ORDEN_TIPOS.map((t) => `
            <button class="chip" data-filtro-tipo="${t}" aria-pressed="${!tiposOcultos.includes(t)}"
                    style="--color-punto:${TIPOS_EVENTO[t].color}" title="Mostrar/ocultar ${esc(TIPOS_EVENTO[t].plural)}">
              <span class="chip__punto"></span>${esc(TIPOS_EVENTO[t].plural)}
            </button>`).join('')}
        </div>

        <button class="btn btn--primary" data-accion="nuevo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo evento
        </button>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   Grilla mensual
   ------------------------------------------------------------ */

function plantillaMes(eventos) {
  const f = aFecha(refISO);
  const dias = diasDeMes(f.getFullYear(), f.getMonth());
  const hoy = hoyISO();

  const celdas = dias.map((d) => {
    const delDia = store.eventosDeDia(d.iso, eventos);
    const hayFeriado = delDia.some((e) => e.tipo === 'feriado');
    const visibles = delDia.slice(0, 3);
    const resto = delDia.length - visibles.length;

    const clases = [
      'cal-dia',
      d.enMes ? '' : 'es-otro-mes',
      d.iso === hoy ? 'es-hoy' : '',
      d.pasado ? 'es-pasado' : '',
      hayFeriado ? 'es-feriado' : '',
      d.finde ? 'es-finde' : ''
    ].filter(Boolean).join(' ');

    // La celda entera abre el pop-up del día: los títulos de adentro son
    // sólo indicativos y no hace falta acertarles con el dedo.
    return `
      <button class="${clases}" data-dia="${d.iso}"
              aria-label="${esc(formatoMedio(d.iso))}, ${delDia.length} evento(s)">
        <span class="cal-dia__num">${aFecha(d.iso).getDate()}</span>
        <span class="cal-eventos">
          ${visibles.map((e) => `
            <span class="cal-pill ${TIPOS_EVENTO[e.tipo].clase}${store.estaCompletado(e.id) ? ' esta-hecho' : ''}"
                  title="${esc(e.titulo)}">${esc(e.titulo)}</span>`).join('')}
          ${resto > 0 ? `<span class="cal-mas">+${resto} más</span>` : ''}
        </span>
      </button>
    `;
  }).join('');

  return `
    <div class="cal-grid">
      ${DIAS_CORTOS.map((d) => `<div class="cal-dow">${d}</div>`).join('')}
      ${celdas}
    </div>
  `;
}

/* ------------------------------------------------------------
   Vista semanal (agenda)
   ------------------------------------------------------------ */

function plantillaSemana(eventos) {
  const dias = diasDeSemana(refISO);
  const hoy = hoyISO();

  const filas = dias.map((iso) => {
    const delDia = store.eventosDeDia(iso, eventos);
    const f = aFecha(iso);
    return `
      <div class="agenda__dia">
        <div class="agenda__fecha${iso === hoy ? ' es-hoy' : ''}${iso < hoy ? ' es-pasado' : ''}">
          <span class="agenda__dow">${DIAS_CORTOS[f.getDay()]}</span>
          <span class="agenda__num">${f.getDate()}</span>
        </div>
        <div class="agenda__items">
          ${delDia.length
            ? delDia.map(tarjetaEvento).join('')
            : `<button class="evento" data-dia="${iso}" style="--color-evento:var(--borde-fuerte)">
                 <span class="evento__cuerpo"><span class="text-3 text-sm">Sin eventos · tocá para ver el día</span></span>
               </button>`}
        </div>
      </div>`;
  }).join('');

  return `<div class="agenda">${filas}</div>`;
}

/* ------------------------------------------------------------
   Panel lateral
   ------------------------------------------------------------ */

/**
 * "Tu semana": la barra de compleción sólo mira los eventos **ya transcurridos**
 * de la semana en curso (tareas/TPs y exámenes). Los eventos futuros quedan
 * fuera del porcentaje para no distorsionar la métrica.
 */
function plantillaProductividad(eventos) {
  const hoy = hoyISO();
  const desde = inicioSemana(hoy);
  const hasta = finSemana(hoy);

  const semana = eventos.filter((e) => e.fecha >= desde && e.fecha <= hasta && store.esMedible(e));
  const transcurridos = semana.filter((e) => e.fecha < hoy);
  const cumplidos = transcurridos.filter((e) => store.estaCumplido(e, hoy)).length;
  const pct = transcurridos.length ? Math.round((cumplidos / transcurridos.length) * 100) : 0;

  const tareasSemana = semana.filter((e) => e.tipo === 'tarea');
  const examenesSemana = semana.filter((e) => e.tipo === 'examen');
  const porHacer = semana.filter((e) => e.tipo === 'tarea' && !store.estaCompletado(e.id)).length;

  return `
    <div class="card">
      <div class="card__head">
        <div>
          <h2 class="card__title">Tu semana</h2>
          <p class="card__sub">${esc(formatoCorto(desde))} — ${esc(formatoCorto(hasta))}</p>
        </div>
      </div>
      <div class="prod">
        <div class="anillo" style="--valor:${pct}" role="img" aria-label="${pct}% completado sobre lo ya transcurrido">
          <span class="anillo__texto">${pct}%</span>
        </div>
        <div class="prod__detalle">
          <span class="prod__linea"><span>Ya transcurrido</span><strong>${cumplidos}/${transcurridos.length}</strong></span>
          <span class="prod__linea"><span>Tareas por hacer</span><strong>${porHacer}</strong></span>
          <span class="prod__linea"><span>Exámenes</span><strong>${examenesSemana.length}</strong></span>
          <span class="prod__linea"><span>Tareas / TPs</span><strong>${tareasSemana.length}</strong></span>
        </div>
      </div>
      <div class="progreso" style="margin-top:var(--sp-4)">
        <div class="progreso__barra" style="width:${pct}%"></div>
      </div>
      <p class="text-3 text-xs" style="margin-top:var(--sp-2)">
        El porcentaje sólo cuenta tareas y exámenes cuya fecha ya pasó.
      </p>
    </div>
  `;
}

function plantillaProximos(eventos) {
  const hoy = hoyISO();
  const limite = sumarDias(hoy, 14);
  const proximos = eventos
    .filter((e) => e.fecha >= hoy && e.fecha <= limite && !store.estaCumplido(e, hoy))
    .sort(store.ordenarPorFecha)
    .slice(0, 8);

  return `
    <div class="card">
      <div class="card__head"><h2 class="card__title">Próximos 14 días</h2></div>
      ${proximos.length ? `
        <div class="mini-lista">
          ${proximos.map((e) => {
            const dias = diffDias(hoy, e.fecha);
            const urgente = dias <= 2 && e.tipo === 'examen';
            return `
              <button class="mini-item ${TIPOS_EVENTO[e.tipo].clase}" data-evento="${e.id}">
                <span class="mini-item__punto"></span>
                <span class="mini-item__txt">
                  <span class="mini-item__titulo">${esc(e.titulo)}</span>
                  <span class="mini-item__sub">${esc(e.materia || TIPOS_EVENTO[e.tipo].etiqueta)}</span>
                </span>
                <span class="mini-item__cuenta${urgente ? ' es-urgente' : ''}">${esc(textoRelativo(e.fecha))}</span>
              </button>`;
          }).join('')}
        </div>` : plantillaVacio('Nada a la vista', 'No tenés eventos próximos cargados.')}
    </div>
  `;
}

function plantillaLeyenda() {
  return `
    <div class="card">
      <div class="card__head"><h2 class="card__title">Referencias</h2></div>
      <div class="leyenda">
        ${ORDEN_TIPOS.map((t) => `
          <span class="leyenda__item ${TIPOS_EVENTO[t].clase}">
            <span class="leyenda__punto" style="background:${TIPOS_EVENTO[t].color}"></span>${esc(TIPOS_EVENTO[t].plural)}
          </span>`).join('')}
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   Interacción (delegación de eventos, se conecta una sola vez)
   ------------------------------------------------------------ */

function conectarEventos(contenedor) {
  // Navegación y acciones de la barra
  delegar(contenedor, 'click', '[data-accion]', (e, btn) => {
    const modo = store.obtenerEstado().prefs.vistaCalendario;
    const esSemanal = modo === 'semana';
    switch (btn.dataset.accion) {
      case 'anterior':
        refISO = esSemanal ? sumarDias(refISO, -7) : moverMes(-1);
        break;
      case 'siguiente':
        refISO = esSemanal ? sumarDias(refISO, 7) : moverMes(1);
        break;
      case 'hoy':
        refISO = hoyISO();
        break;
      case 'nuevo':
        abrirFormularioEvento({ fecha: hoyISO() });
        return;
    }
    renderCalendario(contenedor);
  });

  // Cambio mes / semana
  delegar(contenedor, 'click', '[data-modo]', (e, btn) => {
    store.setPref('vistaCalendario', btn.dataset.modo);
  });

  // Filtros por tipo
  delegar(contenedor, 'click', '[data-filtro-tipo]', (e, btn) => {
    store.alternarTipoOculto(btn.dataset.filtroTipo);
  });

  // Marcar una tarea como completada sin abrir el detalle
  delegar(contenedor, 'click', '[data-completar]', (e, btn) => {
    e.stopPropagation();
    store.alternarCompletado(btn.dataset.completar);
  });

  // Detalle directo (agenda semanal y lista de próximos)
  delegar(contenedor, 'click', '[data-evento]', (e, el) => {
    e.stopPropagation();
    abrirDetalleEvento(el.dataset.evento);
  });

  // Celda del calendario → pop-up con los eventos de ese día
  delegar(contenedor, 'click', '[data-dia]', (e, el) => {
    if (e.target.closest('[data-evento]')) return;
    abrirDiaModal(el.dataset.dia);
  });
}

function moverMes(delta) {
  const f = aFecha(refISO);
  f.setDate(1);
  f.setMonth(f.getMonth() + delta);
  return aISO(f);
}

/** Usado por el botón flotante del header/móvil. */
export function nuevoEventoRapido() {
  abrirFormularioEvento({ fecha: hoyISO() });
}
