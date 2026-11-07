import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

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
export const db = getFirestore(app);
export const auth = getAuth(app);

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}