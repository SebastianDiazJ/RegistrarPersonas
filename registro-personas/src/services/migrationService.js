import { collection, getDocs, addDoc, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';

const RED_EMAIL = (red) => `${red}@redes.iglesia`;

// Crea cuentas en Firebase Authentication para cada red
export const setupAuthUsers = async (passwords) => {
  // passwords: { xtreme, parejas, '360', senior, admin, pastor }
  const results = {};

  const accounts = [
    { key: 'xtreme',  email: RED_EMAIL('xtreme') },
    { key: 'parejas', email: RED_EMAIL('parejas') },
    { key: '360',     email: RED_EMAIL('360') },
    { key: 'senior',  email: RED_EMAIL('senior') },
    { key: 'admin',   email: 'admin@iglesia.com' },
    { key: 'pastor',  email: 'pastor@iglesia.com' },
  ];

  for (const { key, email } of accounts) {
    const password = passwords[key];
    if (!password) { results[key] = { skipped: true }; continue; }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      results[key] = { success: true };
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        results[key] = { success: true, existing: true };
      } else {
        results[key] = { success: false, error: error.message };
      }
    }
  }

  return results;
};

export const initializeRedes = async () => {
  try {
    const redes = ['xtreme', 'parejas', '360', 'senior'];
    for (const id of redes) {
      await setDoc(doc(db, 'redes', id), { nombre: id.toUpperCase() }, { merge: true });
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
