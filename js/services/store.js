/**
 * store.js — Estado central de la aplicación (patrón observable).
 *
 * Cualquier vista puede suscribirse con `store.suscribir(fn)` y se la notifica
 * cada vez que cambia el estado. Las mutaciones siempre pasan por las acciones
 * de este módulo, que además persisten en `almacenamiento.js`.
 */

import { leer, escribir, borrar, limpiarTodo, CLAVES } from './almacenamiento.js';
import { armarCursoKey, materiasDeCurso, CANAL_GENERAL } from '../config.js';
import { uid, avatarPorDefecto } from '../utils/dom.js';
import { hoyISO } from '../utils/fecha.js';

const PREFS_POR_DEFECTO = {
  sidebarColapsada: false,
  materiasOcultas: [],
  tiposOcultos: [],
  vistaCalendario: 'mes',
  mostrarFeriadosGlobales: true
};

const estado = {
  sesion: null,
  perfil: null,
  eventos: [],
  hilos: [],
  prefs: { ...PREFS_POR_DEFECTO },
  completados: [],
  ultimaVisitaForo: null,
  tema: 'light'
};

const suscriptores = new Set();

/* ============================================================
   Núcleo observable
   ============================================================ */

export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

function emitir(motivo = 'cambio') {
  suscriptores.forEach((fn) => {
    try { fn(estado, motivo); } catch (e) { console.error('[EduFlow] Error en suscriptor', e); }
  });
}

export function obtenerEstado() {
  return estado;
}

/* ============================================================
   Carga inicial
   ============================================================ */

/** Carga datos globales y, si hay sesión previa, los datos del usuario. */
export function inicializar() {
  estado.tema = leer(CLAVES.tema, null) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  aplicarTema(estado.tema, false);

  estado.eventos = leer(CLAVES.eventos, []);
  estado.hilos = leer(CLAVES.hilos, []);

  const sesion = leer(CLAVES.sesion, null);
  if (sesion) cargarUsuario(sesion);

  emitir('init');
}

function cargarUsuario(sesion) {
  estado.sesion = sesion;
  const perfiles = leer(CLAVES.perfiles, {});
  estado.perfil = perfiles[sesion.email] || null;
  estado.prefs = { ...PREFS_POR_DEFECTO, ...leer(CLAVES.prefs(sesion.email), {}) };
  estado.completados = leer(CLAVES.completados(sesion.email), []);
  estado.ultimaVisitaForo = leer(CLAVES.visitaForo(sesion.email), null);
}

/* ============================================================
   Sesión y perfil
   ============================================================ */

export function iniciarSesion(usuario) {
  const sesion = {
    email: usuario.email.toLowerCase(),
    nombre: usuario.nombre || usuario.email.split('@')[0],
    foto: usuario.foto || avatarPorDefecto(usuario.nombre || usuario.email, usuario.email),
    sub: usuario.sub || usuario.email,
    ingresoEn: new Date().toISOString()
  };
  escribir(CLAVES.sesion, sesion);
  cargarUsuario(sesion);
  emitir('sesion');
  return sesion;
}

export function cerrarSesion() {
  borrar(CLAVES.sesion);
  estado.sesion = null;
  estado.perfil = null;
  estado.prefs = { ...PREFS_POR_DEFECTO };
  estado.completados = [];
  emitir('sesion');
}

/** Guarda año + modalidad del alumno (onboarding o cambio posterior). */
export function guardarPerfil({ anio, modalidad }) {
  if (!estado.sesion) return null;
  const perfil = {
    anio,
    modalidad,
    cursoKey: armarCursoKey(anio, modalidad),
    actualizadoEn: new Date().toISOString()
  };
  const perfiles = leer(CLAVES.perfiles, {});
  perfiles[estado.sesion.email] = perfil;
  escribir(CLAVES.perfiles, perfiles);
  estado.perfil = perfil;
  // Al cambiar de curso, los filtros de materias del curso anterior no aplican
  estado.prefs.materiasOcultas = [];
  guardarPrefs();
  emitir('perfil');
  return perfil;
}

export const hayPerfil = () => Boolean(estado.sesion && estado.perfil);
export const cursoActual = () => (estado.perfil ? estado.perfil.cursoKey : null);
export const misMaterias = () => (estado.perfil ? materiasDeCurso(estado.perfil.cursoKey) : []);

/* ============================================================
   Preferencias y tema
   ============================================================ */

function guardarPrefs() {
  if (estado.sesion) escribir(CLAVES.prefs(estado.sesion.email), estado.prefs);
}

