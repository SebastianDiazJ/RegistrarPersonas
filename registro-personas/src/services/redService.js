import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logCambio } from './historialService';

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
    const ref = doc(db, 'redes', red);
    const prev = (await getDoc(ref)).data() || {};
    await setDoc(ref, { liderNombre, whatsapp }, { merge: true });
    await logCambio({
      accion: 'editar_red', entidad: 'red', entidadId: red, red,
      resumen: `Editó datos de contacto de la red ${red}`,
      antes: { liderNombre: prev.liderNombre, whatsapp: prev.whatsapp },
      despues: { liderNombre, whatsapp }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
