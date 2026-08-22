# Instalación — Handicapper (Fase 0 + 1)

## 1. Nombre del repositorio

Crea un repositorio nuevo en GitHub llamado:

```
handicapper
```

- Visibilidad: privado al inicio.
- Rama principal: `main`.
- (Nombre separado del repo de trading `bot-algoritmico`.)

## 2. Estructura de carpetas y archivos

Dentro del repo, crea exactamente esta estructura (respeta rutas):

```
handicapper/
  index.html
  assets/
    css/
      tokens.css
      app.css
    js/
      app.js
      datos/
        proveedor.js
        proveedor-demo.js
      ui/
        vistas.js
        iconos.js
        tema.js
      analisis/        (vacia por ahora; se usa en la Fase 2)
```

Cada archivo entregado va en su ruta:

- `index.html` -> raiz del repo.
- `tokens.css`, `app.css` -> `assets/css/`
- `app.js` -> `assets/js/`
- `proveedor.js`, `proveedor-demo.js` -> `assets/js/datos/`
- `vistas.js`, `iconos.js` -> `assets/js/ui/`

## 3. Publicar en GitHub Pages

1. Sube todos los archivos al repo (respetando las carpetas).
2. GitHub -> Settings -> Pages.
3. En "Source" elige rama `main`, carpeta `/root`. Guarda.
4. En 1-2 minutos tendras una URL tipo `https://tuusuario.github.io/handicapper/`.

## 4. Dominio propio con Hostinger (cuando quieras)

Idea de dominios (cortos y del nicho): `handicapper.app`, `tuhandicapper.com`, `elhandicapper.com`.

1. En Hostinger, apunta tu dominio a GitHub Pages.
2. Repo -> Settings -> Pages -> "Custom domain": escribe tu dominio.
3. GitHub crea el archivo `CNAME` automaticamente.

## 5. Probar en local

Usa modulos JavaScript, asi que necesita un servidor local simple:

- Con Python: en la carpeta del proyecto, `python -m http.server 8080` y abre `http://localhost:8080`.
- O la extension "Live Server" de VS Code.

Abre en pantalla grande (3 columnas) y luego achica la ventana o abre en el movil (1 columna + barra inferior).

## 6. Que NO tocar todavia

- La carpeta `analisis/` queda vacia a proposito (Fase 2).
- Los datos hoy son de ejemplo (`proveedor-demo.js`). Al conectar las APIs reales, se crea `proveedor-api.js` con la misma forma y se cambia UNA linea en `proveedor.js`. Nada mas se reescribe.
