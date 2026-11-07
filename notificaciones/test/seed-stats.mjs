// Siembra personas de ejemplo en el EMULADOR para revisar los paneles de estadísticas.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
initializeApp({ projectId: 'demo-registro' });
const db = getFirestore();
const dia = (n) => new Date(Date.now() - n * 864e5);
const iso = (d) => d.toISOString().slice(0, 10);
const redes = { xtreme: 33, parejas: 12, '360': 34, senior: 39 };
const lideres = ['Luis Gomez', 'Marta Ruiz', 'Pedro Diaz', ''];
let n = 0;
for (const [red, cant] of Object.entries(redes)) {
  await db.collection('redes').doc(red).set({ liderNombre: `Líder ${red}`, nombre: red.toUpperCase() });
  for (let i = 0; i < cant; i++, n++) {
    const ing = dia(Math.floor(Math.random() * 170));
    const r = Math.random();
    const llamadas = r < 0.6 ? [] : [{ ts: dia(r < 0.8 ? 0.3 : Math.floor(r * 10)).toISOString(), resultado: ['contesto', 'no_contesto', 'desinteres'][i % 3], fecha: iso(ing), observacion: '' }];
    const asistencias = Math.random() < 0.4 ? [0, 7, 14, 21].filter(() => Math.random() < 0.6).map(d => ({ id: n * 10 + d, fecha: iso(dia(d + 1)), servicio: 'domingo', asistio: Math.random() < 0.8 })) : [];
    await db.collection('redes').doc(red).collection('personas').add({
      nombre: `Persona${n}`, apellido: `Apellido${i}`, telefono: `300${String(1000000 + n)}`, email: '',
      aCargoDe: lideres[i % 4], fechaIngreso: iso(ing), createdAt: ing.toISOString(), ausencias: i % 11 === 0 ? 3 : 0,
      llamadas, lastCallDate: llamadas[0]?.ts || null, lastCallResult: llamadas[0]?.resultado || null, asistencias
    });
  }
}
console.log('sembradas', n);
process.exit(0);
