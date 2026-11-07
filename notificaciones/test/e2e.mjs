// Prueba de extremo a extremo contra el emulador de Firestore (no toca datos reales):
//   firebase emulators:start --only firestore --project demo-registro
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node test/e2e.mjs
// Siembra datos, ejecuta el notificador en modo simulación (DRY_RUN) dos veces y comprueba
// qué correos se generan y que la segunda ejecución no repite nada.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { initializeApp, getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { hashEmail, hoyBogota } from '../src/lib.mjs';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
initializeApp({ projectId: 'demo-registro' });
const db = getFirestore();

// Limpia
for (const col of ['redes', 'personas', 'envios', 'anuncios', 'bajas']) {
  await db.recursiveDelete(db.collection(col));
}

const { mes, dia } = hoyBogota();
const ahoraISO = new Date().toISOString();
const viejoISO = new Date(Date.now() - 10 * 864e5).toISOString();

await db.collection('redes').doc('xtreme').set({ liderEmail: 'lider@example.com', nombre: 'XTREME' });
const P = (id, d) => db.collection('redes').doc('xtreme').collection('personas').doc(id).set(d);
await P('nueva', { nombre: 'Ana <b>x</b>', apellido: 'Perez', telefono: '3001112222', email: 'ana@example.com', createdAt: ahoraISO, mesCumple: '', diaCumple: '' });
await P('sinCorreo', { nombre: 'Sin', apellido: 'Correo', email: '', createdAt: ahoraISO });
await P('antigua', { nombre: 'Vieja', apellido: 'Registro', email: 'vieja@example.com', createdAt: viejoISO });
await P('cumple', { nombre: 'Cumple', apellido: 'Hoy', email: 'cumple@example.com', createdAt: viejoISO, mesCumple: String(mes), diaCumple: String(dia) });
await P('baja', { nombre: 'Baja', apellido: 'Persona', email: 'baja@example.com', createdAt: ahoraISO, mesCumple: String(mes), diaCumple: String(dia) });
await P('malCorreo', { nombre: 'Mal', apellido: 'Correo', email: 'no-es-correo', createdAt: ahoraISO });
await db.collection('bajas').doc(hashEmail('baja@example.com')).set({ fecha: new Date() });
await db.collection('personas').doc('1234567').set({ nombre: 'General', apellido: 'Sinred', email: 'general@example.com', creadoEn: new Date(), mesCumple: '', diaCumple: '' });
// Mismo correo que la persona de red: no debe duplicarse
await db.collection('personas').doc('7654321').set({ nombre: 'Ana', apellido: 'Perez', email: 'ANA@example.com', creadoEn: new Date() });
await db.collection('anuncios').doc('a1').set({ titulo: 'Culto\r\nBcc: x@y.com', mensaje: 'Hola <script>alert(1)</script>\n\nNos vemos', destino: 'xtreme', estado: 'pendiente', enviados: 0, errores: 0, total: 0, creadoEn: new Date() });

const correr = (modo) => {
  const r = spawnSync(process.execPath, ['src/index.mjs', `--modo=${modo}`], {
    env: { ...process.env, DRY_RUN: '1', APP_URL: 'https://lavid.example.com' }, encoding: 'utf8'
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};

const salida1 = correr('todo');
console.log(salida1);
const envios = (await db.collection('envios').get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const porTipo = (t) => envios.filter((e) => e.tipo === t);

assert.equal(porTipo('bienvenida').length, 2, 'bienvenida: Ana (una sola vez) y General');
assert.ok(!porTipo('bienvenida').some((e) => e.destinatario === 'baja@example.com'), 'no escribe a quien se dio de baja');
assert.ok(!envios.some((e) => e.destinatario === 'vieja@example.com' && e.tipo === 'bienvenida'), 'no da bienvenida a registros antiguos');
assert.ok(!envios.some((e) => e.destinatario === 'no-es-correo'), 'ignora correos inválidos');
assert.equal(porTipo('aviso_lider').length, 4, 'aviso a líder por cada persona nueva de la red (aunque no tenga correo)');
assert.ok(porTipo('aviso_lider').every((e) => e.destinatario === 'lider@example.com'));
assert.equal(porTipo('cumpleanos').length, 1, 'cumpleaños: solo quien cumple y no se dio de baja');
assert.equal(porTipo('cumpleanos')[0].destinatario, 'cumple@example.com');
const anuncios = porTipo('anuncio');
assert.ok(anuncios.length >= 1 && anuncios.every((e) => !/[\r\n]/.test(e.asunto)), 'asunto del anuncio sin saltos de línea');
const a1 = (await db.collection('anuncios').doc('a1').get()).data();
assert.equal(a1.estado, 'enviado');
assert.equal(a1.enviados + a1.errores, a1.total);
assert.equal(a1.total, 3, 'anuncio a XTREME: Ana, Vieja y Cumple (sin baja, sin correos inválidos)');
assert.ok(envios.every((e) => e.estado === 'simulado'));

// Idempotencia: la segunda ejecución no repite nada
const antes = (await db.collection('envios').get()).size;
const salida2 = correr('todo');
const despues = (await db.collection('envios').get()).size;
assert.equal(despues, antes, 'la segunda ejecución no crea envíos nuevos');
assert.match(salida2, /"omitido"|Resumen: \{/);

console.log(`OK: ${antes} envíos simulados, sin repeticiones.`);
await deleteApp(getApp());
process.exit(0);
