/**
 * auth.js — Inicio de sesión con Google (Google Identity Services)
 * y validación estricta del dominio institucional.
 */

import { GOOGLE_CLIENT_ID, DOMINIO_PERMITIDO, HOSTED_DOMAIN } from '../config.js';

/** Verifica que el correo pertenezca al dominio del colegio. */
export function esEmailInstitucional(email) {
  return typeof email === 'string' &&
    email.trim().toLowerCase().endsWith(`@${DOMINIO_PERMITIDO}`);
}

/** Mensaje único de rechazo por dominio inválido. */
export function mensajeDominioInvalido(email) {
  return `El correo ${email || 'ingresado'} no pertenece al dominio institucional. ` +
    `Sólo se permite el acceso con cuentas @${DOMINIO_PERMITIDO}. ` +
    'Cerrá sesión de tu cuenta personal de Google e ingresá con la del colegio.';
}

/** Decodifica el payload de un JWT (id_token) de Google. */
export function decodificarJWT(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error('[EduFlow] No se pudo decodificar el token de Google', e);
    return null;
  }
}

/** Espera a que el script de Google Identity Services esté disponible. */
function esperarGoogle(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
    const inicio = Date.now();
    const id = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(id);
        resolve(true);
      } else if (Date.now() - inicio > timeoutMs) {
        clearInterval(id);
        resolve(false);
      }
    }, 120);
  });
}

/**
 * Inicializa el botón de Google.
 *
 * @param {Object} opciones
 * @param {HTMLElement} opciones.contenedor  Nodo donde se dibuja el botón.
 * @param {Function} opciones.onExito        Recibe { email, nombre, foto, sub }.
 * @param {Function} opciones.onError        Recibe un mensaje de error legible.
 * @param {Function} opciones.onNoDisponible Se llama si Google no puede usarse.
 */
export async function iniciarGoogle({ contenedor, onExito, onError, onNoDisponible }) {
  if (!GOOGLE_CLIENT_ID) {
    console.info('[EduFlow] Sin GOOGLE_CLIENT_ID configurado: se habilita el acceso alternativo.');
    onNoDisponible('Configurá GOOGLE_CLIENT_ID en js/config.js para habilitar el ingreso con Google.');
    return;
  }

  const listo = await esperarGoogle();
  if (!listo) {
    onNoDisponible('No se pudo contactar a Google. Revisá tu conexión o usá el acceso alternativo.');
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      // Sugiere el dominio institucional en el selector de cuentas.
      // La validación real se hace igual del lado de la app.
      hd: HOSTED_DOMAIN,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (respuesta) => {
        const datos = decodificarJWT(respuesta.credential);
        if (!datos) {
          onError('No se pudo validar la respuesta de Google. Intentá nuevamente.');
          return;
        }
        const email = (datos.email || '').toLowerCase();

        if (datos.email_verified === false) {
          onError('Tu correo de Google no está verificado.');
          window.google.accounts.id.disableAutoSelect();
          return;
        }

        // ── Restricción estricta de dominio ──
        if (!esEmailInstitucional(email)) {
          onError(mensajeDominioInvalido(email));
          window.google.accounts.id.disableAutoSelect();
          return;
        }

        onExito({
          email,
          nombre: datos.name || email.split('@')[0],
          foto: datos.picture || '',
          sub: datos.sub
        });
      }
    });

    window.google.accounts.id.renderButton(contenedor, {
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'pill',
      width: 320,
      text: 'signin_with',
      locale: 'es'
    });
  } catch (e) {
    console.error('[EduFlow] Error al inicializar Google Identity Services', e);
    onNoDisponible('No se pudo inicializar el ingreso con Google.');
  }
}

/** Cierra la sesión del lado de Google (evita el auto-login inmediato). */
export function cerrarSesionGoogle() {
  try {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  } catch (e) { /* sin acción */ }
}
