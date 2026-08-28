import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const getRedInfo = async (red) => {
  try {
    const snap = await getDoc(doc(db, 'redes', red));
    if (!snap.exists()) return { success: false, error: 'Red no encontrada' };
    return { success: true, data: snap.data() };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllRedesInfo = async (redIds) => {
  const results = await Promise.all(redIds.map(id => getRedInfo(id)));
  const map = {};
  redIds.forEach((id, i) => { map[id] = results[i].success ? results[i].data : {}; });
  return map;
};

export const updateRedLeaderInfo = async (red, { liderNombre, whatsapp }) => {
  try {
    await setDoc(doc(db, 'redes', red), { liderNombre, whatsapp }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
