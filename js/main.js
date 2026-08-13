/**
 * main.js — Punto de entrada: inicializa el estado, siembra datos de ejemplo,
 * arranca la interfaz y registra el service worker (PWA).
 */

import * as store from './services/store.js';
import { generarDatosDemo } from './services/datosDemo.js';
import { iniciarApp } from './app.js';

function arrancar() {
  store.inicializar();
  store.sembrarSiHaceFalta(generarDatosDemo);
  iniciarApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}

// ── PWA: instalación offline ──
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((e) => console.info('[EduFlow] Service worker no registrado:', e.message));
  });
}

// Expuesto para depuración manual desde la consola del navegador.
window.EduFlow = { store };
