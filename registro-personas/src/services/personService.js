import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'persons';

export const addPerson = async (personData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...personData,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error al agregar persona:', error);
    return { success: false, error: error.message };
  }
};

export const getAllPersons = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const persons = [];
    querySnapshot.forEach((doc) => {
      persons.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: persons };
  } catch (error) {
    console.error('Error al obtener personas:', error);
    return { success: false, error: error.message };
  }
  };

// 🔥 ELIMINAR PERSONA
export const deletePerson = async (id) => {
  try {
    await deleteDoc(doc(db, 'persons', id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
export const updatePerson = async (id, data) => {
  try {
    await updateDoc(doc(db, 'persons', id), data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
  
