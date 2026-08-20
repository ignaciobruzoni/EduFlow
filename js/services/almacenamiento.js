/**
 * almacenamiento.js — Capa de persistencia sobre localStorage.
 *
 * Toda la app pasa por acá, así que reemplazar localStorage por una API real
 * (Firebase, Supabase, backend propio) sólo implica cambiar este archivo
 * y las funciones de `store.js` que lo consumen.
 */

const PREFIJO = 'eduflow.';
let memoria = {}; // Respaldo en memoria si localStorage no está disponible
let disponible = true;

try {
  const prueba = `${PREFIJO}__test`;
  localStorage.setItem(prueba, '1');
  localStorage.removeItem(prueba);
} catch (e) {
  disponible = false;
  console.warn('[EduFlow] localStorage no disponible: los datos no se guardarán entre sesiones.');
}

export function leer(clave, porDefecto = null) {
  const full = PREFIJO + clave;
  try {
    const bruto = disponible ? localStorage.getItem(full) : memoria[full];
    if (bruto === null || bruto === undefined) return porDefecto;
    return JSON.parse(bruto);
  } catch (e) {
    console.warn(`[EduFlow] No se pudo leer "${clave}"`, e);
    return porDefecto;
  }
}

export function escribir(clave, valor) {
  const full = PREFIJO + clave;
  const bruto = JSON.stringify(valor);
  try {
    if (disponible) localStorage.setItem(full, bruto);
    else memoria[full] = bruto;
  } catch (e) {
    console.warn(`[EduFlow] No se pudo guardar "${clave}"`, e);
  }
}

export function borrar(clave) {
  const full = PREFIJO + clave;
  try {
    if (disponible) localStorage.removeItem(full);
    else delete memoria[full];
  } catch (e) { /* sin acción */ }
}

/** Borra todas las claves de la app (usado por "restablecer datos"). */
export function limpiarTodo() {
  try {
    if (disponible) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIJO))
        .forEach((k) => localStorage.removeItem(k));
    } else {
      memoria = {};
    }
  } catch (e) { /* sin acción */ }
}

export const CLAVES = {
  tema: 'theme',
  sesion: 'sesion',
  perfiles: 'perfiles',
  eventos: 'eventos',
  hilos: 'hilos',
  esquema: 'esquema_version',
  prefs: (email) => `prefs.${email}`,
  completados: (email) => `completados.${email}`,
  visitaForo: (email) => `visitaForo.${email}`
};
