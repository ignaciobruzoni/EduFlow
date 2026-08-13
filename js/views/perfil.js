/**
 * perfil.js — Tarjeta de perfil del alumno con su actividad.
 */

import { esc, avatarPorDefecto } from '../utils/dom.js';
import { abrirModal, cerrarModal } from '../components/modal.js';
import { etiquetaCurso } from '../config.js';
import { formatoMedio } from '../utils/fecha.js';
import * as store from '../services/store.js';

export function abrirPerfil({ alCambiarCurso, alCerrarSesion }) {
  const estado = store.obtenerEstado();
  const s = estado.sesion;
  const mios = estado.eventos.filter((e) => e.autor && e.autor.email === s.email);
  const hilosMios = estado.hilos.filter((h) => h.autor.email === s.email);
  const completados = estado.completados.length;

  abrirModal({
    titulo: 'Mi perfil',
    contenido: `
      <div class="row" style="gap:var(--sp-4)">
        <img src="${esc(s.foto || avatarPorDefecto(s.nombre, s.email))}" alt=""
             style="width:64px;height:64px;border-radius:50%;object-fit:cover" />
        <div class="stack" style="gap:2px">
          <h3 style="font-size:var(--fs-lg)">${esc(s.nombre)}</h3>
          <p class="text-3 text-sm">${esc(s.email)}</p>
          <p><span class="badge badge--curso">${esc(etiquetaCurso(store.cursoActual()))}</span></p>
        </div>
      </div>

      <div class="hist-stats" style="margin:0">
        <div class="stat"><span class="stat__valor">${mios.length}</span><span class="stat__label">Eventos creados</span></div>
        <div class="stat"><span class="stat__valor">${completados}</span><span class="stat__label">Completados</span></div>
        <div class="stat"><span class="stat__valor">${hilosMios.length}</span><span class="stat__label">Publicaciones</span></div>
      </div>

      <p class="text-3 text-xs">
        Miembro desde ${esc(formatoMedio(String(s.ingresoEn).slice(0, 10)))}.
      </p>
    `,
    acciones: [
      { texto: 'Cerrar sesión', clase: 'btn--ghost', onClick: () => { cerrarModal(); alCerrarSesion(); } },
      { texto: 'Cambiar curso', clase: 'btn--primary', onClick: () => { cerrarModal(); alCambiarCurso(); } }
    ]
  });
}
