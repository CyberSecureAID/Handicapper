/* ============================================================
   CONFIGURACIÓN DE FIREBASE
   Pega aquí el objeto firebaseConfig que te da la consola de Firebase
   al registrar la app web (paso 2 de la guía). Es información pública:
   puede ir en el frontend sin problema (Firebase se protege con las
   reglas de seguridad de Firestore y los dominios autorizados, no con
   estas claves).

   Mientras esté en blanco (con los "PEGA_AQUI..."), la app funciona
   igual pero SIN login (modo invitado). En cuanto pegues los datos
   reales, el login se activa solo.
   ============================================================ */

export const firebaseConfig = {
  apiKey:            "PEGA_AQUI_apiKey",
  authDomain:        "PEGA_AQUI_authDomain",
  projectId:         "PEGA_AQUI_projectId",
  storageBucket:     "PEGA_AQUI_storageBucket",
  messagingSenderId: "PEGA_AQUI_messagingSenderId",
  appId:             "PEGA_AQUI_appId",
};

/* ¿Está configurado? (si sigue con los placeholders, no lo está) */
export const firebaseListo = !String(firebaseConfig.apiKey).startsWith('PEGA_AQUI');
