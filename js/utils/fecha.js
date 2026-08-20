/**
 * fecha.js — Utilidades de fechas en formato ISO (YYYY-MM-DD) y locale es-AR.
 * Se trabaja siempre con fechas "locales" para evitar corrimientos de zona horaria.
 */

const LOCALE = 'es-AR';

/** La semana arranca en domingo (columna 1) y termina en sábado (columna 7). */
export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/** Fecha de hoy en formato ISO local. */
export function hoyISO() {
  return aISO(new Date());
}

/** Date → 'YYYY-MM-DD' (sin conversión UTC). */
export function aISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → Date local (mediodía, para evitar saltos por DST). */
export function aFecha(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

/** Suma días a una fecha ISO y devuelve otra ISO. */
export function sumarDias(iso, dias) {
  const f = aFecha(iso);
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

/** Diferencia en días entre dos fechas ISO (b - a). */
export function diffDias(isoA, isoB) {
  const MS = 86400000;
  return Math.round((aFecha(isoB) - aFecha(isoA)) / MS);
}

/** Índice de día de semana con domingo = 0 (igual que Date.getDay). */
export function diaSemana(fecha) {
  return fecha.getDay();
}

/** ¿Es sábado o domingo? */
export function esFinDeSemana(fecha) {
  return fecha.getDay() === 0 || fecha.getDay() === 6;
}

/** Domingo de la semana a la que pertenece la fecha ISO. */
export function inicioSemana(iso = hoyISO()) {
  const f = aFecha(iso);
  f.setDate(f.getDate() - diaSemana(f));
  return aISO(f);
}

/** Sábado de la semana correspondiente. */
export function finSemana(iso = hoyISO()) {
  return sumarDias(inicioSemana(iso), 6);
}

/** Devuelve las 7 fechas ISO de la semana (domingo → sábado). */
export function diasDeSemana(iso = hoyISO()) {
  const domingo = inicioSemana(iso);
  return Array.from({ length: 7 }, (_, i) => sumarDias(domingo, i));
}

/**
 * Matriz de 6 semanas (42 días) que cubre el mes indicado,
 * comenzando en domingo e incluyendo días del mes anterior/siguiente.
 */
export function diasDeMes(anio, mes) {
  const primero = new Date(anio, mes, 1, 12);
  const inicio = new Date(primero);
  inicio.setDate(1 - diaSemana(primero));
  const hoy = hoyISO();
  return Array.from({ length: 42 }, (_, i) => {
    const f = new Date(inicio);
    f.setDate(inicio.getDate() + i);
    const iso = aISO(f);
    return {
      iso,
      enMes: f.getMonth() === mes,
      finde: esFinDeSemana(f),
      pasado: iso < hoy
    };
  });
}

/** 'YYYY-MM' de una fecha ISO. */
export function claveMes(iso) {
  return String(iso).slice(0, 7);
}

/** "agosto 2026" */
export function nombreMes(anio, mes) {
  return `${MESES[mes]} ${anio}`;
}

/** "vie 14 ago" */
export function formatoCorto(iso) {
  return aFecha(iso).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "viernes 14 de agosto de 2026" */
export function formatoLargo(iso) {
  return aFecha(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "14 ago 2026" */
export function formatoMedio(iso) {
  return aFecha(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Texto relativo respecto de hoy: "hoy", "mañana", "en 3 días", "hace 2 días". */
export function textoRelativo(iso, base = hoyISO()) {
  const d = diffDias(base, iso);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 1) return `en ${d} días`;
  return `hace ${Math.abs(d)} días`;
}

/** Antigüedad de un timestamp ISO completo: "hace 5 min", "hace 3 h". */
export function haceCuanto(isoCompleto) {
  const ms = Date.now() - new Date(isoCompleto).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return new Date(isoCompleto).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}

/** ¿La fecha ISO cae dentro de la semana en curso? */
export function esEstaSemana(iso, base = hoyISO()) {
  return iso >= inicioSemana(base) && iso <= finSemana(base);
}
