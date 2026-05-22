import { collection, getDocs, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const REDES_CONFIG = [
  {
    id: 'xtreme',
    nombre: 'XTREME',
    usuario: 'xtreme',
    password: 'Xtr3m3@2026',
    color1: '#667eea',
    color2: '#764ba2'
  },
  {
    id: 'parejas',
    nombre: 'PAREJAS',
    usuario: 'parejas',
    password: 'Par3jas@2026',
    color1: '#f093fb',
    color2: '#f5576c'
  },
  {
    id: '360',
    nombre: '360',
    usuario: 'red360',
    password: '360Vida@2026',
    color1: '#4facfe',
    color2: '#00f2fe'
  }
];

export const initializeRedes = async () => {
  try {
    for (const red of REDES_CONFIG) {
      const { id, ...data } = red;
      await setDoc(doc(db, 'redes', id), data, { merge: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const migrateXtremeData = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'persons'));
    const personas = [];
    snapshot.forEach(d => personas.push({ id: d.id, ...d.data() }));

    for (const persona of personas) {
      const { id, ...data } = persona;
      await addDoc(collection(db, 'redes', 'xtreme', 'personas'), data);
    }

    return { success: true, count: personas.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const checkMigrationNeeded = async () => {
  try {
    const oldSnapshot = await getDocs(collection(db, 'persons'));
    const newSnapshot = await getDocs(collection(db, 'redes', 'xtreme', 'personas'));
    return {
      oldCount: oldSnapshot.size,
      newCount: newSnapshot.size,
      needed: oldSnapshot.size > 0 && newSnapshot.size === 0
    };
  } catch {
    return { oldCount: 0, newCount: 0, needed: false };
  }
};
