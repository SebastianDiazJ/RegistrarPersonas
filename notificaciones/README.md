# Notificaciones por correo (gratis) — Iglesia La Vid

Un workflow de GitHub Actions (`.github/workflows/notificaciones.yml`) lee Firestore con una
cuenta de servicio y envía correos por Gmail:

| Qué | Cuándo |
|---|---|
| Bienvenida a la persona nueva (si dejó correo) | cada ~10 min (personas de los últimos 3 días) |
| Aviso al líder de la red cuando llega alguien nuevo | cada ~10 min |
| Felicitación de cumpleaños | todos los días 7:00 a. m. (hora de Colombia) |
| Anuncios creados en la pestaña **Anuncios** | cada ~10 min |

Cada correo se registra en la colección `envios` (no se repite nunca) y se ve en la pestaña
**Anuncios → Últimos correos automáticos**. Quien hace clic en «cancelar suscripción» queda en `bajas`
y no vuelve a recibir mensajes de la iglesia.

## Puesta en marcha (una sola vez)

### 1. Contraseña de aplicación de Gmail
1. Usa (o crea) un Gmail para la iglesia, p. ej. `lavid.iglesia@gmail.com`.
2. Activa la **verificación en dos pasos** en esa cuenta.
3. Entra a <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación
   (nombre: «Notificaciones») y copia las 16 letras.

### 2. Cuenta de servicio de Firebase
1. Firebase Console → ⚙ Configuración del proyecto → **Cuentas de servicio** →
   **Generar nueva clave privada**. Se descarga un archivo `.json`.
2. **No lo subas al repositorio** (este repo es público). Se pega entero como secreto en el paso 3.

### 3. Secretos en GitHub
Repositorio → Settings → Secrets and variables → Actions → **New repository secret**:

| Nombre | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | el contenido completo del `.json` del paso 2 |
| `GMAIL_USER` | el Gmail del paso 1 |
| `GMAIL_APP_PASSWORD` | las 16 letras del paso 1 (sin espacios) |
| `APP_URL` | la dirección pública de la app, p. ej. `https://tu-app.netlify.app` (sin `/` final) |

### 4. Reglas de Firestore
Publica de nuevo `registro-personas/firestore.rules` (agrega `anuncios`, `envios` y `bajas`).

### 5. Probar
Actions → **Notificaciones** → *Run workflow* con `simulacion = true` (no envía nada) y revisa el
resumen del log. Luego una vez con `simulacion = false`.

## Envío inmediato al registrar (función de Vercel)

Al guardar una persona en una red o en Consolidación, la app llama a `registro-personas/api/avisar.js`
(función de Vercel) que **al instante** envía el aviso al líder de la red y la bienvenida a la persona.
El workflow de GitHub queda como respaldo (lo que la función no alcance a enviar, lo manda después, sin duplicar:
las dos vías comparten las marcas de `envios`). **Ingreso masivo** sigue usando solo el envío programado.

Configuración (una sola vez):
1. Vercel → proyecto → Settings → Environment Variables (Production), crear:
   - `GMAIL_USER` y `GMAIL_APP_PASSWORD`: los mismos valores de los secretos de GitHub.
   - `APP_URL` (opcional): `https://registrar-personas.vercel.app` (si no se pone, se toma del dominio de la petición).
2. Volver a desplegar (Deployments → Redeploy) para que la función lea las variables.
3. Publicar de nuevo `registro-personas/firestore.rules` (permite a la red crear/cerrar la marca del envío y consultar bajas por hash).

La función no usa claves de Firebase: lee con el token de quien registra, así que las reglas deciden quién puede disparar
qué. Sin sesión, con sesión anónima o desde otra red responde 403. Prueba automática (con emuladores):
`node test/avisar.e2e.mjs` (20 casos).

## Notas importantes
- **Privacidad:** el repositorio es público, así que los logs de Actions solo muestran conteos;
  nunca nombres ni correos.
- **Límites:** Gmail gratis permite ~500 correos al día. El script se detiene en 450/día y 100 por
  ejecución; un anuncio grande continúa solo en las siguientes ejecuciones.
- **GitHub pausa los workflows programados** si el repositorio pasa 60 días sin actividad
  (un commit o ejecutar el workflow a mano lo reactiva).
- Los horarios de GitHub son «aproximados»: puede haber retrasos de varios minutos.
- Para cambiar los textos de los correos edita `src/plantillas.mjs`.

## Pruebas locales (sin enviar nada ni tocar datos reales)
```bash
# terminal 1 (en registro-personas/): emulador de Firestore
firebase emulators:start --only firestore --project demo-registro
# terminal 2 (en notificaciones/):
npm ci
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node test/e2e.mjs
```
