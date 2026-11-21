# Reglas obligatorias — Sports Expectations (Handicapper)

Estas reglas son de cumplimiento OBLIGATORIO en cada cambio. No son sugerencias.
Nacen de problemas reales que rompieron la logica del producto. Si una entrega las
incumple, se rechaza.

## 1. Premium / Pro solo muestran LO MEJOR DE LO MEJOR
- En las secciones de pago (Pro, Premium, Elite) NUNCA se muestra un resultado que
  no sea de alta probabilidad. Nada de 37%, 40% ni "confidence low".
- La gente paga por encontrar ya curado el conjunto de jugadores con alta
  probabilidad real. Mostrar relleno mediocre es venderle humo al cliente. Esta
  empresa se regula en EE.UU.: un servicio de pago que muestra datos de baja
  calidad es un riesgo legal, no solo de imagen.
- Si en una jornada no hay jugadores de alta probabilidad, se muestra un mensaje
  claro (o el calendario del proximo partido), NUNCA relleno.

## 2. La probabilidad sale de DATOS REALES Y MEDIBLES (ultimos 10 partidos)
- La probabilidad de cada tarjeta se calcula a partir del rendimiento REAL del
  jugador en sus ultimos ~10 partidos (su hit rate contra la linea), la MISMA data
  que muestra el boton "Last 10". Si un jugador supero la linea en 7 de 10, su
  probabilidad ronda el 70%. Si la supero en 2, es baja y NO aparece entre lo mejor.
- La probabilidad de la tarjeta y el historial de "Last 10" tienen que coincidir
  SIEMPRE. Si no coinciden, es un bug grave.
- No se inventan datos: un jugador sin historial verificable se DESCARTA, no se
  rellena con un numero inventado.

## 3. Los parrafos NUNCA se repiten
- Cada tarjeta de comparacion explica por que ESE jugador, con un parrafo distinto.
  Prohibido el mismo parrafo (o casi el mismo) en varias tarjetas.
- El texto se arma a partir de los numeros reales del jugador (aciertos, muestra,
  tope) y con variedad de fraseo, de modo que dos jugadores nunca lean igual.

## 4. Idioma: bilingue de verdad, segun la eleccion del usuario
- El boton de idioma del perfil manda. En ingles, TODO en ingles; en espanol, TODO
  en espanol. Prohibido mezclar (p.ej. "In favor: juega en casa").
- Nunca forzar un idioma fijo: todo texto visible pasa por el sistema de idioma.

## 5. Entregas limpias
- Solo los archivos tocados, con su ruta exacta, listos para reemplazar, en ZIP.
- Nada de archivos que no tengan que ver con la tarea.

## 6. Responsivo y sin romper lo que funciona
- Todo tiene que verse bien en web y en movil. La pagina es una sola base
  responsiva (no hay version movil aparte).
- No se toca lo que ya funciona para "probar otra cosa". Cambios minimos y a la
  causa raiz, verificados antes de entregar.

## 7. Sin APIs de pago
- Los datos salen de fuentes publicas y gratuitas (ESPN, MLB Stats API, NHL).
  No se introducen servicios de pago.

## 8. Decir la verdad
- Si algo no se puede hacer sin backend (p.ej. resolver el prestigio de cada senal
  y que TODOS los usuarios lo vean en vivo), se dice claramente, no se finge.

---

## Notas de estado (al dia de esta version)
- Probabilidad por historial real de ultimos 10: ACTIVA en Points (NBA), Shots
  (NHL) y Touchdown (NFL). Hits (MLB) esta fuera de temporada (vuelve en febrero);
  recibira el mismo tratamiento cuando haya juegos. Goals (futbol) es un mercado por
  PARTIDO (over 1.5 goles), no por jugador: usa el rendimiento de los equipos y se
  alineara con el mismo criterio en una proxima iteracion.
- Prestigio: el sistema soporta +1 por acierto y -1 por fallo (puede ir a negativo)
  via `prestigioAuto`. Resolver cada senal real y que sea visible para todos los
  usuarios necesita una Cloud Function (backend). Sin backend, el movimiento del
  prestigio de los bots se simula de forma determinista.
