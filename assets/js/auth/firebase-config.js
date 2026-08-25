/* Configuración de Firebase (pública, puede ir en el frontend). */
export const firebaseConfig = {
  apiKey:            "AIzaSyAbJ9RBm-91N4TRg02Wjv4RzsaUAO1LdsA",
  authDomain:        "handicappper.firebaseapp.com",
  projectId:         "handicappper",
  storageBucket:     "handicappper.firebasestorage.app",
  messagingSenderId: "279849310534",
  appId:             "1:279849310534:web:94cde85a27b336b8632d47",
};

export const firebaseListo = !String(firebaseConfig.apiKey).startsWith('PEGA_AQUI');
