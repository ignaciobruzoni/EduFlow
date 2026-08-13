# EduFlow · Portal de Alumnos — Colegio Santa Ethnea

Aplicación Web Progresiva (PWA) de una sola página (SPA) para que los alumnos del
Colegio Santa Ethnea coordinen **exámenes, tareas y feriados**, consulten su
**historial académico**, se comuniquen **entre cursos** en el foro y administren su
**productividad semanal**.

Construida con **HTML5 + CSS3 modular + JavaScript ES6+**, sin frameworks ni
dependencias externas: se sirve como archivos estáticos.

---

## 1. Cómo ejecutarla

La app usa módulos ES6, así que necesita servirse por HTTP (no abrir el archivo
con doble clic).

```bash
# Opción 1 — Python
python3 -m http.server 8080

# Opción 2 — Node
npx serve .
```

Luego abrir <http://localhost:8080>.

Para publicarla alcanza con subir el repositorio a cualquier hosting estático
(GitHub Pages, Netlify, Vercel, Firebase Hosting). Debe servirse por **HTTPS**
para que funcionen el login de Google y el service worker.

---

## 2. Configurar el ingreso con Google

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/) →
   **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth 2.0**.
2. Tipo de aplicación: **Aplicación web**.
3. En **Orígenes autorizados de JavaScript** agregar el dominio donde se publique
   (por ejemplo `https://portal.colegiosantaethnea.com.ar` y `http://localhost:8080`
   para desarrollo).
4. Copiar el *Client ID* y pegarlo en [`js/config.js`](js/config.js):

```js
export const GOOGLE_CLIENT_ID = '1234567890-abcdefg.apps.googleusercontent.com';
```

### Restricción de dominio

El acceso está limitado a correos que terminen en **`@colegiosantaethnea.com.ar`**.
La validación se hace en dos niveles:

- `hd: 'colegiosantaethnea.com.ar'` como sugerencia en el selector de cuentas de Google.
- Validación propia del `id_token` en `js/services/auth.js` (`esEmailInstitucional`),
  que rechaza cualquier otro dominio con un mensaje explicativo.

> **Nota de seguridad:** al ser una app 100% de cliente, esta validación es la que
> ve el usuario. Cuando se agregue un backend, hay que **volver a verificar el
> `id_token` y el dominio del lado del servidor** antes de guardar cualquier dato.

Si `GOOGLE_CLIENT_ID` queda vacío (o Google no está disponible), la pantalla de
login habilita un **acceso alternativo por email** —pensado para desarrollo— que
aplica exactamente la misma restricción de dominio.

---

## 3. Cargar las materias de cada curso

Las materias viven en una única constante, pensada para editarse sin tocar la
lógica, en [`js/config.js`](js/config.js):

```js
export const MATERIAS_CONFIG = {
  '1_A': ['Matemática', 'Cs. Naturales', 'Cs. Sociales', 'Prácticas del Lenguaje', 'completar'],
  '4_Economia': ['Economía Política', 'Matemática', 'completar'],
  // …
};
```

- La clave se arma como `` `${año}_${modalidad}` ``.
- Años **1 a 3** → modalidades `A` / `B`. Años **4 a 6** → `Economia` / `Sociales`.
- Los valores `'completar'` son marcadores de posición: se ignoran al mostrar el
  listado y se reemplazan por las materias reales cuando estén definidas.
- `MATERIAS_COMUNES` agrega materias que se dictan en todos los cursos
  (por defecto Educación Física e Inglés).

---

## 4. Estructura del proyecto

