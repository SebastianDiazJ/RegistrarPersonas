import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ALERT_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 horas en milisegundos

/**
 * Marca una persona como contactada (se llamó)
 */
export const markPersonCalled = async (red, personId) => {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'redes', red, 'personas', personId), {
      lastCallDate: now,
      callConfirmed: true,
      callConfirmedAt: now
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene el estado de alerta para una persona
 * Retorna: { isAlert: boolean, hoursLeft: number, lastCallDate: string }
 */
export const getCallAlertStatus = (persona) => {
  if (!persona.lastCallDate) {
    return { isAlert: false, hoursLeft: 48, lastCallDate: null };
  }

  const lastCall = new Date(persona.lastCallDate);
  const now = new Date();
  const diffMs = now - lastCall;
  const diffHours = diffMs / (1000 * 60 * 60);
  const hoursLeft = Math.max(0, 48 - diffHours);

  return {
    isAlert: hoursLeft <= 0,
    hoursLeft: Math.ceil(hoursLeft),
    lastCallDate: persona.lastCallDate
  };
};

/**
 * Obtiene lista de personas que necesitan alerta de llamada
 */
export const getPersonasNeedingCall = (personas) => {
  return personas.filter(p => {
    const status = getCallAlertStatus(p);
    return status.isAlert;
  }).sort((a, b) => {
    const statusA = getCallAlertStatus(a);
    const statusB = getCallAlertStatus(b);
    return new Date(statusA.lastCallDate) - new Date(statusB.lastCallDate);
  });
};

/**
 * Obtiene resumen de estado de llamadas por red
 */
export const getCallAlertSummary = (personas) => {
  const needingCall = getPersonasNeedingCall(personas);
  const upToDate = personas.filter(p => {
    const status = getCallAlertStatus(p);
    return !status.isAlert && p.lastCallDate;
  });
  const neverCalled = personas.filter(p => !p.lastCallDate);

  return {
    needingCall: needingCall.length,
    upToDate: upToDate.length,
    neverCalled: neverCalled.length,
    total: personas.length,
    percentage: personas.length > 0 ? Math.round((upToDate.length / personas.length) * 100) : 0
  };
};
