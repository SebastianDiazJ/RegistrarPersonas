import crypto from 'node:crypto';

// Código compartido por la función de Vercel (api/avisar.js, envío inmediato al registrar) y por
// el workflow de GitHub (notificaciones/, envío programado). Un solo lugar para las plantillas,
// la validación de correos y la clave de "ya enviado", así ambos caminos nunca duplican un correo.
// Sin dependencias externas. El archivo empieza con "_" para que Vercel no lo exponga como ruta.

export const REDES = [
  { id: 'xtreme',  nombre: 'XTREME' },
  { id: 'parejas', nombre: 'PAREJAS' },
  { id: '360',     nombre: '360' },
  { id: 'senior',  nombre: 'SENIOR' }
];

export const normalizarEmail = (e) => String(e ?? '').trim().toLowerCase();
export const esEmailValido = (e) => e.length <= 100 && /^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']{2,}$/.test(e);
// Mismo hash que calcula el navegador en /baja (SHA-256 del correo normalizado).
export const hashEmail = (e) => crypto.createHash('sha256').update(normalizarEmail(e), 'utf8').digest('hex');

export const escaparHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Evita inyección de cabeceras de correo (saltos de línea) en asuntos.
export const limpiarLinea = (v, max = 150) => String(v ?? '').replace(/[\r\n\u0000-\u001F]+/g, ' ').trim().slice(0, max);

export const primerNombre = (nombre) => limpiarLinea(String(nombre ?? '').trim().split(/\s+/)[0] || '', 40);

// Claves de "ya enviado" (documento envios/{clave}). Deben ser idénticas en los dos caminos.
export const claveBienvenida = (email) => `bienvenida_${hashEmail(email)}`;
export const claveAvisoLider = (redId, personaId) => `lider_${redId}_${personaId}`;

/* ── Plantillas ────────────────────────────────────────────────────────── */
// Todo dato que viene de la base se escapa antes de entrar al HTML.
// Para cambiar los textos basta con editar este archivo.

const base = () => (process.env.APP_URL || '').replace(/\/+$/, '');

const layout = ({ titulo, cuerpoHtml, urlBaja }) => `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#ECF0F5;font-family:Arial,Helvetica,sans-serif;color:#0D1B2A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECF0F5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background:#000000;padding:20px 12px;">
${base() ? `<img src="${escaparHtml(base())}/logo-lavid.webp" alt="Iglesia La Vid" width="160" style="display:block;border:0;max-width:160px;height:auto;">` : ''}
<div style="color:#ffffff;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:6px;">Iglesia La Vid</div>
</td></tr>
<tr><td style="padding:28px 24px 12px;">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;">${escaparHtml(titulo)}</h1>
${cuerpoHtml}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#526070;border-top:1px solid #D1DAE4;">
${urlBaja
    ? `Recibes este correo porque autorizaste el tratamiento de tus datos en la Iglesia La Vid. Si no quieres recibir más mensajes, <a href="${escaparHtml(urlBaja)}" style="color:#526070;">cancela tu suscripción aquí</a>.`
    : 'Mensaje interno de la app de registro de la Iglesia La Vid.'}
</td></tr>
</table></td></tr></table></body></html>`;

const parrafos = (texto) =>
  String(texto ?? '').split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${escaparHtml(p).replace(/\n/g, '<br>')}</p>`).join('');

export const urlBajaPara = (email) => (base() ? `${base()}/baja?e=${encodeURIComponent(email)}` : '');

const conBaja = (email) => {
  const url = urlBajaPara(email);
  return {
    url,
    // Cabecera estándar: los clientes de correo muestran "Cancelar suscripción".
    cabeceras: url ? { 'List-Unsubscribe': `<${url}>` } : undefined,
    pieTexto: url ? `\n\n—\nPara no recibir más mensajes: ${url}` : ''
  };
};

export const bienvenida = ({ nombre, email }) => {
  const n = primerNombre(nombre);
  const saludo = n ? `¡Bienvenido(a) a la Iglesia La Vid, ${n}!` : '¡Bienvenido(a) a la Iglesia La Vid!';
  const cuerpo = 'Nos alegra muchísimo que hoy seas parte de nuestra familia.\n\nPronto un líder de la iglesia se comunicará contigo para acompañarte. Mientras tanto, recuerda que esta es tu casa y que aquí siempre hay un lugar para ti.\n\nDios te bendiga.';
  const b = conBaja(email);
  return {
    asunto: saludo,
    html: layout({ titulo: saludo, cuerpoHtml: parrafos(cuerpo), urlBaja: b.url }),
    texto: `${saludo}\n\n${cuerpo}${b.pieTexto}`,
    cabeceras: b.cabeceras
  };
};

export const cumpleanos = ({ nombre, email }) => {
  const n = primerNombre(nombre);
  const titulo = n ? `¡Feliz cumpleaños, ${n}! 🎉` : '¡Feliz cumpleaños! 🎉';
  const cuerpo = 'Hoy celebramos tu vida y damos gracias a Dios por ti.\n\n«El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti y te conceda su gracia.» — Números 6:24-25\n\nQue este nuevo año esté lleno de su amor y de su favor. Con cariño, tu familia de la Iglesia La Vid.';
  const b = conBaja(email);
  return {
    asunto: titulo,
    html: layout({ titulo, cuerpoHtml: parrafos(cuerpo), urlBaja: b.url }),
    texto: `${titulo}\n\n${cuerpo}${b.pieTexto}`,
    cabeceras: b.cabeceras
  };
};

export const anuncio = ({ titulo, mensaje, email }) => {
  const b = conBaja(email);
  return {
    asunto: titulo,
    html: layout({ titulo, cuerpoHtml: parrafos(mensaje), urlBaja: b.url }),
    texto: `${titulo}\n\n${mensaje}${b.pieTexto}`,
    cabeceras: b.cabeceras
  };
};

// Aviso interno para el líder de la red (no lleva enlace de baja).
export const avisoLider = ({ redNombre, nombre, apellido, telefono, aCargoDe }) => {
  const titulo = `Nueva persona en la red ${redNombre}`;
  const lineas = [
    `Llegó una persona nueva a la red ${redNombre}:`,
    `Nombre: ${[nombre, apellido].filter(Boolean).join(' ') || '(sin nombre)'}`,
    telefono ? `Teléfono: ${telefono}` : 'Teléfono: (no registrado)',
    aCargoDe ? `A cargo de: ${aCargoDe}` : '',
    '',
    'Por favor contáctala pronto.'
  ].filter((l, i, arr) => l !== '' || arr[i - 1] !== '');
  const cuerpo = lineas.join('\n');
  return {
    asunto: titulo,
    html: layout({ titulo, cuerpoHtml: parrafos(cuerpo), urlBaja: '' }),
    texto: cuerpo
  };
};
