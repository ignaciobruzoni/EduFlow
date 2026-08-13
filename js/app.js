/**
 * app.js — Controlador de la aplicación: pantallas, ruteo y layout.
 */

import { $, $$, mostrar, avatarPorDefecto } from './utils/dom.js';
import * as store from './services/store.js';
import { iniciarGoogle, esEmailInstitucional, mensajeDominioInvalido, cerrarSesionGoogle } from './services/auth.js';
import { etiquetaCurso, etiquetaCursoCorta, DOMINIO_PERMITIDO } from './config.js';
import { montarOnboarding } from './views/onboarding.js';
import { renderCalendario, nuevoEventoRapido } from './views/calendario.js';
import { renderHistorial } from './views/historial.js';
import { renderForo } from './views/foro.js';
import { abrirConfiguracion } from './views/configuracion.js';
import { abrirPerfil } from './views/perfil.js';
import { toast } from './components/toast.js';
import { cerrarModal } from './components/modal.js';

const VISTAS = {
  calendario: { titulo: 'Calendario', render: renderCalendario, sel: '#vista-calendario' },
  historial: { titulo: 'Historial', render: renderHistorial, sel: '#vista-historial' },
  foro: { titulo: 'Foro', render: renderForo, sel: '#vista-foro' }
};

let vistaActual = 'calendario';
let conectado = false;

/* ============================================================
   Arranque
   ============================================================ */

export function iniciarApp() {
  if (!conectado) {
    conectarLayout();
    store.suscribir(alCambiarEstado);
    window.addEventListener('hashchange', () => {
      const destino = location.hash.replace('#/', '');
      if (VISTAS[destino] && destino !== vistaActual) cambiarVista(destino);
    });
    conectado = true;
  }
  mostrar($('#splash'), false);
  mostrarPantalla();
}

/** Decide qué pantalla corresponde según sesión y perfil. */
function mostrarPantalla() {
  const { sesion, perfil } = store.obtenerEstado();

  const login = $('#pantalla-login');
  const onboarding = $('#pantalla-onboarding');
  const app = $('#app');

  if (!sesion) {
    mostrar(login, true);
    mostrar(onboarding, false);
    mostrar(app, false);
    montarLogin();
    return;
  }

  if (!perfil) {
    mostrar(login, false);
    mostrar(onboarding, true);
    mostrar(app, false);
    montarOnboarding({
      alTerminar: () => mostrarPantalla(),
      alSalir: () => cerrarSesion()
    });
    return;
  }

  mostrar(login, false);
  mostrar(onboarding, false);
  mostrar(app, true);
  sincronizarCabecera();
  sincronizarSidebar();

  const destino = location.hash.replace('#/', '');
  cambiarVista(VISTAS[destino] ? destino : vistaActual);
}

/* ============================================================
   Login
   ============================================================ */

function montarLogin() {
  const error = $('#auth-error');
  const fallback = $('#auth-fallback');

  const mostrarError = (msg) => {
    error.textContent = msg;
    mostrar(error, true);
  };

  const entrar = (usuario) => {
    mostrar(error, false);
    store.iniciarSesion(usuario);
    toast(`¡Hola, ${usuario.nombre.split(' ')[0]}!`, 'exito');
    mostrarPantalla();
  };

  iniciarGoogle({
    contenedor: $('#google-btn'),
    onExito: entrar,
    onError: mostrarError,
    onNoDisponible: (motivo) => {
      mostrar(fallback, true);
      console.info(`[EduFlow] Acceso alternativo habilitado: ${motivo}`);
    }
  });

  // Acceso alternativo (desarrollo / sin Client ID configurado)
  $('#form-login-demo').onsubmit = (e) => {
    e.preventDefault();
    const email = $('#input-email-demo').value.trim().toLowerCase();
    const nombre = $('#input-nombre-demo').value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarError('Ingresá un correo electrónico válido.');
      return;
    }
    // ── Restricción estricta de dominio ──
    if (!esEmailInstitucional(email)) {
      mostrarError(mensajeDominioInvalido(email));
      return;
    }
    if (nombre.length < 3) {
      mostrarError('Escribí tu nombre y apellido.');
      return;
    }
    entrar({ email, nombre, foto: avatarPorDefecto(nombre, email) });
  };
}

function cerrarSesion() {
  cerrarSesionGoogle();
  store.cerrarSesion();
  location.hash = '';
  vistaActual = 'calendario';
  mostrarPantalla();
  toast('Sesión cerrada', 'info');
}

/* ============================================================
   Layout: sidebar, header y acciones globales
   ============================================================ */

