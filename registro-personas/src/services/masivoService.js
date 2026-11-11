import {
  doc,
  getDoc,
  getDocFromServer,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { logCambio } from './historialService';
import { REDES } from '../config/redes';
import { METODOS_INVITACION, ESTADOS_CIVILES } from '../config/opciones';
import {
  sanitizeText, sanitizeName, sanitizeEmail, onlyDigits,
  isValidCedula, isValidEmail, isValidFecha
} from '../utils/validacion';

// ── Límites de uso del modo sin contraseña ────────────────────────────────
// Frenan scripts simples y errores; la protección real está en las reglas de
// Firestore (solo get por cédula exacta, sin listados, cuota de altas por sesión).
const MAX_CONSULTAS = 400;
const INTERVALO_MS = 1000;
let consultas = 0;
let ultimaConsulta = 0;

export const reiniciarLimitesMasivo = () => { consultas = 0; ultimaConsulta = 0; };

// `interna`: verificaciones que hace el propio registro (no se espera entre ellas).
const aplicarLimite = (interna = false) => {
  const ahora = Date.now();
  if (consultas >= MAX_CONSULTAS) {
    return 'Alcanzaste el máximo de búsquedas de esta sesión. Cierra y vuelve a entrar al ingreso masivo.';
  }
  if (!interna && ahora - ultimaConsulta < INTERVALO_MS) {
    return 'Espera un momento antes de volver a buscar.';
  }
  consultas += 1;
  ultimaConsulta = ahora;
  return null;
};

const indiceRef = (cedula) => doc(db, 'personasIndice', cedula);
const personaRef = (cedula) => doc(db, 'personas', cedula);

// Busca por cédula EXACTA. Devuelve solo lo mínimo del índice (nombre abreviado
// y si ya tiene pareja); nunca la ficha completa.
export const buscarPorCedula = async (cedulaRaw, { interna = false } = {}) => {
  const cedula = onlyDigits(cedulaRaw);
  if (!isValidCedula(cedula)) return { success: false, error: 'La cédula debe tener entre 5 y 12 dígitos.' };
  const limite = aplicarLimite(interna);
  if (limite) return { success: false, error: limite };
  try {
    const snap = await getDoc(indiceRef(cedula));
    if (!snap.exists()) return { success: true, found: false, cedula };
    return { success: true, found: true, cedula, ...snap.data() };
  } catch {
    return { success: false, error: 'No se pudo consultar. Intenta de nuevo.' };
  }
};

// Valida y sanea el formulario. Devuelve { errors, clean }.
export const validarFormulario = (form) => {
  const errors = {};
  const clean = {
    cedula: onlyDigits(form.cedula),
    nombre: sanitizeName(form.nombre),
    apellido: sanitizeName(form.apellido),
    telefono: onlyDigits(form.telefono).slice(0, 15),
    email: sanitizeEmail(form.email),
    mesCumple: String(form.mesCumple || ''),
    diaCumple: String(form.diaCumple || ''),
    estadoCivil: form.estadoCivil || '',
    parejaCedula: form.tienePareja === 'si' ? onlyDigits(form.parejaCedula) : '',
    asiste: form.asiste === 'si',
    redAsignada: form.asiste === 'si' ? form.redAsignada : '',
    aCargoDe: form.asiste === 'si' ? sanitizeName(form.aCargoDe) : '',
    metodoInvitacion: form.asiste === 'si' ? form.metodoInvitacion || '' : '',
    fechaIngreso: form.fechaIngreso,
    prayerRequest: form.tienePeticion === 'si' ? sanitizeText(form.prayerRequest, 500) : ''
  };

  if (!isValidCedula(clean.cedula)) errors.cedula = 'Cédula de 5 a 12 dígitos.';
  if (!clean.nombre) errors.nombre = 'Escribe el nombre.';
  if (!clean.apellido) errors.apellido = 'Escribe el apellido.';
  if (!/^\d{7,15}$/.test(clean.telefono)) errors.telefono = 'Teléfono de 7 a 15 dígitos.';
  if (!isValidEmail(clean.email)) errors.email = 'Correo no válido.';
  if ((clean.mesCumple && !clean.diaCumple) || (!clean.mesCumple && clean.diaCumple)) {
    errors.cumple = 'Completa mes y día del cumpleaños.';
  }
  if (clean.estadoCivil && !ESTADOS_CIVILES.some(e => e.id === clean.estadoCivil)) errors.estadoCivil = 'Estado civil no válido.';
  if (form.tienePareja === 'si') {
    if (!isValidCedula(clean.parejaCedula)) errors.parejaCedula = 'Cédula de la pareja no válida.';
    else if (clean.parejaCedula === clean.cedula) errors.parejaCedula = 'La pareja no puede ser la misma persona.';
  }
  if (clean.asiste) {
    if (!REDES.some(r => r.id === clean.redAsignada)) errors.redAsignada = 'Elige la red.';
    if (!clean.aCargoDe) errors.aCargoDe = 'Escribe quién queda a cargo.';
    if (clean.metodoInvitacion && !METODOS_INVITACION.includes(clean.metodoInvitacion)) errors.metodoInvitacion = 'Método no válido.';
  }
  if (!isValidFecha(clean.fechaIngreso)) errors.fechaIngreso = 'Fecha de ingreso no válida.';
  if (!form.habeasData) errors.habeasData = 'Debes aceptar la política de tratamiento de datos (Habeas Data).';
  return { errors, clean };
};

const nombreCorto = (nombre, apellido) =>
  `${nombre.split(' ')[0]} ${apellido.charAt(0)}.`.slice(0, 40);

// Registra una persona (y la asigna a la red / une a la pareja) en un solo lote.
export const registrarPersona = async (form, actorNombre) => {
  const { errors, clean } = validarFormulario(form);
  if (Object.keys(errors).length > 0) return { success: false, errors };

  const existente = await buscarPorCedula(clean.cedula, { interna: true });
  if (!existente.success) return { success: false, error: existente.error };
  if (existente.found) return { success: false, errors: { cedula: 'Esta cédula ya está registrada.' } };

  if (clean.parejaCedula) {
    const pareja = await buscarPorCedula(clean.parejaCedula, { interna: true });
    if (!pareja.success) return { success: false, error: pareja.error };
    if (!pareja.found) return { success: false, errors: { parejaCedula: 'La cédula de la pareja no está registrada.' } };
    if (pareja.tienePareja) return { success: false, errors: { parejaCedula: 'Esa persona ya tiene pareja asignada.' } };
  }

  const uid = auth.currentUser?.uid;
  const esAnonimo = auth.currentUser?.isAnonymous;
  const ahora = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(personaRef(clean.cedula), {
    ...clean,
    habeasData: true,
    habeasDataFecha: new Date().toISOString(),
    creadoPor: actorNombre,
    origen: 'ingreso_masivo',
    creadoUid: uid,
    creadoEn: ahora
  });
  batch.set(indiceRef(clean.cedula), {
    nombreCorto: nombreCorto(clean.nombre, clean.apellido),
    tienePareja: Boolean(clean.parejaCedula),
    asiste: clean.asiste
  });

  if (clean.asiste) {
    const mes = clean.mesCumple, dia = clean.diaCumple;
    batch.set(doc(db, 'redes', clean.redAsignada, 'personas', clean.cedula), {
      cedula: clean.cedula,
      nombre: clean.nombre,
      apellido: clean.apellido,
      telefono: clean.telefono,
      email: clean.email,
      aCargoDe: clean.aCargoDe,
      metodoInvitacion: clean.metodoInvitacion,
      fechaIngreso: clean.fechaIngreso,
      prayerRequest: clean.prayerRequest,
      mesCumple: mes,
      diaCumple: dia,
      fechaNacimiento: mes && dia ? `2000-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}` : '',
      edad: '',
      ausencias: 0,
      llamadas: [],
      lastCallDate: null,
      lastCallResult: null,
      callConfirmed: false,
      origen: 'ingreso_masivo',
      creadoPor: actorNombre,
      createdAt: new Date().toISOString()
    });
  }

  if (clean.parejaCedula) {
    batch.update(personaRef(clean.parejaCedula), { parejaCedula: clean.cedula, actualizadoEn: ahora });
    batch.update(indiceRef(clean.parejaCedula), { tienePareja: true });
  }

  // Cuota de altas por sesión anónima: las reglas exigen que cada alta sume 1 (con tope).
  if (esAnonimo) {
    try {
      const cuota = await getDocFromServer(doc(db, 'cuotasMasivo', uid));
      batch.set(doc(db, 'cuotasMasivo', uid), { creados: (cuota.exists() ? cuota.data().creados : 0) + 1 });
    } catch {
      return { success: false, error: 'No se pudo verificar el límite de la sesión. Intenta de nuevo.' };
    }
  }

  await logCambio({
    actor: actorNombre, actorTipo: 'masivo',
    accion: 'crear_persona', entidad: 'persona_general', entidadId: clean.cedula, red: clean.redAsignada,
    resumen: `Registró a ${clean.nombre} ${clean.apellido} (cédula ${clean.cedula})${clean.asiste ? ` y la asignó a la red ${clean.redAsignada}` : ' sin asignar a red (no asiste)'}${clean.parejaCedula ? `; unida con la cédula ${clean.parejaCedula}` : ''}`,
    despues: {
      cedula: clean.cedula, nombre: clean.nombre, apellido: clean.apellido,
      asiste: clean.asiste, red: clean.redAsignada, aCargoDe: clean.aCargoDe, parejaCedula: clean.parejaCedula
    }
  }, batch);

  try {
    await batch.commit();
    return { success: true, persona: { ...clean, habeasData: true, creadoPor: actorNombre } };
  } catch (error) {
    return { success: false, error: errorAmigable(error) };
  }
};

// Une dos personas ya registradas (ambas por cédula).
export const unirParejas = async (cedulaA, cedulaB, actorNombre) => {
  if (!isValidCedula(cedulaA) || !isValidCedula(cedulaB)) return { success: false, error: 'Cédulas no válidas.' };
  if (cedulaA === cedulaB) return { success: false, error: 'Las cédulas deben ser distintas.' };

  const a = await buscarPorCedula(cedulaA, { interna: true });
  if (!a.success) return a;
  const b = await buscarPorCedula(cedulaB, { interna: true });
  if (!b.success) return b;
  if (!a.found) return { success: false, error: `La cédula ${cedulaA} no está registrada.` };
  if (!b.found) return { success: false, error: `La cédula ${cedulaB} no está registrada.` };
  if (a.tienePareja || b.tienePareja) return { success: false, error: 'Una de las dos personas ya tiene pareja asignada.' };

  const ahora = serverTimestamp();
  const batch = writeBatch(db);
  batch.update(personaRef(cedulaA), { parejaCedula: cedulaB, actualizadoEn: ahora });
  batch.update(personaRef(cedulaB), { parejaCedula: cedulaA, actualizadoEn: ahora });
  batch.update(indiceRef(cedulaA), { tienePareja: true });
  batch.update(indiceRef(cedulaB), { tienePareja: true });
  await logCambio({
    actor: actorNombre, actorTipo: 'masivo',
    accion: 'vincular_pareja', entidad: 'persona_general', entidadId: cedulaA,
    resumen: `Unió como pareja a ${a.nombreCorto} (${cedulaA}) con ${b.nombreCorto} (${cedulaB})`,
    antes: { parejaCedula: '' }, despues: { parejaCedula: cedulaB }
  }, batch);

  try {
    await batch.commit();
    return { success: true, a, b };
  } catch (error) {
    return { success: false, error: errorAmigable(error) };
  }
};

const errorAmigable = (error) =>
  error?.code === 'permission-denied'
    ? 'El servidor rechazó el registro (datos no válidos o límite de la sesión alcanzado).'
    : 'No se pudo guardar. Intenta de nuevo.';
