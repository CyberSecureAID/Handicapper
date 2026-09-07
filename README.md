# Handicapper — README maestro

> Documento de contexto **completo** del proyecto. Está escrito para que cualquier
> chat nuevo (o cualquier colaborador) entienda **desde cero hasta hoy** qué es
> Handicapper, cómo está construido, qué reglas seguimos, qué falta y hacia dónde
> vamos. Si lees esto, ya tienes todo el contexto: no hace falta nada más.

---

## 0. Qué es Handicapper

Plataforma web de **análisis y datos deportivos por suscripción**. El usuario abre
un partido y ve: datos públicos y verificables de ambos equipos, una **probabilidad**
de quién gana, y las **señales de nuestros analistas**. No es una casa de apuestas:
es **"análisis informativo, no consejo de apuestas"**. El público objetivo son
apostadores de EE. UU. que quieren estudiar el juego antes de decidir.

**Objetivo final (norte del proyecto):** convertirnos en uno de los mejores
proveedores de datos y análisis deportivo — comparación entre equipos y conclusión
porcentual de quién tiene más probabilidad de ganar — y ser **un ícono de actitud y
precisión** en esto. Todo **sin pagar APIs**: usando datos públicos obtenidos de
forma remota. Si hay una limitación, se busca la vuelta; no se ponen parches.

---

## 1. Filosofía de trabajo (LÉEME ANTES DE TOCAR NADA)

1. **Extraordinario o nada.** Prioridad #1 es ofrecer algo que hoy nadie ofrece.
   La palabra clave es **extraordinario**: premium, caro, de gran categoría, que al
   verlo la gente diga "guau". Nada mediocre, "de cartón", "de plástico" ni barato.
2. **Nada de parches.** No acumular parche sobre parche. Cuando hay un límite, se
   **investiga a fondo** una solución real (nuevos proveedores de datos, nueva
   arquitectura, lo que haga falta). Internet es enorme; siempre hay alternativa.
3. **No usar "no se puede" como excusa.** Si algo parece imposible, se busca la
   manera de superarlo o de **crear nuestro propio entorno** para lograrlo.
4. **Modularidad obligatoria.** Un archivo = una responsabilidad. Para una función
   o módulo nuevo se **crea un archivo nuevo**; no se engordan los que ya existen.
   Archivos gigantes = deuda técnica; se evitan siempre.
5. **Entregas limpias.** Al entregar cambios: solo los archivos modificados, con su
   **ruta exacta**, listos para reemplazar en el repo. Ni más ni menos.
6. **Respuestas cortas.** En el chat: conciso y directo. Nada de disertaciones de
   80 páginas. Ir al grano, un paso a la vez.
7. **Estética por plataforma.** La versión **móvil** tiene su propia estética y la
   versión **escritorio** la suya. Cada cambio debe verse bien y ser **responsivo**
   en ambas. La responsividad no es opcional.
8. **Sin emojis en la interfaz.** Iconos SVG limpios. Sin em-dashes en textos de
   UI. Sin probabilidades "50-50" de relleno.
9. **Idioma:** inglés por defecto, español a elección. **Tema:** oscuro por defecto.

---

## 2. Equipo y negocio

- **Jesús Pérez** — desarrollador / dueño. Correo admin: `yamicelanvivesqui@gmail.com`.
- **Oscar Luis Sieres Garcia** — analista. Correo admin: `oscarsieres7@gmail.com`.
- Somos **solo nosotros dos**.
- El negocio se registrará como **LLC en Estados Unidos**.
- Pagos vía **Stripe** (integración pendiente de claves; ver §9).
- A futuro: contrato **cripto en BSC** (Binance Smart Chain).

---

## 3. Planes y precios (dinámica de coste actual)

Tres planes. El plan anual equivale a **10 meses** (2 gratis).

| Plan     | Mensual | Anual   | Incluye |
|----------|---------|---------|---------|
| Basic    | $1.99   | $19.90  | Acceso a datos y probabilidad. |
| **Pro**  | $3.99   | $39.90  | **"Most popular".** Todo lo de Basic + **alertas** + **veredictos del analista**. Debe quedar el más jugoso. |
| Premium  | $8.99   | $89.90  | Todo lo de Pro + lo máximo (a definir según features). |

Definidos en `assets/js/datos/planes.js` (`PLANES`, `planPorId`, cálculo de MRR).

