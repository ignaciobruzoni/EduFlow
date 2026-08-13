/**
 * datosDemo.js — Contenido inicial de ejemplo.
 *
 * Se carga una sola vez (la primera vez que se abre la app) para que el
 * calendario y el foro no aparezcan vacíos. Se puede borrar todo desde
 * Configuración → "Restablecer datos".
 */

import { CURSOS, materiasDeCurso, CANAL_GENERAL } from '../config.js';
import { hoyISO, sumarDias, inicioSemana } from '../utils/fecha.js';
import { uid, avatarPorDefecto } from '../utils/dom.js';

const NOMBRES = [
  'Delegado/a de curso', 'Martina Álvarez', 'Joaquín Pérez', 'Sofía Ramírez',
  'Tomás Gutiérrez', 'Valentina Ruiz', 'Bruno Castro'
];

function autorDemo(i) {
  const nombre = NOMBRES[i % NOMBRES.length];
  const email = `${nombre.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@colegiosantaethnea.com.ar`;
  return { email, nombre, foto: avatarPorDefecto(nombre, email) };
}

function evento(datos) {
  return {
    id: uid('ev'),
    hora: '',
    descripcion: '',
    materia: null,
    creadoEn: new Date(Date.now() - Math.random() * 6e8).toISOString(),
    actualizadoEn: new Date().toISOString(),
    ...datos
  };
}

/** Genera eventos de ejemplo para todos los cursos + feriados globales. */
export function generarDatosDemo() {
  const hoy = hoyISO();
  const lunes = inicioSemana(hoy);
  const eventos = [];
  const hilos = [];

  // ── Feriados / días sin clases (globales) ──
  [
    { titulo: 'Jornada docente — sin clases', dias: 4 },
    { titulo: 'Acto por el Día de la Bandera', dias: 12, descripcion: 'Jornada especial: se suspenden las clases regulares.' },
    { titulo: 'Receso escolar', dias: -9 }
  ].forEach((f, i) => {
    eventos.push(evento({
      tipo: 'feriado',
      titulo: f.titulo,
      descripcion: f.descripcion || '',
      fecha: sumarDias(hoy, f.dias),
      cursoKey: '*',
      autor: autorDemo(i)
    }));
  });

  // ── Exámenes y tareas por curso ──
  CURSOS.forEach((cursoKey, idx) => {
    const materias = materiasDeCurso(cursoKey);
    const plan = [
      { tipo: 'examen', dias: 3, titulo: 'Evaluación escrita', hora: '08:00' },
      { tipo: 'tarea', dias: 1, titulo: 'Entrega de TP grupal', hora: '23:59' },
      { tipo: 'tarea', dias: 6, titulo: 'Guía de ejercicios', hora: '' },
      { tipo: 'examen', dias: 14, titulo: 'Examen integrador', hora: '10:20' },
      { tipo: 'tarea', dias: -5, titulo: 'Informe de laboratorio', hora: '' },
      { tipo: 'examen', dias: -18, titulo: 'Prueba diagnóstica', hora: '09:00' }
    ];

    plan.forEach((p, i) => {
      const materia = materias[(idx + i) % materias.length];
      eventos.push(evento({
        tipo: p.tipo,
        titulo: `${p.titulo} · ${materia}`,
        materia,
        fecha: sumarDias(lunes, p.dias + 1),
        hora: p.hora,
        descripcion: p.tipo === 'examen'
          ? 'Temas: los vistos en las últimas clases. Traer calculadora y carpeta completa.'
          : 'Entrega por el aula virtual. Trabajo en grupos de hasta 3 integrantes.',
        cursoKey,
        autor: autorDemo(idx + i)
      }));
    });
  });

  // ── Hilos del foro ──
  const hiloBase = (datos, i) => ({
    id: uid('hilo'),
    canal: CANAL_GENERAL,
    materia: null,
    likes: [],
    respuestas: [],
    creadoEn: new Date(Date.now() - (i + 1) * 36e5 * 7).toISOString(),
    autor: { ...autorDemo(i), curso: datos.cursoAutor || CURSOS[i % CURSOS.length] },
    ...datos
  });

  hilos.push(
    hiloBase({
      titulo: '¿Cómo usamos EduFlow?',
      cuerpo: 'Cargá los exámenes y tareas apenas los anuncien en clase. Los feriados los ven todos los cursos; los exámenes y TPs, sólo tu curso.\n\nUsá el foro para coordinar entre años: resúmenes, dudas y avisos.',
      canal: CANAL_GENERAL
    }, 0),
    hiloBase({
      titulo: 'Resúmenes compartidos entre cursos',
      cuerpo: 'Armamos una carpeta con resúmenes de años anteriores. Si tenés material de tu curso, comentá acá y lo sumamos.',
      canal: CANAL_GENERAL,
      respuestas: [{
        id: uid('resp'),
        texto: 'Tengo los resúmenes de Historia del año pasado, los subo esta semana.',
        autor: { ...autorDemo(3), curso: '5_Sociales' },
        creadoEn: new Date(Date.now() - 36e5 * 3).toISOString()
      }]
    }, 1),
    hiloBase({
      titulo: 'Recordatorio: semana de exámenes',
      cuerpo: 'Revisen el calendario, se acumulan varias evaluaciones. Si dos caen el mismo día, avisen al delegado para pedir reprogramación.',
      canal: CANAL_GENERAL
    }, 2)
  );

  // Un hilo propio de cada curso, para que ningún canal quede vacío
  CURSOS.forEach((cursoKey, i) => {
    hilos.push(hiloBase({
      titulo: 'Dudas y avisos del curso',
      cuerpo: 'Usemos este hilo para consultas rápidas: qué entró en el examen, qué páginas hay que leer y cambios de fecha.',
      canal: cursoKey,
      cursoAutor: cursoKey
    }, i + 3));
  });

  return { eventos, hilos };
}
