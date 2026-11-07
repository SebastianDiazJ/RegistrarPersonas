// Pantalla de carga inicial. El mismo marcado y los mismos estilos viven en
// index.html (se ve antes de que cargue el JavaScript), así no hay salto al arrancar React.
const SplashScreen = ({ hiding }) => (
  <div className={`splash${hiding ? ' splash-hide' : ''}`} role="status" aria-live="polite">
    <div className="splash-inner">
      <svg className="splash-logo" viewBox="0 0 64 64" aria-hidden="true">
        <path className="splash-stem" d="M32 6c0 6-2 9-6 11" fill="none" strokeWidth="3" strokeLinecap="round" />
        <path className="splash-leaf" d="M32 9c5-6 14-6 19 0-5 6-14 6-19 0z" />
        <g className="splash-grapes">
          <circle cx="20" cy="28" r="7" /><circle cx="34" cy="28" r="7" /><circle cx="46" cy="28" r="7" />
          <circle cx="27" cy="40" r="7" /><circle cx="41" cy="40" r="7" />
          <circle cx="34" cy="52" r="7" />
        </g>
      </svg>
      <h1 className="splash-title">La Vid</h1>
      <p className="splash-text">Aplicación de registro y manejo de datos para la iglesia La Vid</p>
      <div className="splash-bar" aria-hidden="true"><span /></div>
    </div>
  </div>
);

export default SplashScreen;
