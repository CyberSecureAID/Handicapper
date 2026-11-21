/* ============================================================
   calendario.js — arma la lista de eventos de un scoreboard de ESPN
   SIN usar el rango de fechas "YYYYMMDD-YYYYMMDD".

   Causa raiz que resuelve: ESPN responde 4xx a ese rango (verificado),
   asi que los servicios que lo usaban (Points/NBA, Touchdown/NFL,
   Goals/soccer) caian al catch y quedaban vacios. NHL (Shots) usaba
   otra API y por eso era el unico que funcionaba.

   Estrategia (solo formatos que ESPN acepta):
     1) scoreboard actual (sin fecha) -> el mismo que usa el tablero y SI
        responde; devuelve la jornada de hoy / semana en curso.
     2) si hoy no hay juegos, busca el proximo dia con juegos pidiendo
        fechas SUELTAS (?dates=YYYYMMDD), que si estan soportadas.

   Responsabilidad unica: dado un `pedir` (la red compartida) y la URL
   base del scoreboard, devolver los eventos ordenados por fecha.
   ============================================================ */

const _ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

export async function calendarioEventos({ pedir, scoreboardUrl, fecha = null, dias = 10, max = 40 }) {
  if (typeof pedir !== 'function' || !scoreboardUrl) return [];
  const sep = scoreboardUrl.includes('?') ? '&' : '?';

  // 1) Jornada actual (endpoint que ya funciona en el tablero).
  let eventos = [];
  try { const d = await pedir(scoreboardUrl); eventos = (d && d.events) || []; } catch (_) {}

  // 2) Si hoy no hay juegos, avanza dia a dia (fecha suelta, formato soportado)
  //    hasta encontrar el proximo dia con juegos.
  if (!eventos.length) {
    const base = new Date((fecha || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
    for (let i = 1; i <= dias && !eventos.length; i++) {
      const dd = new Date(base); dd.setDate(dd.getDate() + i);
      try { const d = await pedir(`${scoreboardUrl}${sep}dates=${_ymd(dd)}`); eventos = (d && d.events) || []; } catch (_) {}
    }
  }

  eventos = eventos.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return max ? eventos.slice(0, max) : eventos;
}