---

## 4. Arquitectura y stack

- **Front puro** (HTML + CSS + JS ES Modules), sin framework. Desplegado en
  **GitHub Pages**: `cybersecureaid.github.io` (repo `CyberSecureAID/handicapper`).
- **Login + base de datos:** Firebase (Auth + Firestore).
- **Pagos:** Stripe (pendiente).
- **Datos deportivos:** APIs públicas **sin clave y sin backend**, llamadas
  **directas desde el navegador**, **bajo demanda** (al abrir un partido). Ver §6.

### Reglas de infraestructura BLOQUEADAS (no violar)
- **NO** Cloudflare. **NO** cron / keeper / workers programados. (Decisión firme.)
- Los datos se piden **on-demand**, nunca por un proceso en segundo plano.
- Una Firebase Function on-demand sería aceptable, pero está **aplazada** (requiere
  plan Blaze con tarjeta; hoy no hay tarjeta ni presupuesto).
- Nada que obligue a pagar mensualidades fijas para funcionar.

---

## 5. Estructura del repositorio

> Regla: si algo nuevo aparece, **archivo nuevo**. No engordar los existentes.

```
handicapper/
  index.html                 # Pantallas: #landing, #pricing, #app, #mesa (panel admin)
  README.md                  # Este documento
  INSTALACION.md
  assets/
    css/
      tokens.css             # Variables de color/tipografia (claro y oscuro)
      app.css                # Estilos de la plataforma + modal de detalle (dashboard)
      landing.css            # Estilos del lobby/landing (forzado oscuro)
      mesa.css               # Estilos del panel administrativo
    js/
      app.js                 # ROUTER/entrada. Sesion, pantallas, modal de detalle, menu de cuenta
      analisis/
        motor.js             # MOTOR de probabilidad (HOY DEFECTUOSO - ver §8)
      datos/
        proveedor.js         # Agregador: une fuente base + enriquecedores
        proveedor-api.js     # ESPN (fuente base, sin clave)
        proveedor-sportsdb.js# TheSportsDB (enriquecedor gratis, key "123")
        proveedor-demo.js    # Datos de ejemplo (fallback)
        planes.js            # PLANES y precios
      ui/
        vistas.js            # Render de listas y del DASHBOARD 16:9 de detalle
        iconos.js            # Iconos SVG (IC.*)
        idioma.js            # i18n (t, Lg, idiomaActual) EN/ES
        tema.js              # Tema claro/oscuro
        navegacion.js        # Botones del lobby, particulas, video, tilt
        particulas.js        # Polvo animado del landing (der->izq)
        compartir.js         # Compartir partido (imagen/enlace)
      auth/
        firebase-config.js   # Config de Firebase (ver §7)
        auth.js              # SDK Firebase, login/registro, perfiles, accesores admin
        auth-ui.js           # Modal de login/registro (con ojo para ver contrasena)
        estado-pago.js       # Vista previa / acceso (sessionStorage 'hc-preview')
      mesa/
        mesa.js              # Panel admin: Overview, Users, Analysis
        mesa-datos.js        # Acceso Firestore del panel (admins, usuarios, analisis)
    imagenes/                # Logos, iconos de liga, texturas, vs.png, imagen.jpg (ref)
    video/
      fondo.mp4              # Video del lobby (se reproduce una vez y congela)
```

---

## 6. Capa de datos (todo gratis, sin clave, sin backend)

Arquitectura **agregador + fuentes** en `assets/js/datos/`:

- **`proveedor.js`** — Agregador. `MODO='api'`, `BASE=espn`, `ENRIQUECEDORES=[sportsdb]`.
  Expone `LIGAS`, `listarPartidos`, `detallePartido`. `fusionar()` anade solo campos
  no duplicados que cada enriquecedor declara en su lista `APORTA`.
- **`proveedor-api.js`** — **ESPN** (`site.api.espn.com`, JSON publico, sin clave).
  9 ligas con logos: MLB, NBA, NFL, NHL, EPL, LaLiga, Champions, Serie A, Bundesliga.
  Extrae por partido: equipos (id, record, record casa/fuera, logo), **abridor**
  anunciado con **mano L/R (LHP/RHP)** + ERA + W-L, moneyline/predictor si hay,
  **lideres** por categoria, **lesionados**, sede, y **roster/plantilla con stats por
  jugador** (`rosterDe`, defensivo: usa boxscore o rosters; si no hay, cae en lideres).
