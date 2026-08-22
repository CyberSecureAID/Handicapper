# Instalacion — Handicapper

## Repositorio
Nombre del repo en GitHub: `handicapper`  ·  rama `main`  ·  privado al inicio.

## Estructura completa
```
handicapper/
  index.html
  INSTALACION.md
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
        idioma.js
        compartir.js
    imagenes/
      logo-nombre-oscuro.png     (nombre completo, blanco/plateado/dorado — WEB tema OSCURO)
      logo-nombre-claro.png      (nombre completo, negro y dorado — WEB tema CLARO)
      logo-h-oscuro.png          (solo la H, blanco/plateado/dorado — MOVIL tema OSCURO)
      logo-h-claro.png           (solo la H, negra con dorado — MOVIL tema CLARO)
      favicon.png                (la H blanca/plateada/dorada)
```

## IMAGENES (importante)
En `assets/imagenes/` te dejo archivos `REFERENCIA-*.svg` que muestran como debe
verse cada logo. NO se usan en la web; son solo guia visual.

Debes subir TUS 5 imagenes reales con EXACTAMENTE estos nombres (PNG sin fondo):
- `logo-nombre-oscuro.png`
- `logo-nombre-claro.png`
- `logo-h-oscuro.png`
- `logo-h-claro.png`
- `favicon.png`

El codigo las coloca solo (segun tema y si es movil o web). Mientras no existan,
se muestra el nombre "Handicapper" estilizado como respaldo (no se ve roto).

Formato: PNG con fondo TRANSPARENTE esta perfecto y carga rapido. No hace falta webp.
Tamanos sugeridos: nombre completo ~560x140, la H ~120x120, favicon 64x64 (o 256x256).

## Idiomas
Ingles por DEFECTO. Boton de idioma (EN/ES) arriba a la derecha. La eleccion se guarda.

## Tema
Oscuro por defecto. Boton sol/luna para cambiar a claro. Se guarda la preferencia.
El modo claro ya tiene sombras y profundidad (tarjetas y botones no se ven planos).

## Compartir
En el detalle de cada partido hay un boton "Compartir" que exporta una imagen PNG
premium (enfrentamiento + probabilidades + veredicto) con la marca, para promocion.

## Publicar
GitHub Pages: Settings -> Pages -> rama `main`, carpeta `/root`.
Dominio con Hostinger: apuntar el dominio y ponerlo en Settings -> Pages -> Custom domain.

## Probar en local
Usa modulos JS: `python -m http.server 8080` en la carpeta, y abre http://localhost:8080
(o la extension Live Server de VS Code). Prueba en pantalla grande y en movil.