function conectarLayout() {
  const app = $('#app');

  // Colapsar / expandir el menú lateral (escritorio)
  $('#btn-toggle-sidebar').addEventListener('click', () => {
    store.setPref('sidebarColapsada', !store.obtenerEstado().prefs.sidebarColapsada);
  });

  // Abrir el menú lateral en móvil
  const abrirMovil = (abrir) => {
    app.classList.toggle('sidebar-abierta', abrir);
    $('#sidebar-scrim').hidden = !abrir;
  };
  $('#btn-toggle-sidebar-mobile').addEventListener('click', () => abrirMovil(!app.classList.contains('sidebar-abierta')));
  $('#sidebar-scrim').addEventListener('click', () => abrirMovil(false));

  // Navegación principal
  $$('.nav-item[data-vista]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cambiarVista(btn.dataset.vista);
      abrirMovil(false);
    });
  });

  // Configuración
  $('#btn-config').addEventListener('click', () => {
    abrirMovil(false);
    abrirConfiguracion({
      alCambiarCurso: irACambiarCurso,
      alCerrarSesion: cerrarSesion,
      alRestablecer: () => {
        store.restablecerDatos();
        toast('Datos restablecidos', 'exito');
        location.hash = '';
        location.reload();
      }
    });
  });

  // Tema
  $('#btn-tema').addEventListener('click', () => {
    const tema = store.alternarTema();
    toast(tema === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado', 'info', 1800);
  });

  // Perfil
  $('#perfil-btn').addEventListener('click', () => {
    abrirPerfil({ alCambiarCurso: irACambiarCurso, alCerrarSesion: cerrarSesion });
  });

  // Botón flotante
  $('#fab-nuevo').addEventListener('click', () => nuevoEventoRapido());

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && store.hayPerfil()) {
      e.preventDefault();
      nuevoEventoRapido();
    }
    if (e.key >= '1' && e.key <= '3' && store.hayPerfil()) {
      cambiarVista(Object.keys(VISTAS)[Number(e.key) - 1]);
    }
  });
}

function irACambiarCurso() {
  cerrarModal();
  mostrar($('#app'), false);
  mostrar($('#pantalla-onboarding'), true);
  montarOnboarding({
    alTerminar: () => mostrarPantalla(),
    alSalir: () => mostrarPantalla(),
    textoSalir: 'Cancelar'
  });
}

/* ============================================================
   Vistas
   ============================================================ */

function cambiarVista(nombre) {
  if (!VISTAS[nombre]) return;
  vistaActual = nombre;
  if (location.hash !== `#/${nombre}`) location.hash = `#/${nombre}`;

  $$('.nav-item[data-vista]').forEach((btn) => {
    const activo = btn.dataset.vista === nombre;
    btn.classList.toggle('is-active', activo);
    if (activo) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  Object.entries(VISTAS).forEach(([clave, cfg]) => mostrar($(cfg.sel), clave === nombre));

  $('#titulo-vista').textContent = VISTAS[nombre].titulo;
  $('#subtitulo-vista').textContent = subtitulo(nombre);
  mostrar($('#fab-nuevo'), nombre !== 'foro');

  renderVistaActual();
}

function subtitulo(nombre) {
  const curso = etiquetaCurso(store.cursoActual());
  if (nombre === 'calendario') return `Exámenes, tareas y feriados de ${curso}`;
  if (nombre === 'historial') return 'Todo lo que ya pasó, con estadísticas';
  return 'Coordiná con tu curso y con el resto del colegio';
}

function renderVistaActual() {
  const cfg = VISTAS[vistaActual];
  if (cfg) cfg.render($(cfg.sel));
}

/* ============================================================
   Sincronización con el estado
   ============================================================ */

function alCambiarEstado(estado, motivo) {
  if (motivo === 'foro-visitado') {
    actualizarBadgeForo();
    return;
  }
  if (!estado.sesion || !estado.perfil) return;

  sincronizarCabecera();
  sincronizarSidebar();
  actualizarBadgeForo();

  if (['eventos', 'completados', 'prefs', 'foro', 'perfil', 'semilla'].includes(motivo)) {
    renderVistaActual();
  }
}

function sincronizarCabecera() {
  const { sesion } = store.obtenerEstado();
  if (!sesion) return;
  const img = $('#perfil-avatar');
  img.src = sesion.foto || avatarPorDefecto(sesion.nombre, sesion.email);
  img.alt = `Avatar de ${sesion.nombre}`;
  $('#perfil-nombre').textContent = sesion.nombre;
  $('#perfil-badge').textContent = etiquetaCursoCorta(store.cursoActual());
  $('#perfil-btn').title = `${sesion.email} · ${etiquetaCurso(store.cursoActual())}`;
}

function sincronizarSidebar() {
  const colapsada = store.obtenerEstado().prefs.sidebarColapsada;
  $('#app').classList.toggle('sidebar-colapsada', colapsada);
  const btn = $('#btn-toggle-sidebar');
  btn.setAttribute('aria-expanded', String(!colapsada));
  btn.setAttribute('aria-label', colapsada ? 'Expandir menú' : 'Contraer menú');
}

function actualizarBadgeForo() {
  const badge = $('#foro-badge');
  const nuevas = vistaActual === 'foro' ? 0 : store.novedadesForo();
  badge.textContent = nuevas > 99 ? '99+' : String(nuevas);
  mostrar(badge, nuevas > 0);
}

/** Mensaje de ayuda para el dominio, usado en textos de la interfaz. */
export const DOMINIO = DOMINIO_PERMITIDO;
