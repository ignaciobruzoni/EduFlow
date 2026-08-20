/**
 * config.js — Constantes de configuración de EduFlow.
 * Este archivo está pensado para editarse fácilmente sin tocar la lógica.
 */

/* ============================================================
   1. AUTENTICACIÓN
   ============================================================
   Pegá acá el "Client ID" de Google Cloud Console
   (APIs y servicios → Credenciales → ID de cliente de OAuth 2.0 → Aplicación web).
   Acordate de agregar el dominio donde se publique la app en
   "Orígenes autorizados de JavaScript".

   Si se deja vacío, la app habilita un acceso alternativo por email
   (útil para desarrollo y para probar sin credenciales).
*/
export const GOOGLE_CLIENT_ID = '63692570401-i3qkg2s4pk98ig0b4cjh7dsh2qnto29p.apps.googleusercontent.com' || window.EDUFLOW_GOOGLE_CLIENT_ID;

/** Único dominio institucional habilitado para ingresar. */
export const DOMINIO_PERMITIDO = 'colegiosantaethnea.com.ar';

/** Sugerencia de dominio para el selector de cuentas de Google. */
export const HOSTED_DOMAIN = DOMINIO_PERMITIDO;

/* ============================================================
   2. ESTRUCTURA ACADÉMICA
   ============================================================ */

/** Años disponibles en el colegio. */
export const ANIOS = [
  { valor: '1', etiqueta: '1ro Año' },
  { valor: '2', etiqueta: '2do Año' },
  { valor: '3', etiqueta: '3ro Año' },
  { valor: '4', etiqueta: '4to Año' },
  { valor: '5', etiqueta: '5to Año' },
  { valor: '6', etiqueta: '6to Año' }
];

/** Ciclo básico (1ro a 3ro) → divisiones A y B. */
export const MODALIDADES_BASICO = [
  { valor: 'A', etiqueta: 'División A' },
  { valor: 'B', etiqueta: 'División B' }
];

/** Ciclo superior (4to a 6to) → orientaciones. */
export const MODALIDADES_SUPERIOR = [
  { valor: 'Economia', etiqueta: 'Economía' },
  { valor: 'Sociales', etiqueta: 'Sociales' }
];

/**
 * Mapa de materias por curso.
 * La clave se arma como `${anio}_${modalidad}` (ver `armarCursoKey`).
 * Reemplazá los "completar" por las materias reales de cada curso.
 */
