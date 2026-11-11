import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyD4diFv51DDkCwJO8Z7jA_xhzsZLcMvAQA",
  authDomain: "registrarpersonas-6d547.firebaseapp.com",
  projectId: "registrarpersonas-6d547",
  storageBucket: "registrarpersonas-6d547.firebasestorage.app",
  messagingSenderId: "480560987926",
  appId: "1:480560987926:web:c7cc59c4e50291fbb4da37",
  measurementId: "G-LDKJMSEE86"
};

// Solo en desarrollo: `VITE_USE_EMULATOR=true npm run dev` apunta a los emuladores
// locales de Auth y Firestore (proyecto demo-registro) para probar sin tocar datos reales.
const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true';

const app = initializeApp(useEmulator ? { ...firebaseConfig, projectId: 'demo-registro' } : firebaseConfig);

// App Check (reCAPTCHA v3): hace que Firestore y Auth solo atiendan a esta app y no a scripts
// o clientes ajenos (frena el escaneo y el abuso de sesiones anónimas). Se activa al definir
// VITE_APPCHECK_SITE_KEY (clave pública del sitio); sin ella no cambia nada. Ver SEGURIDAD.md.
const appCheckKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
if (!useEmulator && appCheckKey) {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckKey), isTokenAutoRefreshEnabled: true });
}

export const db = getFirestore(app);
export const auth = getAuth(app);

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}