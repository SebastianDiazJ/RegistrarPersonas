// Pantalla de carga inicial. El mismo marcado y los mismos estilos viven en
// index.html (se ve antes de que cargue el JavaScript), así no hay salto al arrancar React.
const SplashScreen = ({ hiding }) => (
  <div className={`splash${hiding ? ' splash-hide' : ''}`} role="status" aria-live="polite">
    <div className="splash-inner">
      <img className="splash-logo" src="/logo-lavid.webp" alt="Iglesia La Vid" width="340" height="340" />
      <p className="splash-text">Aplicación de registro y manejo de datos para la iglesia La Vid</p>
      <div className="splash-bar" aria-hidden="true"><span /></div>
    </div>
  </div>
);

export default SplashScreen;
