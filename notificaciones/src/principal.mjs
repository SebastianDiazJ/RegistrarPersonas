import {
  REDES, LIMITE_DIARIO, LIMITE_POR_EJECUCION,
  normalizarEmail, esEmailValido, hashEmail, hoyBogota,
  iniciarFirestore, crearCorreo, cargarBajas, enviarUnico, contarEnviadosHoy,
  FieldValue, Timestamp
} from './lib.mjs';
import * as plantillas from './plantillas.mjs';

// Uso: node src/index.mjs --modo=nuevos|cumples|todo
//  - nuevos : bienvenida a personas nuevas, aviso a líderes y anuncios pendientes
//  - cumples: felicitación de cumpleaños del día (hora de Colombia)
// Los logs solo llevan conteos: el repositorio es público y no deben aparecer datos de personas.

const modo = (process.argv.find((a) => a.startsWith('--modo=')) || '--modo=todo').split('=')[1];
const DIAS_VENTANA_NUEVOS = 3;

const db = iniciarFirestore();
const correo = crearCorreo();
const bajas = await cargarBajas(db);

const estado = { presupuesto: 0, resumen: {} };
const contar = (tipo, resultado) => {
  estado.resumen[tipo] ??= { enviado: 0, omitido: 0, error: 0 };
  estado.resumen[tipo][resultado === 'simulado' ? 'enviado' : resultado] += 1;
};

const hayPresupuesto = () => estado.presupuesto > 0;
const gastar = (resultado) => { if (resultado === 'enviado') estado.presupuesto -= 1; };

// Personas con correo válido, que no pidieron baja. Deduplica por correo.
const personaConCorreo = (p) => {
  const email = normalizarEmail(p.email);
  if (!esEmailValido(email) || bajas.has(hashEmail(email))) return null;
  return email;
};

// ── Bienvenida + aviso al líder ─────────────────────────────────────────────
const procesarNuevos = async () => {
  const desde = new Date(Date.now() - DIAS_VENTANA_NUEVOS * 24 * 60 * 60 * 1000);
  const vistos = new Set();

  const bienvenidaA = async (p) => {
    const email = personaConCorreo(p);
    if (!email || vistos.has(email) || !hayPresupuesto()) return;
    vistos.add(email);
    const msg = plantillas.bienvenida({ nombre: p.nombre, email });
    const r = await enviarUnico({ db, correo, clave: `bienvenida_${hashEmail(email)}`, tipo: 'bienvenida', para: email, nombre: p.nombre, ...msg });
    contar('bienvenida', r); gastar(r);
  };

  for (const red of REDES) {
    const info = (await db.collection('redes').doc(red.id).get()).data() || {};
    const liderEmail = normalizarEmail(info.liderEmail);
    const snap = await db.collection('redes').doc(red.id).collection('personas')
      .where('createdAt', '>=', desde.toISOString()).get();

    for (const d of snap.docs) {
      const p = d.data();
      await bienvenidaA(p);
      // Diagnóstico visible en el resumen: hubo una persona nueva pero la red no tiene correo de líder.
      if (!esEmailValido(liderEmail)) contar('aviso_lider_sin_correo', 'omitido');
      if (esEmailValido(liderEmail) && hayPresupuesto()) {
        const msg = plantillas.avisoLider({ redNombre: red.nombre, ...p });
        const r = await enviarUnico({
          db, correo, clave: `lider_${red.id}_${d.id}`, tipo: 'aviso_lider', para: liderEmail,
          nombre: `${p.nombre || ''} ${p.apellido || ''}`, extra: { red: red.id }, ...msg
        });
        contar('aviso_lider', r); gastar(r);
      }
    }
  }

  // Personas de la base general que no asisten (sin red): también reciben bienvenida.
  const generales = await db.collection('personas').where('creadoEn', '>=', Timestamp.fromDate(desde)).get();
  for (const d of generales.docs) await bienvenidaA(d.data());
};

