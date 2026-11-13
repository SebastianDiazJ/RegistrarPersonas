import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { normalizarEmail, esEmailValido, hashEmail, escaparHtml, limpiarLinea, primerNombre, REDES } from '../../registro-personas/api/_compartido.mjs';

// Estas utilidades viven en registro-personas/api/_compartido.mjs (las usa también el envío inmediato).
export { normalizarEmail, esEmailValido, hashEmail, escaparHtml, limpiarLinea, primerNombre, REDES };

// Gmail gratis permite ~500 correos al día: dejamos margen.
export const LIMITE_DIARIO = 450;
export const LIMITE_POR_EJECUCION = 100;

// Fecha de hoy en Colombia (los cumpleaños se felicitan en hora local).
export const hoyBogota = (ahora = new Date()) => {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(ahora).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
  return { anio: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day) };
};
export const inicioDiaBogota = (ahora = new Date()) => {
  const { anio, mes, dia } = hoyBogota(ahora);
  return new Date(Date.UTC(anio, mes - 1, dia, 5, 0, 0)); // 00:00 en UTC-5
};

export const iniciarFirestore = () => {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-registro' });
  } else {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!cred) throw new Error('Falta el secreto FIREBASE_SERVICE_ACCOUNT');
    let cuenta;
    try {
      cuenta = JSON.parse(cred);
    } catch {
      // No se muestra el detalle del error: podría incluir el inicio del secreto.
      throw new Error('El secreto FIREBASE_SERVICE_ACCOUNT no es un JSON válido: pega el archivo .json completo, de { a }, sin comillas extra');
    }
    const faltan = ['project_id', 'client_email', 'private_key'].filter((k) => !cuenta?.[k]);
    if (faltan.length) throw new Error(`El JSON de FIREBASE_SERVICE_ACCOUNT no parece una clave de cuenta de servicio (falta: ${faltan.join(', ')})`);
    initializeApp({ credential: cert(cuenta) });
  }
  return getFirestore();
};

export { FieldValue, Timestamp };

export const crearCorreo = () => {
  const seco = process.env.DRY_RUN === '1';
  const usuario = process.env.GMAIL_USER;
  if (!seco && (!usuario || !process.env.GMAIL_APP_PASSWORD)) {
    throw new Error('Faltan los secretos GMAIL_USER / GMAIL_APP_PASSWORD');
  }
  const transporte = seco
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ service: 'gmail', auth: { user: usuario, pass: process.env.GMAIL_APP_PASSWORD } });
  return {
    seco,
    enviar: ({ para, asunto, html, texto, cabeceras }) => transporte.sendMail({
      from: `"Iglesia La Vid" <${usuario || 'no-reply@example.com'}>`,
      to: para,
      subject: limpiarLinea(asunto),
      html,
      text: texto,
      headers: cabeceras
    })
  };
};

// Correos de personas que pidieron no recibir más (colección `bajas`, id = hash del correo).
export const cargarBajas = async (db) => {
  const snap = await db.collection('bajas').select().get();
  return new Set(snap.docs.map((d) => d.id));
};

// Envío idempotente: `envios/{clave}` evita repetir un mismo correo. Un envío con error
// se reintenta hasta 3 veces. No se escriben correos ni nombres en el log (el repo es público).
export const enviarUnico = async ({ db, correo, clave, tipo, para, nombre = '', asunto, html, texto, cabeceras, extra = {} }) => {
  const ref = db.collection('envios').doc(clave);
  const previo = await ref.get();
  if (previo.exists) {
    const d = previo.data();
    // Un envío "simulado" (prueba) no cuenta como enviado: el envío real debe poder hacerse después.
    // Un envío "enviando" de hace más de 10 minutos quedó a medias (p. ej. la función inmediata se cortó): se reintenta.
    const atascado = d.estado === 'enviando' && d.ts?.toMillis && (Date.now() - d.ts.toMillis()) > 10 * 60 * 1000;
    if (d.estado !== 'simulado' && !atascado && (d.estado !== 'error' || (d.intentos || 0) >= 3)) return 'omitido';
  }
  const intentos = (previo.data()?.intentos || 0) + 1;
  await ref.set({ tipo, destinatario: para, nombre: limpiarLinea(nombre, 80), asunto: limpiarLinea(asunto), estado: 'enviando', intentos, ts: FieldValue.serverTimestamp(), ...extra });
  try {
    await correo.enviar({ para, asunto, html, texto, cabeceras });
    await ref.set({ estado: correo.seco ? 'simulado' : 'enviado', ts: FieldValue.serverTimestamp() }, { merge: true });
    return 'enviado';
  } catch (error) {
    await ref.set({ estado: 'error', errorCodigo: String(error.code || error.responseCode || 'ERR').slice(0, 30) }, { merge: true });
    return 'error';
  }
};

export const contarEnviadosHoy = async (db) => {
  const snap = await db.collection('envios').where('ts', '>=', Timestamp.fromDate(inicioDiaBogota())).count().get();
  return snap.data().count;
};
