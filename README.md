# Handicapper — README

Plataforma de análisis y datos deportivos por suscripción ($1.99/mes). El usuario
compara datos públicos y verificables de los partidos, ve una probabilidad honesta
y accede a las señales de nuestros analistas. No es una casa de apuestas: es
"análisis informativo, no consejo de apuestas".

> Estado: en construcción por fases. Actualmente terminada la **interfaz (Fase 0-1)**
> con datos de ejemplo. Falta conectar datos reales, login, pagos y panel de analistas.

---

## 1. Reglas de trabajo

- Idioma de la plataforma: **inglés por defecto**, español a elección.
- Tema: **oscuro por defecto**, claro a elección.
- Todo **modular**: un archivo = una responsabilidad. Nada embebido.
- Sin emojis en la interfaz: se usan iconos SVG limpios.
- Al entregar cambios: solo los archivos modificados, con su ruta exacta.

---

## 2. Estructura del proyecto

```
handicapper/
  index.html
  INSTALACION.md
  README.md
  assets/
    css/
      tokens.css        # colores, tipografías, medidas, temas claro/oscuro
      app.css           # layout (web 3 columnas / móvil) y componentes
    js/
      app.js            # arranque: conecta todo
      datos/
        proveedor.js       # interfaz única de datos (hoy usa el demo)
        proveedor-demo.js  # datos de ejemplo + lista de ligas
      ui/
        vistas.js       # HTML de tarjetas de partido y del detalle
        iconos.js       # iconos SVG (buscar, tema, compartir, etc.)
        tema.js         # modo claro/oscuro (oscuro por defecto)
        idioma.js       # inglés/español (inglés por defecto)
        compartir.js    # genera la imagen para compartir (sobre la plantilla)
    imagenes/
      logo-nombre-oscuro.png   # nombre completo blanco/dorado (web)
      logo-nombre-claro.png    # nombre completo negro (respaldo)
      logo-h-oscuro.png        # H blanca/dorada (móvil, tema oscuro)
      logo-h-claro.png         # H negra/dorada (móvil, tema claro)
      favicon.png / favicon-32.png
      vs.png                   # imagen "VS" metálica (detalle)
      compartir.jpg            # plantilla de la imagen a compartir
      dep-todos.png ... dep-bundesliga.png   # 10 iconos de deportes/ligas
      REFERENCIA-*.svg         # referencias visuales (no se usan en la web)
```

---

## 3. Lo que YA está hecho

### Interfaz
- Diseño estilo casa de apuestas premium (referencia Hard Rock Bet) con el dorado de la marca.
- **Web (escritorio):** 3 columnas — ligas (izquierda), partidos (centro), análisis (derecha).
- **Móvil:** 1 columna, barra inferior de navegación, y **menú hamburguesa** (arriba a la izquierda) que abre un panel lateral con las ligas. Se eliminó la fila que se cortaba.
- **Tema claro/oscuro** (oscuro por defecto), con sombras y profundidad reales en ambos.
- **Dos idiomas** (inglés por defecto, español a elección); la elección se guarda.

### Contenido de cada partido
- Tarjetas con logos reales de equipos (respaldo a siglas si no cargan).
- **Bloque de probabilidad** de alto impacto: números grandes con color por equipo y barra con brillo.
- Panel de detalle con **comparativa de datos** (valores grandes y legibles) e imagen **VS** metálica en el medio.
- **Bloque del analista** (Veredicto): favorito, probabilidad % y texto. Listo para mostrarse bloqueado/borroso a quien no pague.
- **Selección por defecto:** al abrir, el panel derecho muestra el próximo partido (nunca vacío).

### Imágenes y marca
- Logos del sitio integrados (nombre completo en web, H en móvil, por tema).
- 10 iconos de deportes/ligas recortados y optimizados: Todos, MLB, NBA, NFL, Premier, LaLiga, Champions, NHL, Serie A, Bundesliga.
- Favicon optimizado (~2 KB).
- **Compartir imagen:** botón que exporta un PNG construido sobre la plantilla `compartir.jpg`, con logos, nombres de equipo y los valores de la comparación. Con respaldo si los logos externos bloquean la exportación.

### Datos (temporal)
- `proveedor-demo.js` entrega partidos de ejemplo (MLB, NBA, Premier, LaLiga) con la MISMA forma que tendrán los datos reales. Cambiar a datos reales será cambiar una sola línea en `proveedor.js`.

---

## 4. Lo que FALTA por hacer

### Fase 2 — Datos reales + mercado
- Crear `proveedor-api.js` con la misma interfaz que el demo y conectar:
  - **API-Football** (fútbol mundial) y **SportsDataIO** (MLB/NBA/NFL/NHL).
  - **The Odds API** (cuotas del mercado) como ancla anti 50-50.
- Motor de análisis propio (`analisis/motor.js`) que combine datos + mercado en una probabilidad honesta.
- Nota: la plantilla `compartir.jpg` tiene etiquetas de fila fijas (baloncesto, en español). Para que otros deportes se llenen igual, hará falta una plantilla por deporte o generar la tarjeta por código adaptada a cada uno.

### Fase 3 — Login
- Firebase Auth (gratis hasta ~50.000 usuarios/mes).

### Fase 4 — Suscripción (estructura)
- Firestore para perfiles y estado de suscripción.
- `estado-pago.js`: una sola pregunta — "¿suscripción activa?" — sin importar el método.

### Fase 5 — Pagos reales
- **Tarjeta:** Stripe (cobro automático mensual). Claves las provee el contacto en EE.UU.
- **Cripto:** smart contract nuevo en BSC con proxy (lleva usuarios, vencimientos, renovación y verificación).
- El usuario elige tarjeta o cripto; mismo precio $1.99/mes.

### Fase 6 — Panel de analistas (seguro)
- Multi-usuario (varios analistas). Entrada separada (`admin.html`).
- Seguridad real con **Firebase custom claims + reglas de Firestore** (no solo en el navegador): impide accesos por phishing o inyección.
- Editor de dos formatos: **Reporte del Analista** (~1.000 caracteres) y **Veredicto/Señal Pro** (favorito, %, porqué).
- Proyección premium de la señal en la página del cliente.

### Fase 7 — Pulido y lanzamiento
- Buscador funcional, más ligas y partidos, estados en vivo reales.
- Términos legales ("análisis informativo, no consejo de apuestas").
- Dominio propio (Hostinger) + GitHub Pages.
- Pruebas de seguridad y de responsividad final.

---

## 5. Decisiones ya tomadas

- Nombre: **Handicapper** (palabra del nicho, buen SEO).
- Frontend: **GitHub Pages + dominio de Hostinger**.
- Contrato de cripto: **nuevo desde cero**, con proxy (actualizable).
- Precio único: **$1.99/mes**, todo incluido (datos + mercado + analista).
- Sin Cloudflare, sin keeper (los datos se piden cuando el usuario abre un partido).

---

## 6. Cómo probar en local

Usa módulos JavaScript, así que necesita un servidor simple:
`python -m http.server 8080` en la carpeta del proyecto, y abrir `http://localhost:8080`
(o la extensión "Live Server" de VS Code). Probar en pantalla grande y en móvil,
en tema claro y oscuro, y el botón de compartir.