- **`proveedor-sportsdb.js`** — **TheSportsDB** (key publica compartida `"123"`).
  Enriquecedor: estadio, capacidad, ciudad, fundacion, escudo. Solo al abrir el
  detalle. Es una key compartida y con limites; por eso es solo enriquecimiento.
- **`proveedor-demo.js`** — datos de ejemplo de respaldo.

### PRIORIDAD #1 de datos (critico)
El motor y la diferenciacion dependen de **tener mas y mejores datos que la
competencia, gratis**. Hay que **investigar a fondo** mas fuentes publicas de datos
deportivos (APIs abiertas, endpoints publicos, datos abiertos, scraping de paginas
publicas que ofrezcan estadisticas, etc.) para nutrir el analisis y **marcar
diferencia**. API-Football queda descartada por ahora (exige clave oculta que no se
puede alojar gratis sin backend/tarjeta). No basta con parches: se necesita una
**investigacion concreta** de proveedores gratuitos y una estrategia de datos.

---

## 7. Firebase (login + base de datos) — CONFIGURADO

- Config en `assets/js/auth/firebase-config.js`:
  - `projectId`: **handicappper** (ojo: triple "p"), `authDomain`: `handicappper.firebaseapp.com`.
  - `messagingSenderId`: `279849310534`, `appId`: `1:279849310534:web:94cde85a27b336b8632d47`.
- `auth.js` carga el SDK v10.12.2 por CDN. Funciones: `iniciarAuth`, `registrarCorreo`,
  `entrarCorreo`, `entrarGoogle`, `salir`, mas accesores para el panel admin.
  Distingue **login intencional** (el usuario toco "Entrar") de **restauracion de
  sesion** al cargar, para no meter al usuario dentro automaticamente.
- Perfiles en Firestore `usuarios/{uid}`:
  `{ email, nombre, creado, suscripcion{activo,plan,vence,metodo}, rol, bloqueado }`.
  Si `bloqueado` es true, se cierra la sesion al instante.

### Administradores (coleccion `admins`)
- `lJHaV8gdjjPOi4DZfYk4NogXafx1` — Jesus (`yamicelanvivesqui@gmail.com`).
- `8gyQWEFYzIWQF3o9UHqrSbYn5pj2` — Oscar Luis (`oscarsieres7@gmail.com`).
- Cada doc lleva su `email` (y opcional `rol`: "Admin developer" / "Admin analyst").

### Reglas de seguridad Firestore (publicadas)
- `esAdmin()` = existe `admins/{request.auth.uid}`.
- `admins/{uid}`: lectura solo si `esAdmin`; escritura denegada (se crean a mano).
- `usuarios/{uid}`: lee dueno o admin; crea dueno; actualiza dueno o admin; borra admin.
- `analisis/{id}`: lee cualquier autenticado; escribe solo admin.

### Seguridad — reglas de oro
- **Nunca** guardar contrasenas en codigo ni en el repo. (Si alguna se compartio en
  el chat, hay que cambiarla.)
- El panel admin se abre desde el perfil, pero la **seguridad real esta en Firestore**:
  aunque alguien encuentre la ruta/el boton en el codigo (F12), **sin permiso no ve
  ni toca datos**. La UI nunca es la barrera; las reglas lo son.

---

## 8. Motor de probabilidad — ESTADO: RECONSTRUIDO

`assets/js/analisis/motor.js`. **Reconstruido** como modelo **aditivo en
log-odds** que combina varias señales reales, así que la probabilidad **varía
de verdad** entre partidos (ya no ~55/45 en todos).

Jerarquía de señales:
1. **Cuota real** del mercado (si el proveedor la trajo) — manda, confianza alta.
2. **Proyección de ESPN** (predictor) — manda, confianza media.
3. **Modelo propio** cuando no hay 1 ni 2:
   - Fuerza por récord con **regresión ligera** a la media (prior corto por liga).
   - **Forma situacional**: récord en casa (local) / fuera (visita).
   - **Ventaja de localía** por deporte (en log-odds).
   - **Duelo de abridores por ERA** (MLB) cuando está disponible — mueve el
     favorito de verdad.
   - **Lesionados clave** (resta al equipo con más bajas).
