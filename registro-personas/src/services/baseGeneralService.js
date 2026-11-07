import {
  collection,
  getDocs,
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { REDES } from '../config/redes';
import { logCambio } from './historialService';

// Solo admin/pastor: las reglas de Firestore rechazan estas operaciones a los demás.
const MAX_GENERAL = 5000;

export const getPersonasGenerales = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'personas'), limit(MAX_GENERAL)));
    const data = snap.docs.map(d => {
      const x = d.data();
      return { ...x, cedula: d.id, creadoEn: x.creadoEn?.toDate ? x.creadoEn.toDate() : null };
    });
    return { success: true, data, truncado: snap.size >= MAX_GENERAL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Colecciones que forman "la base de personas".
const coleccionesDeBase = () => [
  { clave: 'general', ref: collection(db, 'personas') },
  { clave: 'indice',  ref: collection(db, 'personasIndice') },
  { clave: 'cuotas',  ref: collection(db, 'cuotasMasivo') },
  ...REDES.map(r => ({ clave: r.id, ref: collection(db, 'redes', r.id, 'personas') }))
];

export const contarBase = async () => {
  try {
    const conteos = {};
    for (const c of coleccionesDeBase()) conteos[c.clave] = (await getDocs(c.ref)).size;
    return { success: true, conteos };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Borra TODAS las personas (base general + personas de cada red). Antes de borrar
// deja constancia en el historial; si no se puede registrar, no se borra nada.
// El historial no se toca: es solo-append.
export const vaciarBase = async () => {
  try {
    const grupos = [];
    for (const c of coleccionesDeBase()) {
      const snap = await getDocs(c.ref);
      grupos.push({ clave: c.clave, refs: snap.docs.map(d => d.ref) });
    }
    const total = grupos.reduce((n, g) => n + g.refs.length, 0);
    const detalle = Object.fromEntries(grupos.map(g => [g.clave, g.refs.length]));

    const previo = await logCambio({
      accion: 'vaciar_base_inicio', entidad: 'base', entidadId: 'todas',
      resumen: `Inició el vaciado de la base de personas (${total} documentos)`,
      despues: detalle, cantidad: total
    });
    if (!previo.success) {
      return { success: false, error: 'No se pudo registrar la acción en el historial; no se borró nada.' };
    }

    const todos = grupos.flatMap(g => g.refs);
    for (let i = 0; i < todos.length; i += 400) {
      const batch = writeBatch(db);
      todos.slice(i, i + 400).forEach(ref => batch.delete(ref));
      await batch.commit();
    }

    await logCambio({
      accion: 'vaciar_base', entidad: 'base', entidadId: 'todas',
      resumen: `Vació la base de personas (${total} documentos eliminados)`,
      antes: detalle, cantidad: total
    });
    return { success: true, total };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
