/**
 * store.js — Estado central de la aplicación (patrón observable).
 *
 * Cualquier vista puede suscribirse con `store.suscribir(fn)` y se la notifica
 * cada vez que cambia el estado. Las mutaciones siempre pasan por las acciones
 * de este módulo, que además persisten en `almacenamiento.js`.
 */

import { leer, escribir, borrar, limpiarTodo, CLAVES } from './almacenamiento.js';
import { migrar, ESQUEMA_ACTUAL } from './migraciones.js';
import {
  armarCursoKey, materiasDeCurso, CANAL_GENERAL, TIPOS_EVENTO,
  HILO_OFICIAL_TITULO, CURSOS, esModeradorConfigurado, etiquetaCurso
} from '../config.js';
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

/** Carga datos globales, migra si hace falta y restaura la sesión previa. */
export function inicializar() {
  estado.tema = leer(CLAVES.tema, null) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  aplicarTema(estado.tema, false);

  const resultado = migrar(leer(CLAVES.esquema, 1), {
    eventos: leer(CLAVES.eventos, []),
    hilos: leer(CLAVES.hilos, [])
  });
  estado.eventos = resultado.eventos;
  estado.hilos = resultado.hilos;
  guardarEventos();
  guardarHilos();
  escribir(CLAVES.esquema, ESQUEMA_ACTUAL);

  asegurarHilosOficiales();

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
  asegurarHilosOficiales();
  emitir('perfil');
  return perfil;
}

export const hayPerfil = () => Boolean(estado.sesion && estado.perfil);
export const cursoActual = () => (estado.perfil ? estado.perfil.cursoKey : null);
export const misMaterias = () => (estado.perfil ? materiasDeCurso(estado.perfil.cursoKey) : []);

/* ============================================================
   Moderación
   ============================================================ */

/** ¿El alumno logueado figura en MODERADORES_CONFIG? */
export function esModerador() {
  if (!estado.sesion || !estado.perfil) return false;
  return esModeradorConfigurado(estado.sesion.nombre, estado.perfil);
}

/**
 * Alcance del moderador: su propio curso y el canal general.
 * @param {string} ambito  cursoKey, CANAL_GENERAL o '*' (eventos globales).
 */
export function puedeModerar(ambito) {
  if (!esModerador()) return false;
  return ambito === cursoActual() || ambito === CANAL_GENERAL || ambito === '*';
}

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
   Eventos (exámenes, tareas, otros y feriados)
   ============================================================ */

function guardarEventos() {
  escribir(CLAVES.eventos, estado.eventos);
}

/** Alcance de publicación según el tipo: todo el colegio ('*') o el curso. */
function alcanceDe(tipo) {
  return TIPOS_EVENTO[tipo] && TIPOS_EVENTO[tipo].alcanceGlobal ? '*' : cursoActual();
}

