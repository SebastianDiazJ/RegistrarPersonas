// Prueba de la función de envío inmediato (registro-personas/api/avisar.js) contra los emuladores
// de Auth y Firestore (con las reglas reales). No envía correos (DRY_RUN) ni toca datos reales:
//   firebase emulators:start --only auth,firestore --project demo-registro   (en registro-personas/)
//   node test/avisar.e2e.mjs
import assert from 'node:assert/strict';

process.env.DRY_RUN = '1';
process.env.FIREBASE_PROJECT_ID = 'demo-registro';
process.env.FIRESTORE_REST_BASE = 'http://127.0.0.1:8080/v1/projects/demo-registro/databases/(default)/documents';
process.env.APP_URL = 'https://lavid.example.com';
const { default: handler } = await import('../../registro-personas/api/avisar.js');
const { hashEmail } = await import('../src/lib.mjs');

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake';
const DOCS = process.env.FIRESTORE_REST_BASE;
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const crearUsuario = async (email) => {
  const r = await fetch(AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(email ? { email, password: 'TestPass123!', returnSecureToken: true } : { returnSecureToken: true }) });
  const d = await r.json();
  if (d.idToken) return d.idToken;
  // ya existe: iniciar sesión
  const l = await fetch(AUTH.replace('signUp', 'signInWithPassword'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'TestPass123!', returnSecureToken: true }) });
  return (await l.json()).idToken;
};

const tv = (v) => (typeof v === 'string' ? { stringValue: v } : { integerValue: String(v) });
const poner = (ruta, obj) => fetch(`${DOCS}/${ruta}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, tv(v)])) }) });
const borrarColeccion = async (col) => {
  const r = await fetch(`${DOCS}/${col}`, { headers: owner });
  const d = await r.json();
  for (const x of d.documents || []) await fetch(`http://127.0.0.1:8080/v1/${x.name}`, { method: 'DELETE', headers: owner });
};
const leerEnvios = async () => {
  const r = await fetch(`${DOCS}/envios`, { headers: owner });
  const d = await r.json();
  return (d.documents || []).map((x) => ({ id: x.name.split('/').pop(), ...Object.fromEntries(Object.entries(x.fields).map(([k, v]) => [k, Object.values(v)[0]])) }));
};

