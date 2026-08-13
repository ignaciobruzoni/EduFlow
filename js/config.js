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
export const GOOGLE_CLIENT_ID = window.EDUFLOW_GOOGLE_CLIENT_ID || '';

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
  '1_A': ['Matemática', 'Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'completar'],
  '1_B': ['Matemática', 'Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'completar'],
  '2_A': ['completar'],
  '2_B': ['completar'],
  '3_A': ['completar'],
  '3_B': ['completar'],
  '4_Economia': ['Economía Política', 'Matemática', 'completar'],
  '4_Sociales': ['Sociología', 'Historia', 'completar'],
  '5_Economia': ['completar'],
  '5_Sociales': ['completar'],
  '6_Economia': ['completar'],
  '6_Sociales': ['completar']
};

/** Materias comunes que se agregan a todos los cursos (editable). */
export const MATERIAS_COMUNES = ['Educación Física', 'Inglés'];

/* ============================================================
   3. TIPOS DE EVENTO
   ============================================================ */

export const TIPOS_EVENTO = {
  tarea: {
    id: 'tarea',
    etiqueta: 'Tarea / TP',
    plural: 'Tareas y TPs',
    color: 'var(--tarea)',
    clase: 'color-tarea',
    requiereMateria: true
  },
  examen: {
    id: 'examen',
    etiqueta: 'Examen',
    plural: 'Exámenes',
    color: 'var(--examen)',
    clase: 'color-examen',
    requiereMateria: true
  },
  feriado: {
    id: 'feriado',
    etiqueta: 'Feriado / Sin clases',
    plural: 'Feriados',
    color: 'var(--feriado)',
    clase: 'color-feriado',
    requiereMateria: false
  }
};

export const ORDEN_TIPOS = ['examen', 'tarea', 'feriado'];

/* ============================================================
   4. FORO
   ============================================================ */

/** Canal abierto a todos los cursos. */
export const CANAL_GENERAL = 'general';

/* ============================================================
   5. HELPERS DE CONFIGURACIÓN
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