export function setPref(clave, valor) {
  estado.prefs[clave] = valor;
  guardarPrefs();
  emitir('prefs');
}

export function alternarMateriaOculta(materia) {
  const set = new Set(estado.prefs.materiasOcultas);
  set.has(materia) ? set.delete(materia) : set.add(materia);
  estado.prefs.materiasOcultas = [...set];
  guardarPrefs();
  emitir('prefs');
}

export function alternarTipoOculto(tipo) {
  const set = new Set(estado.prefs.tiposOcultos);
  set.has(tipo) ? set.delete(tipo) : set.add(tipo);
  estado.prefs.tiposOcultos = [...set];
  guardarPrefs();
  emitir('prefs');
}

export function mostrarTodasLasMaterias() {
  estado.prefs.materiasOcultas = [];
  estado.prefs.tiposOcultos = [];
  guardarPrefs();
  emitir('prefs');
}

export function aplicarTema(tema, persistir = true) {
  estado.tema = tema;
  document.documentElement.setAttribute('data-theme', tema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'dark' ? '#121212' : '#20B2AA');
  if (persistir) {
    escribir(CLAVES.tema, tema);
    emitir('tema');
  }
}

export function alternarTema() {
  aplicarTema(estado.tema === 'dark' ? 'light' : 'dark');
  return estado.tema;
}

/* ============================================================
   Eventos (exámenes, tareas, feriados)
   ============================================================ */

function guardarEventos() {
  escribir(CLAVES.eventos, estado.eventos);
}

export function crearEvento(datos) {
  const autor = estado.sesion;
  const evento = {
    id: uid('ev'),
    tipo: datos.tipo,
    titulo: datos.titulo.trim(),
    materia: datos.tipo === 'feriado' ? null : datos.materia || null,
    fecha: datos.fecha,
    hora: datos.hora || '',
    descripcion: (datos.descripcion || '').trim(),
    // Los feriados son globales ('*'); el resto pertenece al curso del autor.
    cursoKey: datos.tipo === 'feriado' ? '*' : cursoActual(),
    autor: { email: autor.email, nombre: autor.nombre, foto: autor.foto },
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  };
  estado.eventos.push(evento);
  guardarEventos();
  emitir('eventos');
  return evento;
}

export function actualizarEvento(id, cambios) {
  const evento = estado.eventos.find((e) => e.id === id);
  if (!evento) return null;
  Object.assign(evento, cambios, { actualizadoEn: new Date().toISOString() });
  if (evento.tipo === 'feriado') { evento.materia = null; evento.cursoKey = '*'; }
  guardarEventos();
  emitir('eventos');
  return evento;
}

export function eliminarEvento(id) {
  estado.eventos = estado.eventos.filter((e) => e.id !== id);
  estado.completados = estado.completados.filter((c) => c !== id);
  guardarEventos();
  if (estado.sesion) escribir(CLAVES.completados(estado.sesion.email), estado.completados);
  emitir('eventos');
}

/** Sólo el autor puede editar o borrar su evento. */
export function puedeEditar(evento) {
  return Boolean(estado.sesion && evento && evento.autor && evento.autor.email === estado.sesion.email);
}

export const estaCompletado = (id) => estado.completados.includes(id);

export function alternarCompletado(id) {
  const set = new Set(estado.completados);
  set.has(id) ? set.delete(id) : set.add(id);
  estado.completados = [...set];
  if (estado.sesion) escribir(CLAVES.completados(estado.sesion.email), estado.completados);
  emitir('completados');
  return set.has(id);
}

/** Eventos del curso del alumno + feriados globales. */
export function eventosDelCurso() {
  const curso = cursoActual();
  return estado.eventos.filter((e) => e.cursoKey === curso || e.cursoKey === '*');
}

/** Eventos del curso aplicando los filtros de visibilidad de Configuración. */
export function eventosVisibles() {
  const { materiasOcultas, tiposOcultos, mostrarFeriadosGlobales } = estado.prefs;
  return eventosDelCurso().filter((e) => {
    if (tiposOcultos.includes(e.tipo)) return false;
    if (e.tipo === 'feriado') return mostrarFeriadosGlobales;
    if (e.materia && materiasOcultas.includes(e.materia)) return false;
    return true;
  });
}

export function eventosDeDia(iso, lista = eventosVisibles()) {
  return lista.filter((e) => e.fecha === iso).sort(ordenarPorHora);
}

