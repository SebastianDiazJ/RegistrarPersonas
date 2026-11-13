import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logCambio } from './historialService';

// Una red sin datos todavía devuelve {}; un error de lectura se distingue (success: false) para
// que la pantalla no muestre campos en blanco que luego se guarden por encima de los reales.
export const getRedInfo = async (red) => {
  try {
    const snap = await getDoc(doc(db, 'redes', red));
    return { success: true, data: snap.exists() ? snap.data() : {} };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllRedesInfo = async (redIds) => {
  const results = await Promise.all(redIds.map(id => getRedInfo(id)));
  const map = {};
  redIds.forEach((id, i) => { map[id] = results[i].success ? results[i].data : { __error: true }; });
  return map;
};

const CAMPOS_LIDER = ['liderNombre', 'whatsapp', 'liderEmail'];

// Guarda SOLO los campos que se pasan (los que el usuario cambió). Así nunca se pisa con un
// valor vacío o viejo un dato que otra persona acaba de guardar desde otra pantalla.
export const updateRedLeaderInfo = async (red, cambios) => {
  const datos = {};
  CAMPOS_LIDER.forEach(k => { if (cambios[k] !== undefined) datos[k] = cambios[k]; });
  if (Object.keys(datos).length === 0) return { success: true };
  try {
    const ref = doc(db, 'redes', red);
    const prev = (await getDoc(ref)).data() || {};
    await setDoc(ref, datos, { merge: true });
    const antes = {};
    Object.keys(datos).forEach(k => { antes[k] = prev[k]; });
    await logCambio({
      accion: 'editar_red', entidad: 'red', entidadId: red, red,
      resumen: `Editó datos de contacto de la red ${red} (${Object.keys(datos).join(', ')})`,
      antes, despues: datos
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
