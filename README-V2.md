# Handicapper — README V2 (Estado, sistema social y hoja de ruta por fases)

> **Cómo leer este documento.** Este README V2 **complementa** al `README.md`
> original (V1), no lo reemplaza. En **V1** está el contexto base y **no se repite
> aquí**: qué es Handicapper, filosofía de trabajo, equipo/negocio, planes/precios,
> stack, capa de datos (ESPN + TheSportsDB), `firebase-config`, el **motor de
> probabilidad** y el **dashboard 16:9** de detalle.
>
> **V2** documenta **todo lo construido después** de esa foto: el **sistema social
> de analistas**, el **panel admin ampliado**, el **área Premium de señales**, el
> **menú Premium con fotos**, los **ajustes de perfil**, la **moderación de
> enlaces**, los **reportes**, las **reglas de Firebase actualizadas**, los
> **assets nuevos** (incluidas las fotos de analista), los **problemas graves de
> prioridad 1** que faltan por arreglar, y **la estructura por fases con el punto
> exacto donde nos quedamos**.

---

## Índice

1. [Convenciones de trabajo vigentes](#1-convenciones-de-trabajo-vigentes)
2. [Sistema social de analistas (visión general)](#2-sistema-social-de-analistas-visión-general)
3. [Colecciones Firestore y capa de datos social (`mesa-datos.js`)](#3-colecciones-firestore-y-capa-de-datos-social-mesa-datosjs)
4. [Panel administrativo “mesa” (estado actual)](#4-panel-administrativo-mesa-estado-actual)
5. [Área Premium de señales (usuario) — `senales.js`](#5-área-premium-de-señales-usuario--senalesjs)
6. [Menú Premium y proyecciones (barra superior)](#6-menú-premium-y-proyecciones-barra-superior)
7. [Perfil de usuario y ajustes](#7-perfil-de-usuario-y-ajustes)
8. [Detalle de partido — Casa/Fuera](#8-detalle-de-partido--casafuera)
9. [Firebase — reglas actuales (conjunto completo publicado)](#9-firebase--reglas-actuales-conjunto-completo-publicado)
10. [Assets nuevos (fotos de analista, iconos, fondos)](#10-assets-nuevos-fotos-de-analista-iconos-fondos)
11. [PRIORIDAD 1 — problemas graves por arreglar](#11-prioridad-1--problemas-graves-por-arreglar)
12. [Hoja de ruta por FASES (dónde nos quedamos)](#12-hoja-de-ruta-por-fases-dónde-nos-quedamos)
13. [Pendiente de verificar EN VIVO](#13-pendiente-de-verificar-en-vivo)
14. [Recordatorios para el próximo asistente](#14-recordatorios-para-el-próximo-asistente)

---

## 1. Convenciones de trabajo vigentes

Además de las de V1 §1, se reforzaron estas reglas durante el desarrollo del
sistema social. **Cúmplelas siempre:**

- **Idioma de la web:** **inglés por defecto** en TODA la página pública (vía
  `L()` / `idiomaActual()`). Solo pasa a español si el usuario cambia el idioma en
  **su perfil**. Nunca dejar algo solo en español “por defecto”.
- **Panel admin “mesa”:** **español por defecto** (vía `_mesaLang` + `ML(en, es)`),
  porque lo usamos nosotros.
- **La conversación de trabajo** va en español; **las entregas** son solo los
  archivos modificados con **ruta exacta** (sin zip), explicaciones mínimas.
- **Verificación obligatoria antes de entregar:** responsividad en **móvil (390px)**,
  **tablet** y **web (≥1000px)** con render real (Playwright). “No dejar ni un solo
  detalle”.
- **Estética:** sin em-dashes entre oraciones; sin emojis en UI seria; sin framing
  de “caridad/apoyo”; nada de corazones ni rosa; nada de ventanas nativas sin
  estilo; modales y filas nunca desfasados en móvil.
- **Modularidad:** función/área nueva = archivo nuevo; no engordar innecesariamente.

---

## 2. Sistema social de analistas (visión general)

Sobre la plataforma base se construyó un **sistema social completo** para que
analistas verificados publiquen **señales** (pronósticos con análisis) y los
usuarios **Premium** las consuman:

- **Dos roles** dentro del panel: **admin** (ve todo) y **analista** (ve solo su
  *Analysis Hub*).
- Cada analista tiene una **firma** (alias público), un **deporte** asignado y un
  **estilo visual** propio para sus tarjetas (color, intensidad, emblema).
- Los usuarios pueden **seguir** analistas, dar **like/dislike** a señales,
  **suscribirse** a un analista por **$2/mes** (apoyo directo) y **reportar** una
  señal.
- El acceso a las señales es **exclusivo del plan Premium** ($8.99/mes).

### Estilo de firma — `assets/js/ui/estilo-senal.js`
- `PALETA` (8 colores), `INTENSIDADES` = `['subtle','normal','strong']`,
  `EMBLEMAS` + `EMBLEMA_NOMBRE`.
- `estiloSeguro(e)` normaliza un estilo; `estiloAttrs(e)` genera las variables CSS.
- El estilo del analista se guarda en su ficha y se **estampa** en cada señal.

---

## 3. Colecciones Firestore y capa de datos social (`mesa-datos.js`)

**Archivo:** `assets/js/mesa/mesa-datos.js`. Es la capa de acceso a Firestore del
sistema social. `_obtenerStore()` devuelve el módulo Firestore completo
(`doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
increment, serverTimestamp, query, where, getCountFromServer`, …).

### Colecciones nuevas
| Colección | ID del documento | Contenido / propósito |
|---|---|---|
| `analistas` | `uid` | Ficha del analista: `{uid, email, deporte, activo, nombre, firma, estilo, estiloAuto}`. |
| `analisis` | id del partido | Señal publicada: equipos, veredicto, prob, favorito, confianza, mercado, texto, deporte, **autor/firma/autorUid**, estilo, actualizado. |
| `seguimientos` | auto | `{seguidorUid, analistaUid, …}` — un “seguir”. |
| `votos` | `${uid}__${signalId}` | `{uid, signalId, valor: 1 | -1, fecha}`. |
| `apoyos` | `${uid}__${analistaUid}` | Suscripción $2/mes a un analista: `{activo, precio:2, corteAnalista:1, cortePlataforma:1, inicio, vence, metodo}`. |
| `config/moderacion` | doc fijo | Lista de palabras prohibidas que edita el admin. |
| `reportes` | **`uid`** (1 por usuario) | Reporte de señal: `{signalId, firma, autorUid, motivo, comentario, reportadoPor, correo, estado, creado}`. |

### Funciones principales (por área)
- **Señales:** `guardarAnalisis(matchId, analisis)` (preserva `autorUid` al editar),
  `listarAnalisis()`, `borrarAnalisis(id)`.
- **Analistas:** `esAnalista()`, `listarAnalistas()`, `guardarAnalista()`,
  `fijarAnalista(uid, patch)` (guarda `estilo` y `estiloAuto`),
  `eliminarAnalista()`.
- **Seguidores:** `seguirAnalista`, `dejarDeSeguir`, `sigueA`, `misSeguidos`,
  `contarSeguidores`.
- **Votos:** `votarSenal`, `quitarVoto`, `misVotos`, `contarVotos`.
- **Apoyos ($2/mes):** `apoyarAnalista`, `cancelarApoyo`, `apoyoActivo`,
  `misApoyos`, `contarApoyos`, `resumenIngresos` (para el panel de ingresos).
- **Moderación:** `leerModeracion`, `guardarModeracion`.
- **Reportes:** `reportarSenal(signalId, datos)` (usa `setDoc` con id = uid →
  **un solo reporte por usuario**), `miReporte()`, `listarReportes()`,
  `resolverReporte(id, estado)`, `borrarReporte(id)`.

> **Cobro real:** los apoyos y las suscripciones hoy usan `metodo:'preview'`
> (registro sin cobrar). El cobro efectivo queda **pendiente de Stripe** (backend/
> webhook), igual que en V1 §9.

---

## 4. Panel administrativo “mesa” (estado actual)

**Archivo:** `assets/js/mesa/mesa.js` + `assets/css/mesa.css`. Español por defecto
(`_mesaLang` + `ML`). Navegación de **admin**: **Overview, Users, Analysis (Hub),
Staff, Monitoring, Moderation, Reports**. El **analista** solo ve **Analysis Hub**.

### Bloque 1 — Analysis Hub (HECHO)
- Se quitó el subtítulo de relleno.
- La métrica “Favorito prom.” se reemplazó por un **botón “Señales publicadas”**
  (ojo dorado) que abre un **modal grande responsivo** con todas las señales.
- Cada señal tiene **Editar** y **Eliminar**.
- **Editar** abre un modal (ganador, probabilidad, confianza, mercado, análisis)
  que **guarda sin cambiar el autor** (se preserva `autorUid`) y pasa por
  moderación.
- **Eliminar** pide confirmación (“¿Estás seguro que quieres eliminar esta señal?”).

### Bloque 2 — Publicar señal (HECHO)
- El selector nativo de **“Mercado principal”** se reemplazó por un **dropdown
  propio** con estilo (`.anm2-dd`, input oculto `#anm-mkt`).
- Botón **“Estilo / Vista previa”** al lado de **“Publicar señal”**.
- Al publicar aparece el modal **“Así se verá tu señal”** (`estp-*`): vista previa
  real (vía `tarjetaMuestra` con los datos escritos) + controles de color,
  intensidad y emblema + switch **“Mantener mis cambios para próximas señales”**
  (guarda `estiloAuto`; si está activo, las siguientes señales se publican directo
  sin volver a mostrar la ventana).
- **Bug corregido (importante):** los tokens `--m-*` (incl. `--m-oro`) estaban solo
  en `#mesa-screen`, pero los modales se dibujan en `document.body`; se definieron
  también en `:root` para que **todos** los modales del panel muestren bien sus
  botones dorados.

### Bloque 3 — Moderación de enlaces/publicidad (HECHO)
- `assets/js/datos/moderacion.js`: además de la lista de palabras, `detectarPublicidad(texto)`
  bloquea **enlaces** (`http(s)://`, `www.`, incluso troceados como `w w w . x . com`),
  **dominios** (`nombre.com/.net/.org/.io/.bet…` y “punto com” escrito), **nombres de
  casas de apuestas/estadísticas** (bet365, betway, flashscore, sofascore…, incluso
  partidos por letras `b e t 3 6 5`) y **contactos/redes** (telegram, whatsapp,
  instagram, `t.me/…`).
- Devuelve el **motivo** (enlace / sitio / contacto) y se muestra al usuario. Se
  aplica **al publicar y al editar** (`_revisarAnalisis` en `mesa.js`).

### Monitoring — Ingresos (HECHO, Fase 8 previa)
- Dentro de **Monitoring**, `_bloqueIngresos()` muestra KPIs (suscriptores, para
  analistas, para plataforma, total) y una tabla por analista con el desglose $1/$1,
  a partir de la colección `apoyos` (`resumenIngresos`).

### Bloque 5 (parte admin) — Reports (HECHO)
- Nueva sección **Reports** (junto a Moderation), con **contador de abiertos** en el
  menú, KPIs (Total / Abiertos / Resueltos) y una tarjeta por reporte con **motivo,
  comentario, correo, fecha** y botones **Resolver / Reabrir** y **Eliminar**.
- Si se **elimina** un reporte, ese usuario podrá enviar uno nuevo.

---

## 5. Área Premium de señales (usuario) — `senales.js`

**Archivo:** `assets/js/ui/senales.js`. Feed social visible solo para Premium
(`planActual()==='premium'`).

### Feed
- **Pestañas:** Home / Following / Popular (Popular ordena por likes; conteos
  cargados por adelantado). Los seguidos aparecen primero.
- **Discover analysts:** franja de tarjetas de analistas (derivadas de los autores
  de las señales) con botón **Follow** (se sincronizan todos los botones del mismo
  analista).
- **Tarjeta de señal** (`.sn-card`): emblema + firma dorada, seguidores, análisis
  **colapsable**, **like/dislike** con conteos, botón **“Señales por $2/mes”**
  (apoyo profesional, sin corazones ni rosa) y **Reportar**.

### Bloque 5 (parte usuario) — like/dislike + Reportar (HECHO)
- **Like/dislike** ahora responde **al instante**: el número sube/baja de inmediato
  (actualización optimista) + animación de “pop”; luego se sincroniza con el
  servidor. Volver a tocar quita el voto.
- **Reportar** (icono de bandera): **un solo reporte por usuario**. Si ya reportó,
  el botón abre un modal que invita al **grupo de Telegram**
  **https://t.me/TraderRecord** (“Join Telegram”). Motivos: contenido engañoso,
  spam/publicidad, lenguaje ofensivo, otro.

### Fase 2 — Limpieza del área de señales (HECHO)
- Se quitaron **todos** los textos de arriba (píldora con punto, título repetido,
  subtítulo y cápsula del disclaimer). Ya no hay que hacer scroll para ver a los
  analistas.
- **“Discover analysts” quedó hasta arriba**, seguido de las pestañas y las señales.
- **Botón “What is this section?”** en la esquina superior derecha (solo en esta
  sección) → abre la explicación + el disclaimer.
- El **disclaimer** es ahora un **aviso emergente** que sale la **primera vez**
  (se recuerda en `localStorage: sn_info_visto`) y se puede cerrar; siempre queda
  disponible en el botón “What is this section?”.

---

## 6. Menú Premium y proyecciones (barra superior)

**Archivos:** `index.html` (menú) + `assets/css/app.css` (estilos) + proyecciones en
`assets/js/ui/parlay.js` y `assets/js/analisis/*`.

### Bloque 6 + Fase 1 — Botón e iconos (HECHO)
- **Botón “Premium”** con **tornasol real**: dorado con reflejo champán que se
  desplaza **muy lento (9s, `ease-in-out alternate`), sin corte** (el degradado abre
  y cierra en el mismo tono). Hover **muy sutil** (nada de brillo agresivo).
  Keyframes: `premTornasol`.
- **Badges “PRO”** (en Hits/Goals/Points/Shots): **mismo tornasol** que el botón.
- Los **5 iconos** del menú usan **fotos** con respaldo automático: intentan `.png`,
  luego `.jpg`, y si aún no existen muestran el emoji/estrella (no se rompe nada).
  Mapa: `hit`→Hits, `goal`→Goals, `puntos`→Points, `shots`→Shots, `signals`→Analyst
  signals. (Ver §10.)

### Proyecciones (Hits / Goals / Points / Shots)
- Config en `assets/js/ui/parlay.js`: cada tarjeta llama a su motor
  (`topParlayHits`, `topGoalProjection`, `topPointsProjection`, `topShotsProjection`)
  con `n: 9`. **Estado: DEFICIENTE — ver §11 (prioridad 1).**

---

## 7. Perfil de usuario y ajustes

**Archivos:** `assets/js/app.js` (menú de cuenta “J”) + `assets/js/auth/auth.js` +
`assets/css/app.css` + `index.html`.

### Bloque 4 — Perfil (HECHO)
- **“Cambiar idioma”** se movió **al menú del perfil** (ya no está en el header
  principal). Muestra “Idioma · ES/EN” y alterna al tocarlo. Los botones de idioma
  de las pantallas **pre-login** (bienvenida/planes) se mantienen.
- Nuevo **“Ajustes de perfil”** → modal responsivo (botón **Aplicar**) para cambiar
  **Nombre, Nombre de usuario, Correo y Contraseña** (sin foto).
- Para cambiar correo/contraseña aparece **“Contraseña actual”** (Firebase lo exige;
  reautenticación). Mensajes de error claros.
- **Cuentas de Google:** correo y contraseña bloqueados con nota (los gestiona
  Google); nombre y usuario sí editables.
- `auth.js`: `actualizarPerfil({nombre, usuario, email, password, passwordActual})`
  y `esCuentaGoogle()`. El doc `usuarios/{uid}` ahora guarda también **`usuario`**
  (nombre de usuario).

---

## 8. Detalle de partido — Casa/Fuera

**Archivos:** `assets/js/ui/vistas.js` + `assets/css/dashboard.css`.

### Bloque 7 — Casa/Fuera (HECHO)
- En la pestaña **“Estadísticas”**, las filas pasaron de “Casa/Fuera” a **“En casa”**
  (icono de casa) y **“De visita”** (icono de avión), para que se entienda que son
  el registro de cada equipo jugando en casa/como visitante.
- En **“Rendimiento”**, los badges que estaban **grises** con letras “C/F” ahora
  usan el **color de cada equipo** (azul local / rojo visitante) con iconos. Los
  valores de la tabla ya salían en color por equipo y se mantienen.

---

## 9. Firebase — reglas actuales (conjunto completo publicado)

`projectId: handicappper` (ver V1 §7). Conjunto **completo** publicado (incluye ya
el bloque `reportes`). Si hay que republicar, este es el estado vigente:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    function esAnalista() {
      return request.auth != null
        && exists(/databases/$(database)/documents/analistas/$(request.auth.uid))
        && get(/databases/$(database)/documents/analistas/$(request.auth.uid)).data.activo == true;
    }
    function deporteAnalista() {
      return get(/databases/$(database)/documents/analistas/$(request.auth.uid)).data.deporte;
    }
    function esPremium() {
      return request.auth != null
        && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid))
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.suscripcion != null
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.suscripcion.activo == true
        && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.suscripcion.plan == 'premium';
    }
    match /admins/{uid} { allow read: if esAdmin(); allow write: if false; }
    match /analistas/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow create, update, delete: if esAdmin();
    }
    match /usuarios/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow delete: if esAdmin();
    }
    match /analisis/{id} {
      allow read: if esAdmin() || esAnalista() || esPremium();
      allow create: if esAdmin() || (esAnalista() && request.resource.data.deporte == deporteAnalista());
      allow update: if esAdmin() || (esAnalista() && resource.data.deporte == deporteAnalista());
      allow delete: if esAdmin() || (esAnalista() && resource.data.deporte == deporteAnalista());
    }
    match /seguimientos/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.seguidorUid == request.auth.uid;
      allow delete: if request.auth != null && resource.data.seguidorUid == request.auth.uid;
      allow update: if false;
    }
    match /config/{doc} { allow read: if esAdmin() || esAnalista(); allow write: if esAdmin(); }
    match /votos/{id} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && (request.resource.data.valor == 1 || request.resource.data.valor == -1);
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    match /apoyos/{id} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    match /reportes/{uid} {
      allow create: if request.auth != null && request.auth.uid == uid;
      allow read:   if request.auth != null && (request.auth.uid == uid || esAdmin());
      allow update, delete: if esAdmin();
    }
  }
}
```

> **Probar Premium sin Stripe:** poner a mano `usuarios/{uid}.suscripcion =
> {activo:true, plan:'premium'}`. Las colecciones se auto-crean al primer uso.

---

## 10. Assets nuevos (fotos de analista, iconos, fondos)

### Fotos de perfil de analista (Fase 4) — **decisión tomada**
- **Formato:** `.webp` (pesan muy poco). **Nombres en minúscula.**
- **Masculinas (20):** `a.webp, b.webp, c.webp, d.webp, e.webp, f.webp, g.webp,
  h.webp, i.webp, j.webp, k.webp, l.webp, m.webp, n.webp, o.webp, p.webp, q.webp,
  r.webp, s.webp, t.webp` (de la **a** a la **t**; **sin ñ**, GitHub no la admite).
- **Femeninas (10):** `aa.webp, bb.webp, cc.webp, dd.webp, ee.webp, ff.webp, gg.webp,
  hh.webp, ii.webp, jj.webp` (letras dobles).
- **Total: 30 fotos.** GitHub/GitHub Pages sirve sin problema nombres de una o dos
  letras en minúscula.
- **Carpeta propuesta:** `assets/imagenes/analistas/`.
- **Uso:** el analista **debe** elegir una en su panel (obligatorio); se guarda en
  su ficha/`usuarios` (queda guardada de verdad, no solo en caché del navegador) y
  se muestra en su tarjeta y en “Discover analysts”.

### Iconos del menú Premium (Bloque 6) — `assets/imagenes/`
`hit`, `goal`, `puntos`, `shots`, `signals` (minúscula). `.png` recomendado (o
`.jpg`; el código prueba ambos y cae al emoji/estrella si faltan).

### Fondos de proyección — `assets/imagenes/fondos/`
`fondo-hits.jpg`, `fondo-goals.jpg`, `fondo-points.jpg`, `fondo-shots.jpg`.
(Pendiente confirmar que estén subidos todos; se reportó faltante `fondo-shots.jpg`.)

---

## 11. PRIORIDAD 1 — problemas graves por arreglar

> Estos problemas hacen que el **corazón del producto** (área Premium de
> proyecciones) **no cumpla su propósito**. Son de máxima prioridad.
> **Archivos:** `assets/js/ui/parlay.js` (UI) y
> `assets/js/analisis/{mlb-parlay,soccer-goal,nba-points,nhl-shots,nucleo}.js` (motores).

1. **Hits muestra 3 jugadores en vez de 9 al entrar.**
   Al abrir “Hits” (tras refrescar y verificar caché) aparecen **solo 3 bateadores**;
   los otros 6 llegan “con suerte, más tarde”. Se pide `n: 9` pero la carga inicial
   entrega pocos (parece demo/estático). **Debe mostrar los 9 de una**, sin dar la
   impresión de que “eso es lo que hay”.

2. **No selecciona a los mejores por probabilidad de hit.**
   Mete jugadores **promedio/básicos** y **omite estrellas** con average altísimo.
   Ejemplos de jugadores que **debería** priorizar (dados por el dueño): Luis Arráez,
   Otto López, Elly De La Cruz, Jenderson Díaz, Yordan Álvarez, Junior Caminero,
   Cedric Rafael, Kevin McGonagal, Dillon Dingler, Hunter Gorman, Gunnar Henderson,
   Jansen Chorío, Mauricio Dubón, Matt Olson, Ortiz, Ohtani, Aaron Judge, etc. El
   ranking debe basarse en **probabilidad real de hacer hit** (average/forma), no en
   jugadores cualquiera.

3. **Goals / Points / Shots ni siquiera priorizan alto rendimiento.**
   No enfocan jugadores de **alto rendimiento** en partidos de **hoy / esta semana**.
   Aplica el mismo criterio que Hits: ranking por probabilidad real del mercado
   correspondiente (gol / 20+ pts / 2+ SOG) en partidos vigentes.

4. **Etiqueta de métrica en jerga de desarrollador.**
   Debajo del tipo (“Top del día · Mejores opciones de hit”) sale
   **`Métrica · P(≥1 hit)`** (y equivalentes `P(≥1 goal)`, `P(20+ pts)`,
   `P(2+ SOG)`). Es lenguaje técnico. Debe decir algo claro, p. ej. **“Métrica ·
   Hits”** (sin `P(`, sin `≥`, sin paréntesis). Está en `assets/js/ui/parlay.js`
   (~línea 211, usa `cfg.metric`; hay que usar una etiqueta amable, no la fórmula).

> Relacionado (ya en V1): esto también depende de **ampliar la capa de datos**
> (más fuentes gratuitas) y de que el **motor** ordene por señales reales (V1 §6/§8).

---

## 12. Hoja de ruta por FASES (dónde nos quedamos)

### Ronda “por bloques” (panel + señales) — **TODOS HECHOS**
1. Analysis Hub (señales publicadas / editar / eliminar). ✅
2. Publicar señal (dropdown mercado + estilo/vista previa + “mantener cambios”). ✅
3. Moderación de enlaces/publicidad. ✅
4. Perfil (idioma + ajustes de perfil). ✅
5. Señales (like/dislike responsivo + Reportar 1/usuario + área admin Reports). ✅
6. Menú Premium (fotos + dorado). ✅
7. Casa/Fuera en estadísticas. ✅

### Ronda “por fases” (pulido premium del área de señales)
1. **Botón Premium + PRO tornasol.** ✅ HECHO.
2. **Limpieza del área de señales** (textos fuera, Discover arriba, botón
   “What is this section?”, disclaimer emergente). ✅ HECHO.
3. **Discover analysts escalable (~30 analistas).** ⏳ **SIGUIENTE.**
   La franja debe aguantar hasta 30 analistas (20 hombres + 10 mujeres) sin
   amontonarse: avatares que **escalan** y **scroll horizontal** ordenado (o
   agrupación), todo alineado en móvil y web.
4. **Foto de perfil del analista (obligatoria).** ⏳ PENDIENTE. Requiere las 30
   fotos subidas (§10) + guardar la elección en Firestore + mostrarla en la tarjeta
   y en Discover. Solo para analistas.
5. **Rediseño premium de las tarjetas de analista** (`.sn-card`). ⏳ PENDIENTE.

### Prioridad 1 (paralela, producto): §11
Arreglar el área de proyecciones (Hits/Goals/Points/Shots) + etiqueta de métrica,
apoyado en más datos y mejor ranking.

---

## 13. Pendiente de verificar EN VIVO

No es testeable en el sandbox (sin acceso a Firebase/APIs); verificar en la web real:

- **Sistema social:** follow / like-dislike / apoyos ($2) / reportes / moderación /
  monitoreo de ingresos / edición y publicación con estilo.
- **Reportes:** que la regla `reportes` esté **publicada** (si no, el botón falla).
- **Perfil:** cambio de nombre/usuario/correo/contraseña (el cambio de correo puede
  pedir verificación si Firebase tiene “email enumeration protection”).
- **Fotos:** los 5 iconos del menú Premium y `fondo-shots.jpg` subidos.
- **Datos:** fotos de TheSportsDB y fallback de roster MLB.
- **Proyecciones:** confirmar el problema de “3 en vez de 9” y el ranking (§11).

---

## 14. Recordatorios para el próximo asistente

- **Inglés por defecto** en la web; **español** solo si el usuario lo elige en su
  perfil. Panel **mesa** en español por defecto.
- Entregar **solo archivos modificados** con **ruta exacta**; **verificar móvil +
  web con render real** antes de entregar.
- Nada de em-dashes en UI, ni emojis en UI seria, ni “caridad/rosa/corazones”.
- **Modularidad**: área nueva = archivo nuevo.
- El dueño es **muy exigente**: “no dejar ni un solo detalle”. Reconocer errores sin
  ponerse a la defensiva.
- **Prioridad 1 real hoy:** arreglar el área de proyecciones (§11). Es lo que más
  daña la percepción del producto.
- Continuar por **Fase 3** (Discover escalable) salvo que el dueño indique otra cosa.
