/**
 * sw.js — Service worker de EduFlow.
 *
 * Estrategia:
 *  - Navegaciones (HTML): red primero, con respaldo en caché (funciona offline).
 *  - Recursos propios (CSS/JS/íconos): caché primero y actualización en segundo plano.
 *  - Terceros (Google Identity Services): siempre a la red, nunca se cachean.
 */

const VERSION = 'eduflow-v1';
const ESENCIALES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/views/auth.css',
  './css/views/calendario.css',
  './css/views/historial.css',
  './css/views/foro.css',
  './css/responsive.css',
  './js/main.js',
  './js/app.js',
  './js/config.js',
  './js/utils/dom.js',
  './js/utils/fecha.js',
  './js/services/almacenamiento.js',
  './js/services/store.js',
  './js/services/auth.js',
  './js/services/datosDemo.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/views/onboarding.js',
  './js/views/calendario.js',
  './js/views/historial.js',
  './js/views/foro.js',
  './js/views/evento.js',
  './js/views/configuracion.js',
  './js/views/perfil.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ESENCIALES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Recursos de terceros (Google): siempre en línea.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copia));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((cacheado) => {
      const red = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copia));
          }
          return res;
        })
        .catch(() => cacheado);
      return cacheado || red;
    })
  );
});
