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

## 4. Moderadores

Los permisos de moderación se definen en código, en `MODERADORES_CONFIG`
([`js/config.js`](js/config.js)). Se identifica al alumno por nombre, apellido,
año y modalidad:

```js
export const MODERADORES_CONFIG = [
  { nombre: 'Nombre', apellido: 'Apellido', anio: '5to', modalidad: 'Economia' },
  // ── Agregar más moderadores debajo ──
];
```

- `anio` acepta `'5'`, `'5to'` o `'5º'`; `modalidad` acepta `'Economia'` o
  `'Economía'` indistintamente (se normalizan acentos y mayúsculas).
- El nombre se compara contra el que devuelve Google, en cualquiera de los dos
  órdenes (`Nombre Apellido` o `Apellido Nombre`).

Un moderador puede:

- Eliminar publicaciones y respuestas de **su curso** y del canal **#General**.
- Eliminar eventos de su curso y los feriados globales.
- Ver cuántos **reportes** acumuló cada respuesta.

Nadie —tampoco un moderador— puede eliminar los hilos oficiales
"Dudas y avisos del curso".

> Igual que la restricción de dominio, esto es una regla de interfaz: mientras
> no exista backend, cualquiera con la consola del navegador puede saltearla.
> La verificación real tiene que hacerse del lado del servidor.

---

## 5. Estructura del proyecto

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
  services/migraciones.js  Migraciones de datos ya guardados en el navegador
  components/modal.js      Diálogos accesibles
  components/toast.js      Notificaciones
  components/anonToggle.js Selector Perfil ↔ Incógnito
  views/                   Calendario, día, historial, foro, evento, configuración, perfil, onboarding
  views/partes.js          Fragmentos compartidos (tarjeta de evento, estado vacío)
```

---

## 6. Funcionalidades

### Calendario
- Vista **mensual** (domingo → sábado) y **semanal (agenda)**.
- Cuatro tipos de evento con código de color:
  - 🟠 **Tareas / TPs** (`#FF9F1C`)
  - 🔴 **Exámenes** (`#E63946`)
  - ⚪ **Otros** (`#D1D5DB` claro / `#4B5563` oscuro) — cumpleaños, recordatorios
    y actividades generales
  - 🟢 **Feriados / días sin clases** (`#2A9D8F`)
- **Pop-up del día:** tocar cualquier celda abre un modal con todos los eventos de
  esa fecha en tamaño legible, más un botón **“+ Crear nuevo evento”** que abre el
  formulario con la fecha ya cargada. No hace falta apuntarle a los títulos chicos
  de la grilla.
- Los **días ya transcurridos** aparecen tachados con una diagonal gris, tanto en
  modo claro como oscuro.
- Alta, edición y borrado (el autor edita y borra lo suyo; un moderador puede
  borrar lo de su curso).
- Los exámenes, tareas y "Otros" se comparten **con el curso**; los feriados, **con
  todo el colegio**.

#### Completado y "Tu semana"
- La marca **“completado” existe sólo para Tareas y TPs**, es de uso personal y se
  guarda por usuario en `localStorage`.
- Los **exámenes no se marcan**: caducan por fecha y cuentan como rendidos una vez
  que pasaron.
- La barra de compleción de **“Tu semana”** mide únicamente los eventos de la semana
  **cuya fecha ya pasó** (tareas/TPs y exámenes). Lo que todavía no ocurrió queda
  fuera del porcentaje para no distorsionar la métrica.

### Historial
- Estadísticas: exámenes rendidos, tareas, días sin clases y % de tareas completadas.
- Línea de tiempo agrupada por mes, con filtros por tipo, materia, período y búsqueda.
- Rendimiento por materia y **exportación a CSV**.

### Foro
- Canal **#General** (todo el colegio) + un canal por curso.
- Cada canal de curso tiene su **hilo oficial fijo** `Dudas y avisos del curso`,
  siempre arriba de todo y no eliminable.
- Publicaciones con título, mensaje y materia opcional; respuestas, reacciones
  **“Me sirve”** (en publicaciones y en cada respuesta) y **reportes** a moderación.
- **Publicación anónima:** un selector deslizante alterna entre el ícono de perfil
  (izquierda) y el de incógnito (derecha). En incógnito la publicación o respuesta
  se guarda como `Anónimo` y no muestra ni el nombre, ni la foto, ni el curso.
- Se pueden **leer y responder los canales de otros cursos**; las publicaciones
  nuevas van a #General o al canal propio.
- Indicador de novedades en el menú lateral.

> **Sobre el anonimato:** el email del autor se conserva internamente para saber
> quién puede borrar su propia publicación, pero nunca se muestra. Como todos los
> datos viven en el navegador, el anonimato es de interfaz: con un backend real,
> la identidad tiene que quedar del lado del servidor y no viajar al cliente.

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

## 7. Dónde se guardan los datos

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
`eduflow.theme`, `eduflow.esquema_version`.

### Contenido inicial

El calendario **arranca vacío**: no hay eventos de ejemplo. Lo único que se crea
automáticamente son los hilos oficiales `Dudas y avisos del curso`, uno por cada
combinación de año y modalidad.

### Migraciones

`eduflow.esquema_version` marca la versión de los datos guardados y
[`js/services/migraciones.js`](js/services/migraciones.js) aplica los cambios
pendientes al arrancar. La migración **v1 → v2** elimina los eventos e hilos de
ejemplo que traía la primera versión (los reconoce por sus autores ficticios) sin
tocar lo que hayan cargado los alumnos.

Para empezar de cero: **Configuración → Restablecer datos**.

---

## 8. Próximos pasos sugeridos

- Completar `MATERIAS_CONFIG` con las materias reales de cada curso.
- Cargar los moderadores reales en `MODERADORES_CONFIG`.
- Backend con verificación del `id_token` y de los permisos del lado del servidor.
- Notificaciones push para exámenes próximos.
- Panel de moderación con la cola de reportes pendientes.
