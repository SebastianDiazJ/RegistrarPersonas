import { appendFileSync } from 'node:fs';

// Punto de entrada: ejecuta src/principal.mjs y, si algo falla, deja una explicación corta
// en la página de la ejecución (el registro completo exige iniciar sesión en GitHub).
const limpiar = (texto) => String(texto ?? '')
  .replace(/-----BEGIN[\s\S]*?(-----END[^-]*-----|$)/g, '[clave oculta]')
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
  .replace(/\s+/g, ' ')
  .slice(0, 400);

try {
  await import('./principal.mjs');
} catch (error) {
  const detalle = `${error?.code ? `[${error.code}] ` : ''}${limpiar(error?.message)}`;
  console.error('Error:', detalle);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ❌ Falló el envío\n\n${detalle}\n`);
  }
  process.exit(1);
}
