# Seguridad de la app — La Vid

Qué está protegido, qué se hace en cada capa y qué pasos manuales quedan.

## Cómo está protegida

| Amenaza | Medida |
|---|---|
| **Inyección SQL / NoSQL** | No hay SQL: los datos viven en Firestore y se leen con consultas tipadas (nunca se arma texto de consulta con lo que escribe el usuario). Las reglas validan campos, tipos y longitudes en el servidor. |
| **XSS** | React escapa todo lo que pinta; no se usa `innerHTML`. Las entradas se sanean (`sanitizeText/Name/Email`) y las reglas rechazan `<` y `>`. Los correos escapan el HTML de nombres y anuncios. |
| **Secuestro de la página** | Cabeceras en `vercel.json`: CSP estricta (solo scripts propios), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS y COOP. Verificado: un script inyectado y una petición a un dominio ajeno quedan bloqueados. |
| **Fuga de secretos / `.env`** | `.gitignore` bloquea `.env*`, claves `.json` y `.pem`. Se revisó el historial de git: no hay claves privadas ni `.env`. Los secretos del envío de correos viven solo en *GitHub Secrets*. La `apiKey` de Firebase en el código es pública por diseño (ver abajo). |
| **Escaneo / extracción de datos** | Reglas por rol: el Ingreso masivo (sin contraseña) no puede listar ni leer la base; solo busca una cédula exacta. Cuota de 300 altas por sesión. |
| **Denegación de servicio / abuso** | Tope de campos por ficha, cuota de altas, límites de longitud, bajas solo-creación, límites de ritmo en el cliente, límite de intentos de login de Firebase Auth con mensaje claro. **App Check** (ver abajo) cierra el resto. |
| **Dependencias** | `npm audit` en la app: 0 vulnerabilidades (se actualizó `react-router-dom`). Dependabot avisa semanalmente. |
| **Trazabilidad** | Historial de cambios solo-append (nadie puede editarlo ni borrarlo). |

## Pasos manuales (los hace usted, una sola vez)

### 1. Restringir la clave de Firebase (5 min)
La `apiKey` identifica el proyecto; no es un secreto, pero conviene que solo funcione desde su sitio.
1. <https://console.cloud.google.com/apis/credentials> → proyecto `registrarpersonas-6d547` → la *Browser key*.
2. **Application restrictions → Websites** y agregue:
   `https://registrar-personas.vercel.app/*`, `https://registrarpersonas-6d547.firebaseapp.com/*`
   (y `http://localhost:5173/*` si desarrolla en su computador).
3. **API restrictions → Restrict key** y deje: Identity Toolkit API, Token Service API, Cloud Firestore API, Firebase App Check API.

### 2. Activar App Check (el más importante contra abuso) (10 min)
Hace que Firestore y Auth solo respondan a su app, no a scripts de terceros.
1. Firebase Console → **App Check** → su app web → **reCAPTCHA v3** → registre el sitio y copie la **clave del sitio** (pública).
2. En **Vercel** → proyecto → Settings → Environment Variables: `VITE_APPCHECK_SITE_KEY` = esa clave. Haga un nuevo despliegue.
3. Espere unas horas, revise en App Check → Métricas que las solicitudes salen como "verificadas" y entonces pulse **Enforce** en *Cloud Firestore* y en *Authentication*.

### 3. Ajustes de Authentication
- **Settings → User actions:** active *Email enumeration protection*.
- **Settings → Password policy:** exija 10+ caracteres con mayúsculas y números; cambie las contraseñas de las redes, admin y pastor si son sencillas o compartidas por chat.
- **Settings → Authorized domains:** deje solo `registrar-personas.vercel.app` y el dominio de Firebase; borre `localhost` si no lo usa.
- **Sign-in method:** deje activos solo *Email/Password* y *Anonymous*.

### 4. GitHub
- Settings → Code security: active **Secret scanning**, **Push protection** y **Dependabot alerts**.
- Active la verificación en dos pasos en su cuenta de GitHub, Google y Vercel.
- Settings → Branches: proteja `main` (obligar PR es opcional; al menos bloquee el *force push*).
- Borre del computador el `.json` de la cuenta de servicio y, cada 6–12 meses, genere una clave nueva y actualice el secreto.

### 5. Vercel
- Settings → Security: active **Attack Challenge Mode** si hay ataques; en planes de pago, *Firewall* con límite de peticiones.

## Riesgos que quedan (honestos)
- **Cuenta comprometida:** quien consiga la contraseña de admin/pastor lo ve todo. Use contraseñas largas y únicas.
- **Ingreso masivo sin contraseña** es abierto por diseño. Con App Check enforzado se reduce a "solo desde su app", pero cualquiera con el enlace puede registrar datos falsos; queda registrado con el nombre escrito.
- **Cuotas de Firebase (plan gratis):** un ataque masivo podría agotar las lecturas/escrituras diarias y dejar la app sin servicio hasta el día siguiente. App Check y las reglas lo dificultan, no lo eliminan; si pasa, la app se recupera sola.
- **Dependencias de desarrollo** (Vite, ESLint) tienen avisos moderados que solo afectan a su computador, no al sitio publicado. `notificaciones/` tiene avisos moderados en librerías de Google (`glob`/`minimatch`) que solo se ejecutan en GitHub con entradas de confianza.