export function crearEvento(datos) {
  const autor = estado.sesion;
  const config = TIPOS_EVENTO[datos.tipo];
  const evento = {
    id: uid('ev'),
    tipo: datos.tipo,
    titulo: datos.titulo.trim(),
    materia: config.alcanceGlobal ? null : datos.materia || null,
    fecha: datos.fecha,
    hora: datos.hora || '',
    descripcion: (datos.descripcion || '').trim(),
    cursoKey: alcanceDe(datos.tipo),
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
  const config = TIPOS_EVENTO[evento.tipo];
  if (config.alcanceGlobal) {
    evento.materia = null;
    evento.cursoKey = '*';
  } else if (evento.cursoKey === '*') {
    evento.cursoKey = cursoActual();
  }
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

/** Editar es exclusivo del autor. */
export function puedeEditar(evento) {
  return Boolean(estado.sesion && evento && evento.autor && evento.autor.email === estado.sesion.email);
}

/** Borrar lo puede hacer el autor o un moderador con alcance sobre el evento. */
export function puedeEliminarEvento(evento) {
  return puedeEditar(evento) || puedeModerar(evento ? evento.cursoKey : null);
}

/* ---------- Completado (uso personal, sólo Tareas / TPs) ---------- */

/** Sólo las tareas y TPs se pueden marcar como completadas. */
export function esCompletable(evento) {
  return Boolean(evento && TIPOS_EVENTO[evento.tipo] && TIPOS_EVENTO[evento.tipo].permiteCompletar);
}

export const estaCompletado = (id) => estado.completados.includes(id);

export function alternarCompletado(id) {
  const evento = estado.eventos.find((e) => e.id === id);
  if (!esCompletable(evento)) return false;
  const set = new Set(estado.completados);
  set.has(id) ? set.delete(id) : set.add(id);
  estado.completados = [...set];
  if (estado.sesion) escribir(CLAVES.completados(estado.sesion.email), estado.completados);
  emitir('completados');
  return set.has(id);
}

/**
 * ¿El evento cuenta como cumplido para las estadísticas?
 * - Tareas / TPs: cuando el alumno las marcó.
 * - Exámenes: cuando la fecha ya pasó (caducan por fecha, no se marcan).
 */
export function estaCumplido(evento, hoy = hoyISO()) {
  const config = TIPOS_EVENTO[evento.tipo];
  if (!config) return false;
  if (config.permiteCompletar) return estaCompletado(evento.id);
  if (config.caducaPorFecha) return evento.fecha < hoy;
  return false;
}

/** Eventos que entran en las métricas de cumplimiento (tareas y exámenes). */
export function esMedible(evento) {
  const config = TIPOS_EVENTO[evento.tipo];
  return Boolean(config && (config.permiteCompletar || config.caducaPorFecha));
}

/* ---------- Consultas ---------- */

/** Eventos del curso del alumno + los globales (feriados). */
export function eventosDelCurso() {
  const curso = cursoActual();
  return estado.eventos.filter((e) => e.cursoKey === curso || e.cursoKey === '*');
}

/** Eventos del curso aplicando los filtros de visibilidad de Configuración. */
export function eventosVisibles() {
  const { materiasOcultas, tiposOcultos, mostrarFeriadosGlobales } = estado.prefs;
  return eventosDelCurso().filter((e) => {
    if (tiposOcultos.includes(e.tipo)) return false;
    if (e.cursoKey === '*') return mostrarFeriadosGlobales;
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

/**
 * Arma el autor de una publicación respetando el modo incógnito.
 * El email se conserva para poder verificar quién puede borrar la publicación,
 * pero nunca se muestra en la interfaz cuando `anonimo` es true.
 */
function armarAutor(anonimo) {
  const s = estado.sesion;
  return anonimo
    ? { email: s.email, nombre: 'Anónimo', foto: null, curso: null, anonimo: true }
    : { email: s.email, nombre: s.nombre, foto: s.foto, curso: cursoActual(), anonimo: false };
}

export function crearHilo({ canal, titulo, cuerpo, materia, anonimo = false }) {
  const hilo = {
    id: uid('hilo'),
    canal: canal || CANAL_GENERAL,
    titulo: titulo.trim(),
    cuerpo: (cuerpo || '').trim(),
    materia: materia || null,
    oficial: false,
    autor: armarAutor(anonimo),
    creadoEn: new Date().toISOString(),
    likes: [],
    respuestas: []
  };
  estado.hilos.unshift(hilo);
  guardarHilos();
  emitir('foro');
  return hilo;
}

export function responderHilo(hiloId, texto, anonimo = false) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo || !texto.trim()) return null;
  const respuesta = {
    id: uid('resp'),
    texto: texto.trim(),
    autor: armarAutor(anonimo),
    creadoEn: new Date().toISOString(),
    likes: [],
    reportes: []
  };
  hilo.respuestas.push(respuesta);
  guardarHilos();
  emitir('foro');
  return respuesta;
}

/** "Me sirve" sobre una publicación. */
export function alternarLike(hiloId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo) return;
  hilo.likes = alternarEnLista(hilo.likes, estado.sesion.email);
  guardarHilos();
  emitir('foro');
}

/** "Me sirve" sobre una respuesta concreta del hilo. */
export function alternarLikeRespuesta(hiloId, respuestaId) {
  const respuesta = buscarRespuesta(hiloId, respuestaId);
  if (!respuesta) return;
  respuesta.likes = alternarEnLista(respuesta.likes || [], estado.sesion.email);
  guardarHilos();
  emitir('foro');
}

/** Reporta una respuesta para que la revise un moderador. */
export function alternarReporteRespuesta(hiloId, respuestaId) {
  const respuesta = buscarRespuesta(hiloId, respuestaId);
  if (!respuesta) return false;
  respuesta.reportes = alternarEnLista(respuesta.reportes || [], estado.sesion.email);
  guardarHilos();
  emitir('foro');
  return respuesta.reportes.includes(estado.sesion.email);
}

function buscarRespuesta(hiloId, respuestaId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  return hilo ? hilo.respuestas.find((r) => r.id === respuestaId) : null;
}

function alternarEnLista(lista, valor) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/** Los hilos oficiales de cada curso no se pueden eliminar. */
export const esHiloOficial = (hilo) => Boolean(hilo && hilo.oficial);

export function puedeEliminarHilo(hilo) {
  if (!hilo || esHiloOficial(hilo)) return false;
  const esAutor = estado.sesion && hilo.autor.email === estado.sesion.email;
  return Boolean(esAutor || puedeModerar(hilo.canal));
}

export function puedeEliminarRespuesta(hilo, respuesta) {
  if (!hilo || !respuesta) return false;
  const esAutor = estado.sesion && respuesta.autor.email === estado.sesion.email;
  return Boolean(esAutor || puedeModerar(hilo.canal));
}

export function eliminarHilo(hiloId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!puedeEliminarHilo(hilo)) return false;
  estado.hilos = estado.hilos.filter((h) => h.id !== hiloId);
  guardarHilos();
  emitir('foro');
  return true;
}

export function eliminarRespuesta(hiloId, respuestaId) {
  const hilo = estado.hilos.find((h) => h.id === hiloId);
  if (!hilo) return false;
  const respuesta = hilo.respuestas.find((r) => r.id === respuestaId);
  if (!puedeEliminarRespuesta(hilo, respuesta)) return false;
  hilo.respuestas = hilo.respuestas.filter((r) => r.id !== respuestaId);
  guardarHilos();
  emitir('foro');
  return true;
}

export function hilosDeCanal(canal) {
  return estado.hilos
    .filter((h) => h.canal === canal)
    // El hilo oficial del curso siempre queda arriba de todo.
    .sort((a, b) => {
      const oficialA = Boolean(a.oficial);
      const oficialB = Boolean(b.oficial);
      if (oficialA !== oficialB) return oficialA ? -1 : 1;
      return a.creadoEn < b.creadoEn ? 1 : -1;
    });
}

/**
 * Crea el hilo oficial "Dudas y avisos del curso" en los canales que no lo
 * tengan. Se ejecuta al iniciar y al cambiar de curso.
 */
export function asegurarHilosOficiales() {
  let creados = 0;
  CURSOS.forEach((cursoKey) => {
    const existe = estado.hilos.some((h) => h.canal === cursoKey && h.oficial);
    if (existe) return;
    estado.hilos.push({
      id: uid('hilo'),
      canal: cursoKey,
      titulo: HILO_OFICIAL_TITULO,
      cuerpo: `Hilo oficial de ${etiquetaCurso(cursoKey)}. Usalo para consultas rápidas: ` +
        'qué entró en el examen, qué hay que leer y cambios de fecha.',
      materia: null,
      oficial: true,
      autor: { email: null, nombre: 'EduFlow', foto: null, curso: cursoKey, anonimo: false },
      creadoEn: new Date(0).toISOString(),
      likes: [],
      respuestas: []
    });
    creados += 1;
  });
  if (creados) guardarHilos();
  return creados;
}

/** Publicaciones y respuestas nuevas desde la última visita al foro. */
export function novedadesForo() {
  const desde = estado.ultimaVisitaForo;
  const email = estado.sesion ? estado.sesion.email : '';
  let total = 0;
  estado.hilos.forEach((h) => {
    if (h.oficial) return; // los hilos oficiales no generan novedades por sí mismos
    if ((!desde || h.creadoEn > desde) && h.autor.email !== email) total += 1;
  });
  estado.hilos.forEach((h) => {
    h.respuestas.forEach((r) => {
      if ((!desde || r.creadoEn > desde) && r.autor.email !== email) total += 1;
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
   Reinicio
   ============================================================ */

export function restablecerDatos() {
  limpiarTodo();
  estado.eventos = [];
  estado.hilos = [];
  estado.completados = [];
  estado.perfil = null;
  estado.sesion = null;
  emitir('reset');
}