4. **Confianza** por nº de señales + tamaño de muestra. Con pocos datos se
   acerca (poco) al centro y se dice; nunca un 52% de relleno.

El **detalle re-ejecuta el motor tras enriquecer** (ERA del abridor,
lesionados), de modo que la ficha muestra una probabilidad más afinada que la
lista. Banco de prueba: dispersión típica ~35–85% en no-fútbol.

**Pendiente/futuro:** sumar diferencial de carreras/puntos (pythagórico) y
más fuentes de datos (§6) para subir aún más la precisión.

---

## 9. Pagos — Stripe (pendiente de claves)

- Un contacto en EE. UU. debe crear la cuenta Stripe y enviar las claves de prueba
  (`pk_test_...` y `sk_test_...`). Guia de alta ya entregada.
- Al recibirlas: reemplazar el `TODO` de `elegirPlan` en `navegacion.js` para iniciar
  el checkout. La suscripcion activa marca `usuarios/{uid}.suscripcion`.

---

## 10. Lobby / Landing (hecho)

- Video hero (`assets/video/fondo.mp4`) que se reproduce **una vez** y **congela** en
  el ultimo frame (sin loop). Visible en escritorio y movil.
- **Forzado oscuro** siempre (independiente del tema global). Nav **transparente y
  flotante** sobre el hero. Sin toggle de tema en el lobby.
- Particulas de polvo (`particulas.js`) que van de **derecha a izquierda** sobre todo
  el landing; respetan `prefers-reduced-motion` y se pausan si el landing se oculta.
- Tarjetas de features con **textura de fibra de carbono** y efecto **tilt 3D** que
  sigue el cursor. Iconos SVG dorados (sin emojis).
- Degradado inferior del hero para fundir el video con la pagina al hacer scroll.

---

## 11. Flujo de la aplicacion (hecho)

1. El usuario llega al **lobby** (siempre, aunque tenga sesion guardada).
2. Entra **por eleccion** tocando "Entrar"/"Registrarse". Si ya tiene sesion, el
   boton lo lleva directo adentro; si no, abre el modal de login.
3. Usuario con acceso -> **plataforma**. Sin acceso -> **pricing**.
4. **Admin:** entra a la **plataforma normal desbloqueada** (no al panel). Abre el
   panel desde su **perfil** (avatar "J" arriba a la derecha -> "Panel administrativo",
   opcion visible solo para admins). Refrescar **no** lo expulsa.
5. Desde el panel, "View site" vuelve a la plataforma sin recargar.

Menu de cuenta robusto (no se bloquea con toques repetidos). Login confirmado.
Contrasena con **ojo** para mostrar/ocultar.

---

## 12. Detalle de partido — DASHBOARD (EN CONSTRUCCION, aun NO terminado)

Al tocar una tarjeta se abre un **modal**. La meta es una **tarjeta 16:9 horizontal,
extraordinaria**, dividida en: **local (izquierda)** | **comparacion (centro)** |
**visita (derecha)**, con:
- Cabecera: logos + nombres + records en las esquinas; **donuts de probabilidad**
  (favorito / empate / no favorito); **Compartir** y **X** juntos arriba a la derecha.
- Silueta de jugador (cuerpo atletico en SVG, dorado local / azul visita) con
  **barras de estadisticas** por jugador; abridores con **mano LHP/RHP** + ERA/record;
  lista de jugadores; lesionados con el motivo.
- Centro: **comparacion real por categoria** (WIN%, AVG, HR, RBI...) con barras
  enfrentadas.
- Referencia visual acordada: la imagen `assets/imagenes/imagen.jpg` (dashboard
  horizontal con figura humana y barras). Sus **colores no** aplican (usamos oro/azul
  sobre oscuro); tampoco su logo/correo.

### Lo que AUN esta mal / pendiente (importante)
- **No esta bien resuelto todavia.** Falta pulir hasta que sea **verdaderamente
  extraordinario** y **100% responsivo** en movil y escritorio (cada uno con su
  estetica). Las versiones entregadas hasta ahora no cumplen ese estandar.
- Falta hacer **clicable** cada jugador del roster para desplegar su **ficha
  completa** con todas sus estadisticas.
- Depende de ampliar la **capa de datos** (roster/stats por jugador) — ver §6.

---

## 13. Panel administrativo ("mesa") — EN CONSTRUCCION

