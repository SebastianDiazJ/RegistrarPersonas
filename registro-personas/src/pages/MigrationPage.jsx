import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeRedes, migrateXtremeData, checkMigrationNeeded } from '../services/migrationService';

const MigrationPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [check, setCheck] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runCheck = async () => {
      const result = await checkMigrationNeeded();
      setCheck(result);
    };
    runCheck();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setStatus('Inicializando redes en Firestore...');
    const r1 = await initializeRedes();
    if (!r1.success) {
      setStatus('Error al inicializar redes: ' + r1.error);
      setLoading(false);
      return;
    }

    setStatus('Migrando datos de XTREME...');
    const r2 = await migrateXtremeData();
    if (!r2.success) {
      setStatus('Error al migrar datos: ' + r2.error);
      setLoading(false);
      return;
    }

    setStatus(`✅ Listo. Redes inicializadas. ${r2.count} personas migradas a XTREME.`);
    setDone(true);
    setLoading(false);
  };

  const handleSoloRedes = async () => {
    setLoading(true);
    setStatus('Inicializando redes...');
    const r1 = await initializeRedes();
    setStatus(r1.success ? '✅ Redes inicializadas correctamente.' : 'Error: ' + r1.error);
    setDone(r1.success);
    setLoading(false);
  };

  return (
    <div className="migration-page">
      <div className="migration-card">
        <h1>⚙️ Configuración inicial</h1>
        <p className="migration-desc">
          Este panel inicializa las 3 redes en Firestore y migra los datos existentes.
          <strong> Úsalo solo una vez.</strong>
        </p>

        {check && (
          <div className="migration-info">
            <p>📦 Personas en colección antigua (<code>persons</code>): <strong>{check.oldCount}</strong></p>
            <p>📦 Personas ya en XTREME nueva: <strong>{check.newCount}</strong></p>
            {check.needed
              ? <p className="info-warning">⚠️ Se detectaron datos para migrar.</p>
              : <p className="info-ok">✅ No se necesita migración de datos.</p>
            }
          </div>
        )}

        {status && <div className="migration-status">{status}</div>}

        {!done && (
          <div className="migration-actions">
            {check?.needed ? (
              <button className="btn-migrate" onClick={handleSetup} disabled={loading}>
                {loading ? 'Procesando...' : '🚀 Inicializar redes + Migrar datos XTREME'}
              </button>
            ) : (
              <button className="btn-migrate" onClick={handleSoloRedes} disabled={loading}>
                {loading ? 'Procesando...' : '🚀 Inicializar redes (sin migración)'}
              </button>
            )}
          </div>
        )}

        {done && (
          <button className="btn-go-lobby" onClick={() => navigate('/')}>
            Ir al Lobby →
          </button>
        )}

        <button className="btn-back-lobby" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          ← Volver sin cambios
        </button>
      </div>
    </div>
  );
};

export default MigrationPage;