```
index.html                 Estructura de la SPA (login, onboarding y app)
manifest.webmanifest       Manifiesto PWA
sw.js                      Service worker (caché offline)
assets/icons/              Íconos de la aplicación

css/
  variables.css            Design tokens: colores, tipografía, espaciado, temas
  base.css                 Reset, tipografía base y utilidades
  layout.css               Grilla principal, sidebar y header
  components.css           Botones, tarjetas, formularios, modal, toasts
  responsive.css           Adaptaciones para tablet y móvil
  views/                   Estilos propios de cada vista

js/
  config.js                Client ID, dominio, años, modalidades y MATERIAS_CONFIG
  main.js                  Punto de entrada
  app.js                   Pantallas, ruteo y layout
  utils/dom.js             Helpers de DOM y escapado de HTML
  utils/fecha.js           Utilidades de fechas (es-AR)
  services/almacenamiento.js  Persistencia (localStorage)
  services/store.js        Estado central observable + acciones
  services/auth.js         Google Identity Services + validación de dominio
  services/datosDemo.js    Contenido de ejemplo inicial
  components/modal.js      Diálogos accesibles
  components/toast.js      Notificaciones
  views/                   Calendario, historial, foro, evento, configuración, perfil, onboarding
```

---

## 5. Funcionalidades

### Calendario
- Vista **mensual** y **semanal (agenda)**.
- Tres tipos de evento con código de color:
  - 🟠 **Tareas / TPs** (`#FF9F1C`)
  - 🔴 **Exámenes** (`#E63946`)
  - 🟢 **Feriados / días sin clases** (`#2A9D8F`)
- Alta, edición y borrado (sólo el autor puede editar o borrar lo que publicó).
- Los exámenes y tareas se comparten **con el curso**; los feriados, **con todo el colegio**.
- Panel de **productividad semanal**: anillo de progreso, pendientes, completadas
  y próximos 14 días.

### Historial
- Estadísticas: exámenes rendidos, tareas, días sin clases y % de cumplimiento.
- Línea de tiempo agrupada por mes, con filtros por tipo, materia, período y búsqueda.
- Rendimiento por materia y **exportación a CSV**.

### Foro
- Canal **#General** (todo el colegio) + un canal por curso.
- Publicaciones con título, mensaje y materia opcional; respuestas y reacciones.
- Se pueden **leer y responder los canales de otros cursos**; las publicaciones
  nuevas van a #General o al canal propio.
- Indicador de novedades en el menú lateral.

### Interfaz
- **Modo claro / oscuro** con transición suave (`background-color 0.3s, color 0.3s`),
  respeta la preferencia del sistema y se recuerda entre sesiones.
- Sidebar colapsable (íconos) en escritorio y menú deslizante en móvil.
- Configuración: tema, visibilidad por tipo de evento y por materia, cambio de
  curso, cierre de sesión y restablecimiento de datos.
- Responsive, accesible (roles ARIA, foco visible, navegación por teclado) e
  instalable como PWA con soporte offline.
- Atajos: `N` nuevo evento · `1` `2` `3` cambiar de pestaña.

---

## 6. Dónde se guardan los datos

Hoy toda la información se guarda en el **`localStorage` del navegador**, detrás de
`js/services/almacenamiento.js`. Eso significa que los datos son por dispositivo:
sirve para probar la app completa, pero todavía **no hay sincronización real entre
alumnos**.

Para conectar un backend (Firebase, Supabase o uno propio) alcanza con reemplazar
las funciones de `almacenamiento.js` y las acciones de `store.js` que las usan
(`crearEvento`, `actualizarEvento`, `eliminarEvento`, `crearHilo`, `responderHilo`…).
El resto de la app consume el estado a través de `store.suscribir()`, así que no
necesita cambios.

Claves usadas: `eduflow.sesion`, `eduflow.perfiles`, `eduflow.eventos`,
`eduflow.hilos`, `eduflow.prefs.<email>`, `eduflow.completados.<email>`,
`eduflow.theme`.

La primera vez que se abre la app se cargan datos de ejemplo
(`js/services/datosDemo.js`) para que el calendario y el foro no queden vacíos.
Se pueden borrar desde **Configuración → Restablecer datos**.

---

## 7. Próximos pasos sugeridos

- Completar `MATERIAS_CONFIG` con las materias reales de cada curso.
- Backend con verificación del `id_token` del lado del servidor.
- Notificaciones push para exámenes próximos.
- Roles (delegado / preceptor) para moderar publicaciones.