Ruta interna, abierta desde el perfil del admin. Secciones:

- **Overview** — KPIs (registrados, activos, inactivos, MRR) + salud. *(Hoy pobre;
  se mejora mas adelante, no es prioridad ahora.)*
- **Users** — tabla con estado: **Admin** (dorado: "Admin developer" / "Admin
  analyst"), o Blocked / Active(plan) / Inactive. Selector de plan, boton de bloqueo.
  Muestra **nombre** y **correo compacto** (`yamic...@gmail.com`). Responsive a
  tarjetas en movil.
- **Analysis** — menu de ligas (iconos) -> **tarjetas de partido** con **solo logo +
  VS + porcentaje** (sin nombres, para que no se monten). Al tocar una tarjeta se abre
  una **ventana de comparacion de dos sectores bien divididos**:
  - **Un sector es para que el ADMIN envie su SENAL** (su analisis/criterio, elige
    ganador, escribe el texto, publica; opcion de aplicar su probabilidad en la web).
  - **El otro sector es para VER como esta el analisis de la PAGINA** segun **nuestro
    motor de comparacion de datos** (probabilidad + datos reales del partido), para
    que el admin lo verifique y, si hace falta, lo corrija/edite y publique.
  - Dentro de esa ventana **si** aparecen los **nombres completos** de los equipos.
- Interacciones por **delegacion de eventos** (a prueba de re-render).

> **Aviso critico ligado a Analysis:** ese "motor de comparacion de datos" es el de
> §8 y **actualmente no sirve** — casi todos los partidos salen con el mismo
> porcentaje (p. ej. ~55 vs ~45 / ~52 en casi todos). Por eso la mayoria de la
> pagina **no cumple** su proposito todavia. **Arreglar el motor y ampliar los datos
> es prioridad #1.**

---

## 14. Estado por areas (resumen rapido)

| Area | Estado |
|------|--------|
| Lobby / landing | Hecho |
| Login (Firebase) | Hecho y configurado |
| Flujo lobby->plataforma / admin | Hecho |
| Planes y precios | Hecho (falta cobrar con Stripe) |
| Capa de datos ESPN + TheSportsDB | Hecho (falta MAS fuentes gratis - prioridad #1) |
| Roster/stats por jugador | Anadido (defensivo, a validar en navegador) |
| Dashboard 16:9 de detalle | **En construccion, NO terminado, poco responsivo** |
| Panel admin (Overview/Users/Analysis) | En construccion |
| **Motor de probabilidad** | **Reconstruido (modelo multi-factor)** |
| Pagos Stripe | Pendiente de claves |
| Cripto BSC | Futuro |
| LLC en EE. UU. | Por registrar |

---

## 15. Roadmap y prioridades

**Prioridad #1 (producto):**
1. **Rehacer el motor** para probabilidades realistas y variadas (§8).
2. **Investigar y sumar fuentes de datos publicas gratuitas** para superar a la
   competencia (§6). Investigacion concreta, no parches.
3. Terminar el **dashboard 16:9** hasta que sea **extraordinario** y **100%
   responsivo** (movil y escritorio con estetica propia cada uno), con jugadores
   clicables y ficha completa por jugador (§12).

**Despues:**
4. Panel admin completo (mejorar Overview; edicion/publicacion de datos por sector).
5. Stripe (cobros) y activacion real de suscripciones.
6. Sistema de alertas para Pro; hacer el plan Pro el mas jugoso.
7. Cripto BSC. Registro de la LLC.

---

## 16. Recordatorios para el asistente (como colaborar aqui)

- Respuestas **cortas y directas**. Un paso a la vez.
- Entregar **solo archivos modificados** con **ruta exacta**.
- **Modularizar**: funcion nueva = archivo nuevo.
- Pensar en **movil y escritorio** por separado; todo **responsivo**.
- Perseguir lo **extraordinario**; ante un limite, **investigar** una solucion real,
  no justificar con "no se puede".
- No tocar el **motor** a la ligera sin plan; cuando se toque, que sea para
  **rehacerlo bien** (deuda #1).

---

## 17. AUDITORÍA COMPLETA — Estado actual (2026-09-07)

> Sección añadida tras una auditoría archivo por archivo. Recoge TODO lo implementado
> desde las secciones anteriores. La marca del producto de cara al público es
> **Sports Expectations** (el repo y algunos textos internos aún dicen "Handicapper").

### 17.1 Nuevos archivos (desde la última edición)
- `assets/js/landing-lang.js` — traductor ligero standalone para páginas secundarias (usa el diccionario de `idioma.js`, sin Firebase).
- `assets/js/analisis/elite.js` — motor de "La Élite del Día" (mejor pick por deporte).
- `sitemap.xml`, `robots.txt` — SEO (raíz).
- `assets/imagenes/disclaimer-web.webp` (póster vertical) y `disclaimer-movil.webp` (horizontal) — imágenes del disclaimer, optimizadas de `paralaweb.png` y `mage.png` (ambos en la raíz).
- `assets/imagenes/muestras/muestra-1..6.webp` — capturas reales para Advanced Analytics.
- `assets/imagenes/favicon-32.png`, `favicon.png`, `apple-touch-icon.png` — favicon (en todas las páginas).

### 17.2 APIs e integraciones externas (TODAS)
- **ESPN** — `site.api.espn.com` (scoreboard/summary), `site.web.api.espn.com`, `sports.core.api.espn.com` (stats de equipo/atleta; algunos 404 en pretemporada), `a.espncdn.com` (logos). Deportes: NBA, NFL, NHL (hockey/nhl), soccer.
- **MLB Stats API** — `statsapi.mlb.com` (schedule + gameLog); logos en `img.mlbstatic.com` / `www.mlbstatic.com`.
- **NHL** — `api.nhle.com/stats/rest` y `api-web.nhle.com` (BLOQUEADOS por CORS desde el navegador). Assets en `assets.nhle.com`. Por eso NHL ahora pasa por ESPN vía `detallePartido`.
- **Proxies CORS** (mejor esfuerzo, solo NHL API directa): `corsproxy.io`, `api.allorigins.win`.
- **TheSportsDB** — `www.thesportsdb.com` (proveedor alterno / fotos).
- **Wikipedia / Wikimedia** — fotos de jugadores/analistas (`fotos-wiki.js`).
- **Firebase** — `www.gstatic.com/firebasejs` (Auth + Firestore). Proyecto `handicappper`.
- **Stripe** — PENDIENTE (sin claves). El sistema ya está preparado (ver 17.9).

### 17.3 Sistema de idioma (i18n) — inglés por defecto, toggle a español
- Diccionario único en `assets/js/ui/idioma.js` (`DIC.en` / `DIC.es`, **192 claves cada uno, balanceado**).
- `t(clave)`, `fijarIdioma()`, `idiomaActual()`, `initIdioma()` (default `en`, persiste en `localStorage['handicapper-idioma']`).
- Aplicadores: `aplicarI18n()` en `navegacion.js` (app + portada) y `landing-lang.js` (páginas secundarias).
- Atributos: `data-i18n` (texto) y `data-i18n-html` (preserva markup: `<br>`, `<em>`, `<b>`, enlaces).
- **Traducido 100%:** portada (index), app interna, About, Features, Sports.
- **PENDIENTE:** how-it-works, plans, contact, updates, help, status, faq, contact-support + 7 legales.
- BUG HISTÓRICO YA RESUELTO: el objeto `en` se cerraba antes de tiempo y 73 claves caían fuera → el inglés no revertía. Corregido (cierre del objeto movido).

### 17.4 SEO (sin dominio propio aún)
- `index.html` + 6 páginas principales: `<title>`, `meta description`, `keywords`, Open Graph, Twitter Card, `canonical`, JSON-LD (Organization + WebSite).
- `robots.txt` (permite todo + apunta al sitemap) y `sitemap.xml` (15 URLs).
- URLs usan la URL real de GitHub Pages `cybersecureaid.github.io/Handicapper` (buscar/reemplazar cuando haya dominio).
- REGLA: sin guiones en texto visible (se usa `·` como separador, no `—`).

### 17.5 Páginas legales (7) — Florida / EE.UU.
`terms.html`, `privacy.html`, `disclaimer.html`, `responsible.html`, `cookies.html`, `acceptable-use.html`, `dmca.html`.
- Entidad: **Sports Expectations LLC** (Florida). Ley de Florida + Miami-Dade, arbitraje AAA + renuncia a demanda colectiva (opt-out 30 días).
- "No somos casa de apuestas" (lenguaje fuerte), sin garantías, edad 18+, renovación automática (cumple Ley de Florida), reembolsos, analistas como contratistas independientes.
- Juego responsable: 1-800-GAMBLER (+1-800-522-4700) y, por Florida, 888-ADMIT-IT.
- Todas con favicon; "Back to home" usa `history.back()` (preserva el scroll).

### 17.6 Disclaimers / consentimiento (imagen integrada)
- **Disclaimer de entrada obligatorio** (`mostrarDisclaimerEntrada` en `app.js`): sale una vez antes de entrar al lobby, "acepto y entro", se guarda en `localStorage['se-disclaimer-ok']`.
- **Modal de Signals / Analytics Signals** (`abrirModalInfoSenales` en `senales.js`): también aparece en el botón Signals (directorio), flag `sn_info_visto`.
- Ambos usan `<img>` real (no background) → sin la "sombra" del color de fondo. Web: `disclaimer-web.webp` a la izquierda; móvil: `disclaimer-movil.webp` arriba. Distribución `space-between` (título arriba, texto centro, botón abajo).

### 17.7 Motores de análisis (estado REAL)
- **Hits (MLB)** y **Goals (soccer)**: funcionan (deportes en temporada). Goals usa Poisson Over 1.5.
- **Points (NBA)**, **Shots (NHL)**, **Touchdown (NFL)**: reescritos para tomar jugadores de `detallePartido` (la fuente que SÍ funciona), con respaldo a líderes de liga. NHL migrado a ESPN (evita CORS).
- Todos: **rango de fechas** (hoy + próximos días) y orden por cercanía; muestran la fecha en la tarjeta.
- Diagnóstico en consola (`[NBA-DIAG]`, etc.) + mensaje en pantalla que distingue "sin juegos" / "sin datos de jugadores (pretemporada)" / "hay juegos pero no superan el umbral".
- **PENDIENTE (ver 17.10):** Points/Shots/TD siguen saliendo vacíos aunque haya partidos (probable falta de stats de jugador que ESPN publica cerca del juego).

### 17.8 Panel administrativo — nuevas herramientas (`mesa.js`)
- Botones del resumen renombrados y con función real: **Exportar usuarios** (CSV), **Desglose** (modal financiero), **Registro legal** (documento con economía + todos los usuarios).
- **Desglose**: modal horizontal + calculadora. Impuestos federales EE.UU. 2026 (tramos reales), Seguridad Social 2026 ($184,500), Stripe 2.9% + $0.30, Florida sin impuesto estatal. Reparto: 15% publicidad, 10% mantenimiento, 75% entre 2 socios. Constante `TAX_YEAR = 2026` (actualizar cada año). No es asesoría fiscal.
- **Redes sociales** (sección Contacto): modal con 5 redes (X, Instagram, YouTube + Facebook, TikTok), enlace + interruptor por red; el pie de página lee esa config (`landing-movil.js`).
- "Ingresos / M" (antes "Ingresos mensuales", se montaba).

### 17.9 Cobro por seguir analista + La Élite del Día
- **Cobro** (`abrirCobroSeguir` en `app.js`): al tocar "Seguir" (directorio o Analysis Signals), ventana de cobro ($2/mes) con descargo. Admin sigue directo. Punto de integración Stripe: `_procesarPagoSeguir()` (hoy devuelve false → "pagos muy pronto").
- **La Élite del Día** (`elite.js` + `parlay.js`): solo Premium; el mejor pick por deporte; sección vacía honesta si nada supera el umbral.

### 17.10 PENDIENTES (actualizado)
1. **Stripe** — integración real (lo último). Sistema ya preparado.
2. **Points / Shots / Touchdown vacíos** — REVISAR: el lunes seguían sin picks aunque hay partidos. Probable que ESPN no publique stats de jugador hasta cerca del juego. Confirmar con `[NBA-DIAG]`/`[NFL-DIAG]` en consola.
3. **i18n** — traducir páginas secundarias restantes + legales (legales con revisión de abogado).
4. **Firebase** — cambiar "Public-facing name" de "Handicapper" a "Sports Expectations".
5. **Dominio** — al adquirirlo, reemplazar `cybersecureaid.github.io/Handicapper` en SEO/sitemap/robots + registrar en Google Search Console.
6. **Push notifications** en segundo plano (VAPID) — pendiente.