const llamar = async ({ token, body, metodo = 'POST', origen }) => {
  const req = { method: metodo, headers: { host: 'lavid.example.com', 'x-forwarded-proto': 'https', ...(origen ? { origin: origen } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(t) { this.cuerpo = JSON.parse(t); } };
  await handler(req, res);
  return { status: res.code, ...res.cuerpo };
};

let ok = 0;
const t = async (nombre, fn) => { try { await fn(); ok++; console.log('  ok  ', nombre); } catch (e) { console.log('  FAIL', nombre, '\n      ', String(e.message).replace(/\n/g, ' | ').slice(0, 400)); process.exitCode = 1; } };

// ── datos ───────────────────────────────────────────────────────────────
for (const c of ['envios', 'bajas', 'redes/xtreme/personas']) await borrarColeccion(c);
const ahora = new Date().toISOString();
const vieja = new Date(Date.now() - 10 * 864e5).toISOString();
await poner('redes/xtreme', { liderNombre: 'Lider X', liderEmail: 'lider@example.com' });
await poner('redes/parejas', { liderNombre: 'Lider P' });
await poner('redes/xtreme/personas/PERSONA0001', { nombre: 'Ana <b>x</b>', apellido: 'Perez', telefono: '3001112222', email: 'ana@example.com', aCargoDe: 'Lider X', createdAt: ahora });
await poner('redes/xtreme/personas/PERSONA0002', { nombre: 'Baja', apellido: 'Persona', telefono: '3001112223', email: 'baja@example.com', createdAt: ahora });
await poner('redes/xtreme/personas/PERSONA0003', { nombre: 'Antigua', apellido: 'Registro', telefono: '3001112224', email: 'vieja@example.com', createdAt: vieja });
await poner('redes/xtreme/personas/PERSONA0004', { nombre: 'Sin', apellido: 'Correo', telefono: '3001112225', email: '', createdAt: ahora });
await poner('redes/parejas/personas/PERSONA0005', { nombre: 'Par', apellido: 'Ejas', telefono: '3001112226', email: 'par@example.com', createdAt: ahora });
await poner(`bajas/${hashEmail('baja@example.com')}`, { fecha: ahora });

const tokenX = await crearUsuario('xtreme@redes.iglesia');
const tokenP = await crearUsuario('parejas@redes.iglesia');
const tokenAnon = await crearUsuario(null);

console.log('== Envío inmediato ==');
await t('red xtreme avisa: líder y bienvenida', async () => {
  const r = await llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0001' } });
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.equal(r.lider, 'simulado'); assert.equal(r.persona, 'simulado');
  const e = await leerEnvios();
  assert.deepEqual(e.map((x) => x.id).sort(), ['bienvenida_' + hashEmail('ana@example.com'), 'lider_xtreme_PERSONA0001'].sort());
  assert.ok(e.every((x) => x.origen === 'inmediato' && x.estado === 'enviado'));
  assert.equal(e.find((x) => x.tipo === 'aviso_lider').destinatario, 'lider@example.com');
});
await t('segunda llamada: no repite nada', async () => {
  const r = await llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0001' } });
  assert.equal(r.lider, 'omitido'); assert.equal(r.persona, 'omitido');
  assert.equal((await leerEnvios()).length, 2);
});
await t('llamadas simultáneas: un solo envío', async () => {
  const [a, b] = await Promise.all([
    llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0004' } }),
    llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0004' } })
  ]);
  const lideres = [a.lider, b.lider].sort();
  assert.deepEqual(lideres, ['omitido', 'simulado']);
});
await t('persona sin correo: solo aviso al líder', async () => {
  const r = await llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0004' } });
  assert.equal(r.persona, 'sin_correo');
});
await t('persona dada de baja: sin bienvenida', async () => {
  const r = await llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0002' } });
  assert.equal(r.persona, 'baja'); assert.equal(r.lider, 'simulado');
});
await t('red sin correo de líder: lo indica', async () => {
  const r = await llamar({ token: tokenP, body: { red: 'parejas', id: 'PERSONA0005' } });
  assert.equal(r.lider, 'sin_correo'); assert.equal(r.persona, 'simulado');
});

console.log('== Seguridad ==');
await t('sin sesión -> 401', async () => assert.equal((await llamar({ body: { red: 'xtreme', id: 'PERSONA0001' } })).status, 401));
await t('sesión anónima (Ingreso masivo) -> 403', async () => assert.equal((await llamar({ token: tokenAnon, body: { red: 'xtreme', id: 'PERSONA0001' } })).status, 403));
await t('otra red no puede disparar -> 403', async () => assert.equal((await llamar({ token: tokenP, body: { red: 'xtreme', id: 'PERSONA0001' } })).status, 403));
await t('token inventado -> 403', async () => assert.equal((await llamar({ token: 'x'.repeat(200), body: { red: 'xtreme', id: 'PERSONA0001' } })).status, 403));
await t('persona antigua -> 400', async () => assert.equal((await llamar({ token: tokenX, body: { red: 'xtreme', id: 'PERSONA0003' } })).status, 400));
await t('persona inexistente -> 404', async () => assert.equal((await llamar({ token: tokenX, body: { red: 'xtreme', id: 'NOEXISTE123' } })).status, 404));
await t('red no válida -> 400', async () => assert.equal((await llamar({ token: tokenX, body: { red: 'hack', id: 'PERSONA0001' } })).status, 400));
await t('id con caracteres raros -> 400', async () => assert.equal((await llamar({ token: tokenX, body: { red: 'xtreme', id: '../../x' } })).status, 400));
await t('método GET -> 405', async () => assert.equal((await llamar({ token: tokenX, metodo: 'GET', body: {} })).status, 405));
await t('origen distinto -> 403', async () => assert.equal((await llamar({ token: tokenX, origen: 'https://evil.example.com', body: { red: 'xtreme', id: 'PERSONA0001' } })).status, 403));

console.log('== Reglas de envios (cliente con sesión) ==');
const rest = (ruta, token, metodo, cuerpo) => fetch(`${DOCS}/${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
await t('red NO puede marcar un envío como enviado directamente', async () => {
  const r = await rest('envios/lider_xtreme_FALSO12345', tokenX, 'PATCH', { fields: { tipo: tv('aviso_lider'), estado: tv('enviado') } });
  assert.equal(r.status, 403);
});
await t('red NO puede editar un envío ya creado (programado)', async () => {
  await poner('envios/lider_xtreme_PROGRAMADO1', { tipo: 'aviso_lider', estado: 'error', origen: 'programado' });
  const r = await rest('envios/lider_xtreme_PROGRAMADO1?updateMask.fieldPaths=estado', tokenX, 'PATCH', { fields: { estado: tv('enviado') } });
  assert.equal(r.status, 403);
});
await t('red NO puede leer ni borrar envíos', async () => {
  assert.equal((await rest('envios', tokenX, 'GET')).status, 403);
  assert.equal((await rest('envios/lider_xtreme_PERSONA0001', tokenX, 'DELETE')).status, 403);
});
await t('bajas: la red puede consultar por hash exacto pero no listar', async () => {
  assert.equal((await rest(`bajas/${hashEmail('baja@example.com')}`, tokenX, 'GET')).status, 200);
  assert.equal((await rest('bajas', tokenX, 'GET')).status, 403);
  assert.equal((await rest(`bajas/${hashEmail('baja@example.com')}`, tokenAnon, 'GET')).status, 403);
});

console.log(`\n${ok} pruebas correctas`);
