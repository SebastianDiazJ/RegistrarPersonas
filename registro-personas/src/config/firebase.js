import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD4diFv51DDkCwJO8Z7jA_xhzsZLcMvAQA",
  authDomain: "registrarpersonas-6d547.firebaseapp.com",
  projectId: "registrarpersonas-6d547",
  storageBucket: "registrarpersonas-6d547.firebasestorage.app",
  messagingSenderId: "480560987926",
  appId: "1:480560987926:web:c7cc59c4e50291fbb4da37",
  measurementId: "G-LDKJMSEE86"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);