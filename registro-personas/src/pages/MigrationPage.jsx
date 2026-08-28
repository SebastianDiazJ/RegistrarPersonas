import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  setupAuthUsers, initializeRedes, migrateXtremeData,
  checkMigrationNeeded
} from '../services/migrationService';

const REDES_SETUP = [
  { key: 'xtreme',  label: 'XTREME',  color: '#4338CA', email: 'xtreme@redes.iglesia' },
  { key: 'parejas', label: 'PAREJAS', color: '#BE185D', email: 'parejas@redes.iglesia' },
  { key: '360',     label: '360',     color: '#0369A1', email: '360@redes.iglesia' },
  { key: 'senior',  label: 'SENIOR',  color: '#B45309', email: 'senior@redes.iglesia' },
  { key: 'admin',   label: 'Admin Consolidación', color: '#1B2D45', email: 'admin@iglesia.com' },
  { key: 'pastor',  label: 'Pastor',  color: '#065F46', email: 'pastor@iglesia.com' },
];

const MigrationPage = () => {
  const navigate = useNavigate();
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);
  const [check, setCheck]     = useState(null);
  const [done, setDone]       = useState(false);

  // Auth setup state
  const [passwords, setPasswords] = useState({
    xtreme: '', parejas: '', '360': '', senior: '', admin: '', pastor: ''
  });
  const [showPasswords, setShowPasswords] = useState({});
  const [authResults, setAuthResults]     = useState(null);
  const [authLoading, setAuthLoading]     = useState(false);

  useEffect(() => {
    checkMigrationNeeded().then(setCheck);
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setStatus('Inicializando redes en Firestore...');
    const r1 = await initializeRedes();
    if (!r1.success) { setStatus('Error: ' + r1.error); setLoading(false); return; }

    setStatus('Migrando datos de XTREME...');
    const r2 = await migrateXtremeData();
    if (!r2.success) { setStatus('Error al migrar: ' + r2.error); setLoading(false); return; }

    setStatus(`Listo. ${r2.count} personas migradas a XTREME.`);
    setDone(true);
    setLoading(false);
  };

  const handleSoloRedes = async () => {
    setLoading(true);
    setStatus('Inicializando redes...');
    const r1 = await initializeRedes();
    setStatus(r1.success ? 'Redes inicializadas.' : 'Error: ' + r1.error);
    setDone(r1.success);
    setLoading(false);
  };

  const handleSetupAuth = async () => {
    const filled = Object.values(passwords).filter(Boolean);
    if (filled.length === 0) {
      setAuthResults({ _error: 'Ingresa al menos una contraseña.' });
      return;
    }
    setAuthLoading(true);
    setAuthResults(null);
    const results = await setupAuthUsers(passwords);
    setAuthResults(results);
    setAuthLoading(false);
  };

  const toggleShow = (key) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="migration-page">
      <div className="migration-card" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Configuración inicial
        </h1>
        <p className="migration-desc">
          Usa este panel solo la primera vez para configurar cuentas y datos.
        </p>

        {/* ── Sección 1: Firebase Authentication ── */}
        <div className="setup-section">
          <h2 className="setup-section-title" style={{ color: '#1B2D45' }}>
            1. Crear cuentas de acceso
          </h2>
          <p className="migration-desc" style={{ marginTop: 0 }}>
            Define las contraseñas de cada red y haz clic en <strong>Crear cuentas</strong>.
            Si la cuenta ya existe no se sobreescribe.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
            {REDES_SETUP.map(({ key, label, color, email }) => (
              <div key={key} className="auth-setup-row">
                <div className="auth-setup-label">
                  <span className="auth-setup-dot" style={{ background: color }} />
                  <div>
                    <span className="auth-setup-name">{label}</span>
                    <span className="auth-setup-email">{email}</span>
                  </div>
                </div>
                <div className="auth-setup-input-wrap">
                  <input
                    type={showPasswords[key] ? 'text' : 'password'}
                    className="auth-setup-input"
                    placeholder="Contraseña"
                    value={passwords[key]}
                    onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-show-btn"
                    onClick={() => toggleShow(key)}
                  >
                    {showPasswords[key] ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                {authResults && authResults[key] && (
                  <span className={`auth-result-badge ${authResults[key].success ? 'auth-ok' : authResults[key].skipped ? 'auth-skip' : 'auth-err'}`}>
                    {authResults[key].existing ? 'Ya existía' : authResults[key].success ? 'Creada' : authResults[key].skipped ? 'Sin contraseña' : 'Error: ' + authResults[key].error}
                  </span>
                )}
              </div>
            ))}
          </div>

          {authResults?._error && (
            <div className="login-error" style={{ marginTop: '0.75rem' }}>{authResults._error}</div>
          )}

          <button
            className="btn-migrate"
            style={{ marginTop: '1rem', background: '#1B2D45' }}
            onClick={handleSetupAuth}
            disabled={authLoading}
          >
            {authLoading ? 'Creando cuentas...' : 'Crear cuentas de acceso'}
          </button>
        </div>

        <div className="setup-divider" />

        {/* ── Sección 2: Firestore Rules ── */}
        <div className="setup-section">
          <h2 className="setup-section-title" style={{ color: '#1B2D45' }}>
            2. Reglas de seguridad Firestore
          </h2>
          <p className="migration-desc" style={{ marginTop: 0 }}>
            Copia estas reglas y pégalas en{' '}
            <strong>Firebase Console → Firestore → Rules</strong>.
            Bloquean el acceso sin autenticación.
          </p>
          <pre className="rules-code">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Bloquear acceso a documentos de credenciales
    match /redes/{redId} {
      allow read, write: if false;
    }

    // Personas: solo usuarios autenticados
    match /redes/{redId}/personas/{personId} {
      allow read, write: if request.auth != null;
    }

    // Config admin/pastor: bloqueado desde el cliente
    match /config/{doc} {
      allow read, write: if false;
    }
  }
}`}</pre>
        </div>

        <div className="setup-divider" />

        {/* ── Sección 3: Datos ── */}
        <div className="setup-section">
          <h2 className="setup-section-title" style={{ color: '#1B2D45' }}>
            3. Inicializar datos en Firestore
          </h2>

          {check && (
            <div className="migration-info">
              <p>Personas en colección antigua: <strong>{check.oldCount}</strong></p>
              <p>Personas en XTREME nueva: <strong>{check.newCount}</strong></p>
              {check.needed
                ? <p className="info-warning">Se detectaron datos para migrar.</p>
                : <p className="info-ok">No se necesita migración de datos.</p>
              }
            </div>
          )}

          {status && <div className="migration-status">{status}</div>}

          {!done && (
            <div className="migration-actions">
              {check?.needed ? (
                <button className="btn-migrate" onClick={handleSetup} disabled={loading}>
                  {loading ? 'Procesando...' : 'Inicializar redes + Migrar datos XTREME'}
                </button>
              ) : (
                <button className="btn-migrate" onClick={handleSoloRedes} disabled={loading}>
                  {loading ? 'Procesando...' : 'Inicializar redes (sin migración)'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="setup-divider" />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button className="btn-go-lobby" onClick={() => navigate('/')}>
            Ir al Lobby
          </button>
          <button className="btn-back-lobby" onClick={() => navigate('/')}>
            Volver sin cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;
