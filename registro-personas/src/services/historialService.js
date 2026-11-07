import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { sanitizeText } from '../utils/validacion';

// Bitácora de trazabilidad. Solo-append: las reglas de Firestore permiten crear
// entradas pero no editarlas ni borrarlas, y solo admin/pastor pueden leerla.
const historialCol = () => collection(db, 'historial');

export const PAGE_SIZE = 300;

export const ACCIONES = {
  crear_persona:   'Crear persona',
  editar_persona:  'Editar persona',
  eliminar_persona: 'Eliminar persona',
  vincular_pareja: 'Unir pareja',
  registrar_asistencia: 'Registrar asistencia',
  registrar_llamada: 'Registrar llamada',
  marcar_ausencia: 'Marcar ausencia',
  reiniciar_ausencias: 'Reiniciar ausencias',
  editar_red:      'Editar datos de red',
  exportar_excel:  'Exportar a Excel',
  vaciar_base_inicio: 'Vaciar base: inicio',
  vaciar_base:     'Vaciar base de personas'
};

export const TIPOS_ACTOR = {
  masivo: 'Ingreso masivo',
  red:    'Red',
  admin:  'Admin',
  pastor: 'Pastor'
};

// Quién actúa según la sesión de Firebase Auth (cuentas por rol).
export const actorDesdeAuth = () => {
  const email = auth.currentUser?.email || '';
  if (email === 'admin@iglesia.com')  return { actor: email, actorTipo: 'admin' };
  if (email === 'pastor@iglesia.com') return { actor: email, actorTipo: 'pastor' };
  if (email.endsWith('@redes.iglesia')) return { actor: email, actorTipo: 'red' };
  return null;
};

// Mapa plano y acotado de campos (antes/después). Ignora arrays y objetos.
export const compactMap = (obj = {}) => {
  const out = {};
  Object.entries(obj).slice(0, 25).forEach(([k, v]) => {
    if (v === undefined || (typeof v === 'object' && v !== null)) return;
    out[k.slice(0, 40)] = typeof v === 'string' ? v.slice(0, 200) : v === null ? '' : v;
  });
  return out;
};

const buildEntry = ({ actor, actorTipo, accion, entidad, entidadId = '', red = '', resumen = '', antes = {}, despues = {}, cantidad = 0 }) => ({
  actor: sanitizeText(actor, 80),
  actorTipo,
  accion,
  entidad: sanitizeText(entidad, 30),
  entidadId: sanitizeText(entidadId, 60),
  red: sanitizeText(red, 20),
  resumen: sanitizeText(resumen, 300),
  antes: compactMap(antes),
  despues: compactMap(despues),
  cantidad,
  uid: auth.currentUser?.uid || '',
  ts: serverTimestamp()
});

// `batch` opcional: la entrada se confirma o falla junto con el cambio que describe.
export const logCambio = async (entry, batch = null) => {
  const resolved = entry.actorTipo ? entry : { ...entry, ...(actorDesdeAuth() || {}) };
  if (!resolved.actorTipo) return { success: false, error: 'Sin actor autenticado' };
  const data = buildEntry(resolved);
  try {
    if (batch) {
      batch.set(doc(historialCol()), data);
      return { success: true };
    }
    await addDoc(historialCol(), data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getHistorial = async (cursor = null) => {
  try {
    const q = cursor
      ? query(historialCol(), orderBy('ts', 'desc'), startAfter(cursor), limit(PAGE_SIZE))
      : query(historialCol(), orderBy('ts', 'desc'), limit(PAGE_SIZE));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, ts: data.ts?.toDate ? data.ts.toDate() : null };
    });
    return {
      success: true,
      data: rows,
      cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
