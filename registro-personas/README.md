# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Reglas de Firestore y pruebas locales

- La fuente de las reglas es `firestore.rules` (también se muestra en `/setup`). Publicarlas:
  `firebase deploy --only firestore:rules` o pegarlas en Firebase Console → Firestore → Rules.
- **Ingreso masivo** (`/masivo`) usa sesiones anónimas: activa el proveedor **Anónimo** en
  Firebase Console → Authentication → Sign-in method.
- Probar sin tocar datos reales: levantar los emuladores (`firebase emulators:start --only auth,firestore`,
  requiere Java 21+ con firebase-tools 14+) y arrancar la app con `VITE_USE_EMULATOR=true npm run dev`
  (por ejemplo en `.env.development.local`, ignorado por git).
