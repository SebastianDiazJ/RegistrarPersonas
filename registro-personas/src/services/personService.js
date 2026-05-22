import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

const getPersonasCol = (red) => collection(db, 'redes', red, 'personas');

export const addPerson = async (red, personData) => {
  try {
    const docRef = await addDoc(getPersonasCol(red), {
      ...personData,
      createdAt: new Date().toISOString()
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
    await deleteDoc(doc(db, 'redes', red, 'personas', id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePerson = async (red, id, data) => {
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', id), data);
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
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const resetAbsences = async (red, id) => {
  try {
    await updateDoc(doc(db, 'redes', red, 'personas', id), { ausencias: 0 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
