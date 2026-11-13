import nodemailer from 'nodemailer';
import {
  REDES, esEmailValido, normalizarEmail, hashEmail, limpiarLinea,
  claveBienvenida, claveAvisoLider, bienvenida, avisoLider
} from './_compartido.mjs';

// Envío INMEDIATO de los correos de una persona recién registrada (aviso al líder de la red y
// bienvenida a la persona). La app la llama justo después de guardar.
//
// Seguridad: la función no usa ninguna clave de Firebase. Lee todo con el token de sesión de quien
// la llama, de modo que las reglas de Firestore deciden quién puede disparar qué:
//  - sin sesión, o con sesión anónima (Ingreso masivo), no puede leer la red ni la persona → 403;
//  - los destinatarios salen de la base (correo del líder y de la persona), nunca de la petición;
//  - cada correo se marca en `envios/{clave}` (solo-creación): no se puede repetir ni por esta vía
//    ni por el envío programado de GitHub, que usa las mismas claves.

const PROYECTO = process.env.FIREBASE_PROJECT_ID || 'registrarpersonas-6d547';
const RUTA = `projects/${PROYECTO}/databases/(default)/documents`;
const REST = process.env.FIRESTORE_REST_BASE || `https://firestore.googleapis.com/v1/${RUTA}`;
const DIAS_VENTANA = 3;

const desdeFirestore = (v) => {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  return undefined;
};
const aObjeto = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, desdeFirestore(v)]));

class ErrorHttp extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

const leer = async (ruta, token) => {
  const r = await fetch(`${REST}/${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if ([400, 401, 403].includes(r.status)) throw new ErrorHttp(403, 'Sin permiso'); // token inválido o sin permiso
  if (!r.ok) throw new ErrorHttp(502, 'No se pudo leer la base de datos');
  return aObjeto(await r.json());
};

const escribir = async (write, token) => {
  const r = await fetch(`${REST.replace(/\/documents$/, '')}/documents:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [write] })
  });
  return r.ok;
};

const campos = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [
  k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }
]));

const crearTransporte = () => {
  if (process.env.DRY_RUN === '1') return { seco: true, sendMail: async () => ({}) };
  const usuario = process.env.GMAIL_USER;
  const clave = process.env.GMAIL_APP_PASSWORD;
  if (!usuario || !clave) return null;
  const t = nodemailer.createTransport({
    service: 'gmail', auth: { user: usuario, pass: clave }, connectionTimeout: 8000, socketTimeout: 12000
  });
  return { seco: false, sendMail: (o) => t.sendMail({ from: `"Iglesia La Vid" <${usuario}>`, ...o }) };
};

// Texto de la marca en `envios`: sin saltos de línea ni < > (las reglas de Firestore los rechazan).
const paraMarca = (v, max) => limpiarLinea(v, max).replace(/[<>]/g, '');

// Marca → envío → resultado. La marca se crea primero (solo si no existe), así dos llamadas
// simultáneas o repetidas nunca mandan el mismo correo dos veces.
const enviarUnico = async ({ transporte, token, clave, tipo, para, nombre, red, msg }) => {
  const marcada = await escribir({
    update: {
      name: `${RUTA}/envios/${clave}`,
      fields: campos({
        tipo, destinatario: para, nombre: paraMarca(nombre, 80), asunto: paraMarca(msg.asunto, 150),
        estado: 'enviando', intentos: 1, red, origen: 'inmediato'
      })
    },
    updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { exists: false }
  }, token);
  if (!marcada) return 'omitido'; // ya existe (enviado por el otro camino) o no está permitido

  let estado = 'enviado';
  let errorCodigo = '';
  try {
    await transporte.sendMail({ to: para, subject: limpiarLinea(msg.asunto), html: msg.html, text: msg.texto, headers: msg.cabeceras });
  } catch (error) {
    estado = 'error';
    errorCodigo = String(error?.code || error?.responseCode || 'ERR').slice(0, 30);
  }
  await escribir({
    update: { name: `${RUTA}/envios/${clave}`, fields: campos({ estado, ...(errorCodigo ? { errorCodigo } : {}) }) },
    updateMask: { fieldPaths: errorCodigo ? ['estado', 'errorCodigo'] : ['estado'] },
    updateTransforms: [{ fieldPath: 'ts', setToServerValue: 'REQUEST_TIME' }]
  }, token);
  return estado === 'enviado' && transporte.seco ? 'simulado' : estado;
};

const procesar = async ({ red, id, token, appUrl }) => {
  const redInfo = REDES.find((r) => r.id === red);
  const [info, persona] = await Promise.all([
    leer(`redes/${red}`, token),
    leer(`redes/${red}/personas/${id}`, token)
  ]);
  if (!persona) throw new ErrorHttp(404, 'La persona no existe');

  // Solo personas recién registradas (la misma ventana que el envío programado).
  const creada = Date.parse(persona.createdAt || '');
  if (!(creada > Date.now() - DIAS_VENTANA * 24 * 60 * 60 * 1000)) throw new ErrorHttp(400, 'No es una persona nueva');

  const transporte = crearTransporte();
  if (!transporte) throw new ErrorHttp(503, 'El correo no está configurado');
  if (!process.env.APP_URL) process.env.APP_URL = appUrl;

  const resultado = { lider: 'sin_correo', persona: 'sin_correo' };
  const tareas = [];

  const liderEmail = normalizarEmail((info || {}).liderEmail);
  if (esEmailValido(liderEmail)) {
    const msg = avisoLider({ redNombre: redInfo.nombre, ...persona });
    tareas.push(enviarUnico({
      transporte, token, clave: claveAvisoLider(red, id), tipo: 'aviso_lider', para: liderEmail,
      nombre: `${persona.nombre || ''} ${persona.apellido || ''}`, red, msg
    }).then((r) => { resultado.lider = r; }));
  }

  const email = normalizarEmail(persona.email);
  if (esEmailValido(email)) {
    const baja = await leer(`bajas/${hashEmail(email)}`, token).catch(() => 'error');
    if (baja === 'error') {
      resultado.persona = 'omitido'; // no se pudo comprobar la baja: lo resuelve el envío programado
    } else if (baja) {
      resultado.persona = 'baja';
    } else {
      const msg = bienvenida({ nombre: persona.nombre, email });
      tareas.push(enviarUnico({
        transporte, token, clave: claveBienvenida(email), tipo: 'bienvenida', para: email,
        nombre: persona.nombre || '', red, msg
      }).then((r) => { resultado.persona = r; }));
    }
  }

  await Promise.all(tareas);
  return resultado;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'Método no permitido');

    const origen = req.headers.origin;
    if (origen && new URL(origen).host !== req.headers.host) throw new ErrorHttp(403, 'Origen no permitido');

    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token.length < 50 || token.length > 4000) throw new ErrorHttp(401, 'Falta la sesión');

    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const red = String(cuerpo.red || '');
    const id = String(cuerpo.id || '');
    if (!REDES.some((r) => r.id === red)) throw new ErrorHttp(400, 'Red no válida');
    if (!/^[A-Za-z0-9_-]{5,40}$/.test(id)) throw new ErrorHttp(400, 'Persona no válida');

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const resultado = await procesar({ red, id, token, appUrl: `${proto}://${req.headers.host}` });
    res.status(200).send(JSON.stringify({ ok: true, ...resultado }));
  } catch (error) {
    const status = error instanceof ErrorHttp ? error.status : 500;
    res.status(status).send(JSON.stringify({ ok: false, error: status === 500 ? 'Error interno' : error.message }));
  }
}