export function eventosEnRango(desdeISO, hastaISO, lista = eventosVisibles()) {
  return lista.filter((e) => e.fecha >= desdeISO && e.fecha <= hastaISO).sort(ordenarPorFecha);
}

export function eventosFuturos(lista = eventosVisibles()) {
  const hoy = hoyISO();
  return lista.filter((e) => e.fecha >= hoy).sort(ordenarPorFecha);
}

export function eventosPasados(lista = eventosVisibles()) {
  const hoy = hoyISO();
  return lista.filter((e) => e.fecha < hoy).sort((a, b) => ordenarPorFecha(b, a));
}

export function ordenarPorFecha(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  return ordenarPorHora(a, b);
}

function ordenarPorHora(a, b) {
  const ha = a.hora || '99:99';
  const hb = b.hora || '99:99';
  if (ha !== hb) return ha < hb ? -1 : 1;
  return (a.creadoEn || '') < (b.creadoEn || '') ? -1 : 1;
}

/* ============================================================
   Foro
   ============================================================ */

function guardarHilos() {
  escribir(CLAVES.hilos, estado.hilos);
}

export function crearHilo({ canal, titulo, cuerpo, materia }) {
  const autor = estado.sesion;
  const hilo = {
    id: uid('hilo'),
    canal: canal || CANAL_GENERAL,
    titulo: titulo.trim(),
    cuerpo: (cuerpo || '').trim(),
    materia: materia || null,
    autor: { email: autor.email, nombre: autor.nombre, foto: autor.foto, curso: cursoActual() },
    creadoEn: new Date().toISOString(),
    likes: [],
    respuestas: []
  };
  estado.hilos.unshift(hilo);
  guardarHilos();
  emitir('foro');
  return hilo;
}

export function responderHilo(hiloId, texto) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo || !texto.trim()) return null;
  const respuesta = {
    id: uid('resp'),
    texto: texto.trim(),
    autor: {
      email: estado.sesion.email,
      nombre: estado.sesion.nombre,
      foto: estado.sesion.foto,
      curso: cursoActual()
    },
    creadoEn: new Date().toISOString()
  };
  hilo.respuestas.push(respuesta);
  guardarHilos();
  emitir('foro');
  return respuesta;
}

export function alternarLike(hiloId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo) return;
  const email = estado.sesion.email;
  hilo.likes = hilo.likes.includes(email)
    ? hilo.likes.filter((l) => l !== email)
    : [...hilo.likes, email];
  guardarHilos();
  emitir('foro');
}

export function eliminarHilo(hiloId) {
  estado.hilos = estado.hilos.filter((h) => h.id !== hiloId);
  guardarHilos();
  emitir('foro');
}

export function eliminarRespuesta(hiloId, respuestaId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo) return;
  hilo.respuestas = hilo.respuestas.filter((r) => r.id !== respuestaId);
  guardarHilos();
  emitir('foro');
}

export function hilosDeCanal(canal) {
  return estado.hilos
    .filter((h) => h.canal === canal)
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
}

/** Cantidad de publicaciones y respuestas nuevas desde la última visita al foro. */
export function novedadesForo() {
  const desde = estado.ultimaVisitaForo;
  if (!desde) return estado.hilos.length;
  const email = estado.sesion ? estado.sesion.email : '';
  let total = 0;
  estado.hilos.forEach((h) => {
    if (h.creadoEn > desde && h.autor.email !== email) total += 1;
    h.respuestas.forEach((r) => {
      if (r.creadoEn > desde && r.autor.email !== email) total += 1;
    });
  });
  return total;
}

export function marcarForoVisitado() {
  estado.ultimaVisitaForo = new Date().toISOString();
  if (estado.sesion) escribir(CLAVES.visitaForo(estado.sesion.email), estado.ultimaVisitaForo);
  emitir('foro-visitado');
}

/* ============================================================
   Datos de ejemplo / reinicio
   ============================================================ */

export function sembrarSiHaceFalta(generador) {
  if (leer(CLAVES.semilla, false)) return;
  const { eventos, hilos } = generador();
  estado.eventos = [...eventos, ...estado.eventos];
  estado.hilos = [...hilos, ...estado.hilos];
  guardarEventos();
  guardarHilos();
  escribir(CLAVES.semilla, true);
  emitir('semilla');
}

export function restablecerDatos() {
  limpiarTodo();
  estado.eventos = [];
  estado.hilos = [];
  estado.completados = [];
  estado.perfil = null;
  estado.sesion = null;
  emitir('reset');
}
