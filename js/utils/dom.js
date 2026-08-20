/**
 * dom.js — Helpers mínimos de manipulación del DOM.
 */

export const $ = (selector, ctx = document) => ctx.querySelector(selector);
export const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

/** Escapa texto proveniente del usuario antes de inyectarlo como HTML. */
export function esc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Crea un elemento con atributos y contenido en una sola llamada. */
export function crear(tag, props = {}, hijos = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([clave, valor]) => {
    if (clave === 'class') el.className = valor;
    else if (clave === 'html') el.innerHTML = valor;
    else if (clave === 'text') el.textContent = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (valor !== null && valor !== undefined && valor !== false) el.setAttribute(clave, valor === true ? '' : valor);
  });
  (Array.isArray(hijos) ? hijos : [hijos]).filter(Boolean).forEach((h) => el.append(h));
  return el;
}

export function mostrar(el, visible = true) {
  if (el) el.classList.toggle('hidden', !visible);
}

/** Delegación de eventos: un único listener para muchos elementos. */
export function delegar(contenedor, evento, selector, handler) {
  contenedor.addEventListener(evento, (e) => {
    const objetivo = e.target.closest(selector);
    if (objetivo && contenedor.contains(objetivo)) handler(e, objetivo);
  });
}

/** Genera un identificador único simple. */
export function uid(prefijo = 'id') {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Iniciales de un nombre, para el avatar de reserva. */
export function iniciales(nombre = '') {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || '?';
}

/** Avatar de las publicaciones anónimas (gorro + anteojos de incógnito). */
export function avatarAnonimo() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#6b7280"/><g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 36h36"/><path d="M20 36l3.6-11a4.4 4.4 0 0 1 4.2-3h8.4a4.4 4.4 0 0 1 4.2 3L44 36"/><circle cx="24" cy="43" r="5.4"/><circle cx="40" cy="43" r="5.4"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Avatar SVG (data URI) generado a partir del nombre. */
export function avatarPorDefecto(nombre = '', semilla = '') {
  const texto = iniciales(nombre);
  const paleta = ['#20B2AA', '#00A896', '#00C49F', '#FF9F1C', '#E63946', '#2A9D8F', '#6C8EBF'];
  const base = (semilla || nombre || '?').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const color = paleta[base % paleta.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="41" font-family="Segoe UI,Arial,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${texto}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
