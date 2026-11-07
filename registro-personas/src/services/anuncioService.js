import {
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { sanitizeText } from '../utils/validacion';
import { logCambio } from './historialService';

// Los anuncios se guardan "pendientes"; el workflow de GitHub (notificaciones/) los envía
// por correo y actualiza su estado. Las reglas impiden que el cliente cambie el estado.
export const DESTINOS = [
  { id: 'todos',   label: 'Todas las personas con correo' },
  { id: 'xtreme',  label: 'Red XTREME' },
  { id: 'parejas', label: 'Red PAREJAS' },
  { id: '360',     label: 'Red 360' },
  { id: 'senior',  label: 'Red SENIOR' }
];

export const crearAnuncio = async ({ titulo, mensaje, destino }) => {
  const t = sanitizeText(titulo, 100).replace(/\s+/g, ' ');
  const m = sanitizeText(mensaje, 3000);
  if (t.length < 3) return { success: false, error: 'El título debe tener al menos 3 caracteres.' };
  if (m.length < 1) return { success: false, error: 'Escribe el mensaje del anuncio.' };
  if (!DESTINOS.some(d => d.id === destino)) return { success: false, error: 'Destino no válido.' };
  try {
    const ref = await addDoc(collection(db, 'anuncios'), {
      titulo: t, mensaje: m, destino,
      creadoPor: auth.currentUser?.email || '',
      creadoUid: auth.currentUser?.uid || '',
      creadoEn: serverTimestamp(),
      estado: 'pendiente', enviados: 0, errores: 0, total: 0
    });
    await logCambio({
      accion: 'crear_anuncio', entidad: 'anuncio', entidadId: ref.id,
      resumen: `Creó el anuncio "${t}" para ${destino}`
    });
    return { success: true, id: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const conFecha = (d) => {
  const x = d.data();
  return { id: d.id, ...x, creadoEn: x.creadoEn?.toDate ? x.creadoEn.toDate() : null, ts: x.ts?.toDate ? x.ts.toDate() : null };
};

export const getAnuncios = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'anuncios'), orderBy('creadoEn', 'desc'), limit(30)));
    return { success: true, data: snap.docs.map(conFecha) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getEnvios = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'envios'), orderBy('ts', 'desc'), limit(40)));
    return { success: true, data: snap.docs.map(conFecha) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