// ── Cumpleaños ──────────────────────────────────────────────────────────────
const procesarCumples = async () => {
  const { anio, mes, dia } = hoyBogota();
  const vistos = new Set();
  const colecciones = [
    ...REDES.map((r) => db.collection('redes').doc(r.id).collection('personas')),
    db.collection('personas')
  ];

  for (const col of colecciones) {
    // Dos filtros de igualdad: no necesitan índice compuesto.
    const snap = await col.where('mesCumple', '==', String(mes)).where('diaCumple', '==', String(dia)).get();
    for (const d of snap.docs) {
      const p = d.data();
      const email = personaConCorreo(p);
      if (!email || vistos.has(email) || !hayPresupuesto()) continue;
      vistos.add(email);
      const msg = plantillas.cumpleanos({ nombre: p.nombre, email });
      const r = await enviarUnico({ db, correo, clave: `cumple_${hashEmail(email)}_${anio}`, tipo: 'cumpleanos', para: email, nombre: p.nombre, ...msg });
      contar('cumpleanos', r); gastar(r);
    }
  }
};

// ── Anuncios ────────────────────────────────────────────────────────────────
const destinatariosDe = async (destino) => {
  const mapa = new Map();
  const agregar = (p) => {
    const email = personaConCorreo(p);
    if (email && !mapa.has(email)) mapa.set(email, p.nombre || '');
  };
  const redes = destino === 'todos' ? REDES : REDES.filter((r) => r.id === destino);
  for (const r of redes) {
    const snap = await db.collection('redes').doc(r.id).collection('personas').select('nombre', 'email').get();
    snap.docs.forEach((d) => agregar(d.data()));
  }
  if (destino === 'todos') {
    const snap = await db.collection('personas').select('nombre', 'email').get();
    snap.docs.forEach((d) => agregar(d.data()));
  }
  return [...mapa.entries()].map(([email, nombre]) => ({ email, nombre }));
};

const procesarAnuncios = async () => {
  const snap = await db.collection('anuncios').where('estado', 'in', ['pendiente', 'enviando']).get();
  for (const doc of snap.docs) {
    const a = doc.data();
    const lista = await destinatariosDe(a.destino);
    await doc.ref.set({ estado: 'enviando', total: lista.length }, { merge: true });

    let enviados = 0, errores = 0, pendientes = 0;
    for (const dest of lista) {
      if (!hayPresupuesto()) { pendientes += 1; continue; }
      const msg = plantillas.anuncio({ titulo: a.titulo, mensaje: a.mensaje, email: dest.email });
      const r = await enviarUnico({
        db, correo, clave: `anuncio_${doc.id}_${hashEmail(dest.email)}`, tipo: 'anuncio', para: dest.email,
        nombre: dest.nombre, extra: { anuncio: doc.id }, ...msg
      });
      contar('anuncio', r); gastar(r);
      if (r === 'enviado') enviados += 1;
      if (r === 'error') errores += 1;
    }
    const final = pendientes === 0;
    await doc.ref.set({
      enviados: FieldValue.increment(enviados),
      errores: FieldValue.increment(errores),
      estado: final ? 'enviado' : 'enviando',
      ...(final ? { finalizadoEn: FieldValue.serverTimestamp() } : {})
    }, { merge: true });
  }
};

// ── Principal ───────────────────────────────────────────────────────────────
const hoy = await contarEnviadosHoy(db);
estado.presupuesto = Math.max(0, Math.min(LIMITE_POR_EJECUCION, LIMITE_DIARIO - hoy));
console.log(`Modo: ${modo}${correo.seco ? ' (simulación, no se envía nada)' : ''}. Enviados hoy: ${hoy}. Presupuesto de esta ejecución: ${estado.presupuesto}.`);

if (modo === 'nuevos' || modo === 'todo') {
  await procesarNuevos();
  await procesarAnuncios();
}
if (modo === 'cumples' || modo === 'todo') {
  await procesarCumples();
}

console.log('Resumen:', JSON.stringify(estado.resumen));
// Resumen visible en la página de la ejecución (solo conteos, sin datos de personas).
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import('node:fs');
  const filas = Object.entries(estado.resumen).map(([tipo, c]) => `| ${tipo} | ${c.enviado} | ${c.omitido} | ${c.error} |`);
  const tabla = filas.length ? filas.join('\n') : '| (nada que enviar) | 0 | 0 | 0 |';
  const titulo = `### Notificaciones (${modo}${correo.seco ? ', simulación' : ''})`;
  const cabecera = '| Tipo | Enviados | Omitidos | Con error |\n|---|---|---|---|';
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${titulo}\n\n${cabecera}\n${tabla}\n`);
}

process.exit(0);
