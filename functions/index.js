/* ============================================================
   CLOUD FUNCTIONS — Limpieza automática del chat
   Requiere plan Blaze (las Cloud Functions NO existen en el plan gratuito Spark).
   Despliegue:  firebase deploy --only functions
   ============================================================ */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const TOPE = 200;   // cuántos mensajes conservar

/* Cada 6 horas: deja solo los TOPE mensajes más recientes; borra el resto. */
exports.limpiarChat = onSchedule('every 6 hours', async () => {
  const snap = await db.collection('chat').orderBy('ts', 'desc').offset(TOPE).get();
  if (snap.empty) return;
  let lote = db.batch(), n = 0;
  for (const doc of snap.docs) {
    lote.delete(doc.ref); n++;
    if (n % 400 === 0) { await lote.commit(); lote = db.batch(); }   // límite de 500 por lote
  }
  await lote.commit();
  console.log(`Chat limpiado: ${snap.size} mensajes viejos borrados.`);
});
