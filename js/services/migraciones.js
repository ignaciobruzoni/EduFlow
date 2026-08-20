/**
 * migraciones.js — Actualizaciones de datos ya guardados en el navegador.
 *
 * Cada vez que cambia la forma de los datos se sube ESQUEMA_ACTUAL y se agrega
 * el paso correspondiente. Las migraciones son idempotentes: correr dos veces
 * la misma no rompe nada.
 */

/** Versión de esquema que espera esta build. */
export const ESQUEMA_ACTUAL = 2;

/**
 * Autores de los eventos e hilos de ejemplo que traía la v1.
 * Se recalculan con la misma fórmula que usaba `datosDemo.js` para poder
 * identificarlos y borrarlos sin tocar el contenido real de los alumnos.
 */
const NOMBRES_DEMO_V1 = [
  'Delegado/a de curso', 'Martina Álvarez', 'Joaquín Pérez', 'Sofía Ramírez',
  'Tomás Gutiérrez', 'Valentina Ruiz', 'Bruno Castro'
];

const EMAILS_DEMO_V1 = new Set(
  NOMBRES_DEMO_V1.map((nombre) => {
    const local = nombre.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    return `${local}@colegiosantaethnea.com.ar`;
  })
);

const esAutorDemo = (item) => Boolean(item && item.autor && EMAILS_DEMO_V1.has(item.autor.email));

/**
 * v1 → v2: elimina los eventos y los hilos de ejemplo.
 * Los hilos oficiales ("Dudas y avisos del curso") no se borran acá: el store
 * los vuelve a crear con el formato nuevo en `asegurarHilosOficiales()`.
 *
 * @returns {{ eventos: Array, hilos: Array, borrados: number }}
 */
export function purgarDatosDemoV1(eventos = [], hilos = []) {
  const eventosLimpios = eventos.filter((e) => !esAutorDemo(e));
  const hilosLimpios = hilos.filter((h) => !esAutorDemo(h));
  const borrados = (eventos.length - eventosLimpios.length) + (hilos.length - hilosLimpios.length);
  return { eventos: eventosLimpios, hilos: hilosLimpios, borrados };
}

/**
 * Aplica todas las migraciones pendientes.
 * @param {number} versionGuardada  Versión encontrada en el almacenamiento.
 * @param {{eventos: Array, hilos: Array}} datos
 */
export function migrar(versionGuardada, datos) {
  let { eventos, hilos } = datos;
  let cambio = false;

  if (versionGuardada < 2) {
    const resultado = purgarDatosDemoV1(eventos, hilos);
    eventos = resultado.eventos;
    hilos = resultado.hilos;
    cambio = true;
    if (resultado.borrados) {
      console.info(`[EduFlow] Migración v2: se eliminaron ${resultado.borrados} elementos de ejemplo.`);
    }
  }

  // Normaliza campos agregados después de la v1 para que las vistas no
  // tengan que defenderse de datos viejos.
  hilos = hilos.map((h) => ({
    ...h,
    likes: h.likes || [],
    respuestas: (h.respuestas || []).map((r) => ({ ...r, likes: r.likes || [], reportes: r.reportes || [] }))
  }));

  return { eventos, hilos, cambio, version: ESQUEMA_ACTUAL };
}
