import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  getDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logCambio } from './historialService';
import { sanitizeText, sanitizeName, sanitizeEmail, onlyDigits } from '../utils/validacion';

const getPersonasCol = (red) => collection(db, 'redes', red, 'personas');

// Saneamiento en el servicio: cubre todos los formularios (red, consolidación, edición en tabla).
const sanitizePersonData = (data = {}) => {
  const out = { ...data };
  const texto = (k, max) => { if (typeof out[k] === 'string') out[k] = sanitizeText(out[k], max); };
  const nombre = (k) => { if (typeof out[k] === 'string') out[k] = sanitizeName(out[k]); };
  nombre('nombre'); nombre('apellido'); nombre('aCargoDe');
  if (typeof out.email === 'string') out.email = sanitizeEmail(out.email);
  if (typeof out.telefono === 'string') out.telefono = onlyDigits(out.telefono).slice(0, 15);
  if (typeof out.edad === 'string') out.edad = onlyDigits(out.edad).slice(0, 3);
  texto('prayerRequest', 500); texto('metodoInvitacion', 40);
  return out;
};

const nombreCompleto = (p = {}) => `${p.nombre || ''} ${p.apellido || ''}`.trim() || '(sin nombre)';

// Campos que se comparan para el historial (los arrays de asistencia/llamadas se registran aparte).
const CAMPOS_AUDITADOS = [
  'nombre', 'apellido', 'telefono', 'email', 'edad', 'aCargoDe', 'metodoInvitacion',
  'fechaIngreso', 'mesCumple', 'diaCumple', 'prayerRequest'
];

const diffCampos = (antes = {}, despues = {}) => {
  const a = {}; const d = {};
  CAMPOS_AUDITADOS.forEach(k => {
    if (!(k in despues)) return;
    const va = antes[k] ?? ''; const vd = despues[k] ?? '';
    if (String(va) !== String(vd)) { a[k] = va; d[k] = vd; }
  });
  return { antes: a, despues: d };
};

export const addPerson = async (red, rawData) => {
  const personData = sanitizePersonData(rawData);
  try {
    const docRef = await addDoc(getPersonasCol(red), {
      ...personData,
      createdAt: new Date().toISOString()
    });
    await logCambio({
      accion: 'crear_persona', entidad: 'persona', entidadId: docRef.id, red,
      resumen: `Registró a ${nombreCompleto(personData)}`,
      despues: { nombre: personData.nombre, apellido: personData.apellido, aCargoDe: personData.aCargoDe }
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllPersons = async (red) => {
  try {
    const q = query(getPersonasCol(red), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const persons = [];
    snapshot.forEach((d) => persons.push({ id: d.id, ...d.data() }));
    return { success: true, data: persons };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deletePerson = async (red, id) => {
  try {
    const ref = doc(db, 'redes', red, 'personas', id);
    const prev = (await getDoc(ref)).data();
    await deleteDoc(ref);
    await logCambio({
      accion: 'eliminar_persona', entidad: 'persona', entidadId: id, red,
      resumen: `Eliminó a ${nombreCompleto(prev)}`,
      antes: { nombre: prev?.nombre, apellido: prev?.apellido, aCargoDe: prev?.aCargoDe }
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePerson = async (red, id, rawData) => {
  const data = sanitizePersonData(rawData);
  try {
    const ref = doc(db, 'redes', red, 'personas', id);
    const prev = (await getDoc(ref)).data();
    await updateDoc(ref, data);
    const { antes, despues } = diffCampos(prev, data);
    if (Object.keys(despues).length > 0) {
      await logCambio({
        accion: 'editar_persona', entidad: 'persona', entidadId: id, red,
        resumen: `Editó a ${nombreCompleto({ ...prev, ...data })}`,
        antes, despues
      });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCountByRed = async (red) => {
  try {
    const snapshot = await getDocs(getPersonasCol(red));
    return { success: true, count: snapshot.size };
  } catch {
    return { success: false, count: 0 };
  }
};

export const markAbsence = async (red, id) => {
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', id), { ausencias: increment(1) });
    await logCambio({ accion: 'marcar_ausencia', entidad: 'persona', entidadId: id, red, resumen: 'Marcó una ausencia' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const resetAbsences = async (red, id) => {
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', id), { ausencias: 0 });
    await logCambio({ accion: 'reiniciar_ausencias', entidad: 'persona', entidadId: id, red, resumen: 'Reinició las ausencias' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// servicio: 'sabado' | 'domingo' | 'miercoles'
export const addAttendanceRecord = async (red, personId, { servicio, asistio }) => {
  const record = {
    id: Date.now(),
    fecha: new Date().toISOString().split('T')[0],
    servicio,
    asistio,
    ts: new Date().toISOString()
  };
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', personId), {
      asistencias: arrayUnion(record)
    });
    await logCambio({
      accion: 'registrar_asistencia', entidad: 'persona', entidadId: personId, red,
      resumen: `Asistencia ${servicio}: ${asistio ? 'asistió' : 'no asistió'}`
    });
    return { success: true, record };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// resultado: 'contesto' | 'no_contesto' | 'desinteres'
export const buildCallRecord = ({ resultado, observacion }) => ({
  fecha: new Date().toISOString().split('T')[0],
  resultado,
  observacion: sanitizeText(observacion, 500),
  ts: new Date().toISOString()
});

export const addCallRecord = async (red, personId, { resultado, observacion }) => {
  const record = buildCallRecord({ resultado, observacion });
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', personId), {
      llamadas: arrayUnion(record),
      lastCallDate: record.ts,
      lastCallResult: resultado
    });
    await logCambio({
      accion: 'registrar_llamada', entidad: 'persona', entidadId: personId, red,
      resumen: `Llamada: ${resultado}`
    });
    return { success: true, record };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