export const MATERIAS_CONFIG = {
  '1_A': ['Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'Plástica', 'Música', "Ciudadania", "Informatica"],
  '1_B': ['Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'Plástica', 'Música', "Ciudadania", "Informatica"],
  '2_A': ['Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'Plástica', 'Música', "Ciudadania", "Informatica"],
  '2_B': ['Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'Plástica', 'Música', "Ciudadania", "Informatica"],
  '3_A': ['Biología', 'Físico-Química', 'Historia', 'Geografía', 'Prácticas del Lenguaje', 'Ciudadanía', 'Plástica', 'Música', "Informatica"],
  '3_B': ['Biología', 'Físico-Química', 'Historia', 'Geografía', 'Prácticas del Lenguaje', 'Ciudadanía', 'Plástica', 'Música', "Informatica"],
  '4_Economia': ['Biología', 'Física', 'Historia', 'Geografía', 'Literatura', 'Ciudadanía', 'S.I.C.', 'Teoría de las Org.',"Salud y Adolescencia", "NTICX"],
  '4_Sociales': ['Biología', 'Física', 'Historia', 'Geografía', 'Literatura', 'Ciudadanía', "Psicología","Salud y Adolescencia", "NTICX"],
  '5_Economia': ['Química', 'Historia', 'Geografía', 'Literatura', 'Política y Ciud.', 'S.I.C.', 'Micro y Macro', 'Derecho', "NTICX"],
  '5_Sociales': ['Historia', 'Geografía', 'Literatura', 'Política y Ciud.', "Economia Politica", "Sociologia", "Cultura, Sociedad y Comunicacion", "NTICX"],
  '6_Economia': ['Literatura', 'Trabajo y Ciud', 'Proyecto Org. (Naty)', 'Proyecto Org. (Majo)', 'Filosofía', 'Arte', 'Econ. Política', "Taller de Matematica", "Taller"],
  '6_Sociales': ['Historia', 'Geografía', 'Literatura', 'Filosofía', "Proyecto de Investigacion", "Trabajo y Ciudadania", "Arte", "Taller de Matematica", "Taller" ]
};

/** Materias comunes que se agregan a todos los cursos (editable). */
export const MATERIAS_COMUNES = ['Educación Física', 'Inglés', 'Matemática', 'Catequesis'];

/* ============================================================
   3. TIPOS DE EVENTO
   ============================================================ */

/**
 * Cada tipo declara su comportamiento, así la lógica nunca pregunta
 * por el id del tipo (`tipo === 'feriado'`) sino por la capacidad:
 *  - requiereMateria  → el formulario pide materia obligatoria.
 *  - alcanceGlobal    → se publica para todo el colegio, no sólo para el curso.
 *  - permiteCompletar → el alumno puede marcarlo como completado (uso personal).
 *  - caducaPorFecha   → se considera cumplido cuando la fecha ya pasó.
 */
export const TIPOS_EVENTO = {
  tarea: {
    id: 'tarea',
    etiqueta: 'Tarea / TP',
    plural: 'Tareas y TPs',
    color: 'var(--tarea)',
    clase: 'color-tarea',
    requiereMateria: true,
    alcanceGlobal: false,
    permiteCompletar: true,
    caducaPorFecha: false
  },
  examen: {
    id: 'examen',
    etiqueta: 'Examen',
    plural: 'Exámenes',
    color: 'var(--examen)',
    clase: 'color-examen',
    requiereMateria: true,
    alcanceGlobal: false,
    // Los exámenes sólo se leen: se dan por rendidos cuando pasa la fecha.
    permiteCompletar: false,
    caducaPorFecha: true
  },
  otro: {
    id: 'otro',
    etiqueta: 'Otros',
    plural: 'Otros',
    color: 'var(--otro)',
    clase: 'color-otro',
    // Cumpleaños, recordatorios y actividades generales: la materia es opcional.
    requiereMateria: false,
    alcanceGlobal: false,
    permiteCompletar: false,
    caducaPorFecha: false
  },
  feriado: {
    id: 'feriado',
    etiqueta: 'Feriado / Sin clases',
    plural: 'Feriados',
    color: 'var(--feriado)',
    clase: 'color-feriado',
    requiereMateria: false,
    alcanceGlobal: true,
    permiteCompletar: false,
    caducaPorFecha: false
  }
};

export const ORDEN_TIPOS = ['examen', 'tarea', 'otro', 'feriado'];

/** Tipos que admiten materia (obligatoria u opcional) en el formulario. */
export const TIPOS_CON_MATERIA_OPCIONAL = ['otro'];

/* ============================================================
   4. FORO
   ============================================================ */

/** Canal abierto a todos los cursos. */
export const CANAL_GENERAL = 'general';

/**
 * Título exacto del hilo oficial que existe en el canal de cada curso.
 * Estos hilos se crean automáticamente y no se pueden eliminar.
 */
export const HILO_OFICIAL_TITULO = 'Dudas y avisos del curso';

/* ============================================================
   5. MODERADORES
   ============================================================
   Lista configurable de alumnos con permisos de moderación.
   Se identifican por nombre + apellido + curso, así que alcanza con
   agregar una línea acá para dar de alta a un moderador nuevo.

   - `anio` acepta '5', '5to' o '5º' (se normaliza automáticamente).
   - `modalidad` acepta 'A' / 'B' para el ciclo básico y
     'Economia' / 'Economía' / 'Sociales' para el superior.
*/
export const MODERADORES_CONFIG = [
  // { nombre: 'Nombre', apellido: 'Apellido', anio: '5to', modalidad: 'Economia' },
  // ── Agregar más moderadores debajo ──
];

/** Quita acentos, espacios sobrantes y pasa a minúsculas. */
export function normalizarTexto(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** '5to' | '5º' | '5' → '5' */
export function normalizarAnio(valor = '') {
  const match = String(valor).match(/\d/);
  return match ? match[0] : '';
}

/**
 * ¿El usuario figura en MODERADORES_CONFIG?
 * @param {string} nombreCompleto  Nombre y apellido tal como llega de Google.
 * @param {Object} perfil          { anio, modalidad }
 */
export function esModeradorConfigurado(nombreCompleto, perfil) {
  if (!nombreCompleto || !perfil) return false;
  const nombreNorm = normalizarTexto(nombreCompleto);
  return MODERADORES_CONFIG.some((m) => {
    const completo = normalizarTexto(`${m.nombre} ${m.apellido}`);
    const invertido = normalizarTexto(`${m.apellido} ${m.nombre}`);
    const coincideNombre = nombreNorm === completo || nombreNorm === invertido;
    const coincideAnio = normalizarAnio(m.anio) === normalizarAnio(perfil.anio);
    const coincideModalidad = normalizarTexto(m.modalidad) === normalizarTexto(perfil.modalidad);
    return coincideNombre && coincideAnio && coincideModalidad;
  });
}

/* ============================================================
   6. HELPERS DE CONFIGURACIÓN
   ============================================================ */

/** Arma la clave de curso usada en MATERIAS_CONFIG. */
export function armarCursoKey(anio, modalidad) {
  return `${anio}_${modalidad}`;
}

/** Devuelve las modalidades válidas según el año elegido. */
export function modalidadesDeAnio(anio) {
  return Number(anio) <= 3 ? MODALIDADES_BASICO : MODALIDADES_SUPERIOR;
}

/** Etiqueta legible de un curso: "4to Año · Economía". */
export function etiquetaCurso(cursoKey) {
  if (!cursoKey) return '';
  if (cursoKey === CANAL_GENERAL) return 'General';
  const [anio, modalidad] = cursoKey.split('_');
  const anioObj = ANIOS.find((a) => a.valor === anio);
  const modObj = modalidadesDeAnio(anio).find((m) => m.valor === modalidad);
  return `${anioObj ? anioObj.etiqueta : anio + 'º'} · ${modObj ? modObj.etiqueta : modalidad}`;
}

/** Etiqueta corta para el badge del header: "4to · Economía". */
export function etiquetaCursoCorta(cursoKey) {
  if (!cursoKey) return '';
  const [anio, modalidad] = cursoKey.split('_');
  const modObj = modalidadesDeAnio(anio).find((m) => m.valor === modalidad);
  return `${anio}º · ${modObj ? modObj.etiqueta : modalidad}`;
}

/**
 * Materias de un curso, sin los placeholders "completar" duplicados
 * y con las materias comunes agregadas al final.
 */
export function materiasDeCurso(cursoKey) {
  const base = MATERIAS_CONFIG[cursoKey] || [];
  const materias = base.filter((m) => m && m.toLowerCase() !== 'completar');
  const conComunes = [...materias, ...MATERIAS_COMUNES];
  const unicas = [...new Set(conComunes)];
  // Si el curso todavía no fue cargado, se deja el placeholder visible
  // para que el alumno sepa que falta configurarlo.
  if (materias.length === 0) unicas.push('Otra materia (a completar)');
  return unicas;
}

/** Lista de todas las claves de curso disponibles. */
export const CURSOS = Object.keys(MATERIAS_CONFIG);
