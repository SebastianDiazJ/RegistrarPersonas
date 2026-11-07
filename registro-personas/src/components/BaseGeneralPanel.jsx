import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { REDES } from '../config/redes';
import { getPersonasGenerales, contarBase, vaciarBase } from '../services/baseGeneralService';
import { logCambio } from '../services/historialService';
import { exportarPersonasExcel } from '../utils/excel';
import PersonasGeneralTable from './PersonasGeneralTable';

const PALABRA = 'VACIAR';

// Base general de personas (la que llena el Ingreso masivo) + botón para vaciar
// toda la base de personas. Solo admin/pastor; las reglas de Firestore lo exigen también.
const BaseGeneralPanel = () => {
  const { isAdminLoggedIn, isPastorLoggedIn } = useAuth();
  const permitido = isAdminLoggedIn() || isPastorLoggedIn();

  const [personas, setPersonas]   = useState([]);
  const [truncado, setTruncado]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [peligro, setPeligro]     = useState(false);
  const [conteos, setConteos]     = useState(null);
  const [palabra, setPalabra]     = useState('');
  const [entiendo, setEntiendo]   = useState(false);
  const [borrando, setBorrando]   = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const res = await getPersonasGenerales();
    if (res.success) { setPersonas(res.data); setTruncado(res.truncado); setError(''); }
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => { if (permitido) cargar(); }, [permitido]);

  if (!permitido) return null;

  const abrirPeligro = async () => {
    setPeligro(true);
    setResultado(null);
    setPalabra('');
    setEntiendo(false);
    const res = await contarBase();
    setConteos(res.success ? res.conteos : null);
  };

  const exportarAntes = async () => {
    await exportarPersonasExcel(personas, 'respaldo-base-general');
    await logCambio({
      accion: 'exportar_excel', entidad: 'persona_general', entidadId: 'respaldo',
      resumen: `Exportó respaldo a Excel (${personas.length} personas)`, cantidad: personas.length
    });
  };

  const handleVaciar = async () => {
    setBorrando(true);
    setResultado(null);
    const res = await vaciarBase();
    setResultado(res.success
      ? { ok: true, msg: `Base vaciada: ${res.total} documentos eliminados. Quedó registrado en el historial.` }
      : { ok: false, msg: res.error });
    setBorrando(false);
    if (res.success) { setPeligro(false); cargar(); }
  };

  const puedeBorrar = palabra === PALABRA && entiendo && !borrando;

  return (
    <div className="consol-consulta-card">
      {loading ? (
        <div className="loading">Cargando base general...</div>
      ) : error ? (
        <div className="login-error">{error}</div>
      ) : (
        <>
          {truncado && <div className="login-error">Se muestran solo las primeras 5000 personas.</div>}
          <PersonasGeneralTable
            personas={personas}
            nombreArchivo="base-general"
            onExport={(n) => logCambio({
              accion: 'exportar_excel', entidad: 'persona_general', entidadId: 'filtro',
              resumen: `Exportó ${n} personas a Excel`, cantidad: n
            })}
          />
        </>
      )}

      {resultado && <div className={resultado.ok ? 'consol-feedback-ok' : 'login-error'}>{resultado.msg}</div>}

      <div className="pg-danger">
        <h3>Zona de peligro</h3>
        <p>Elimina <strong>todas</strong> las personas: la base general y las personas de cada red. El historial de cambios se conserva.</p>
        {!peligro ? (
          <button type="button" className="pg-btn-danger" onClick={abrirPeligro}>Vaciar base de personas...</button>
        ) : (
          <div className="pg-danger-box">
            {conteos && (
              <p>
                Se eliminarán: <strong>{conteos.general}</strong> en la base general
                {REDES.map(r => `, ${conteos[r.id]} en ${r.nombre}`)}.
              </p>
            )}
            <p>Recomendado: descarga un respaldo antes de continuar.</p>
            <button type="button" className="pg-btn-excel" onClick={exportarAntes} disabled={personas.length === 0}>
              Exportar respaldo a Excel
            </button>
            <div className="form-group">
              <label>Para confirmar, escribe <strong>{PALABRA}</strong></label>
              <input value={palabra} onChange={e => setPalabra(e.target.value)} autoComplete="off" placeholder={PALABRA} />
            </div>
            <label className="masivo-check">
              <input type="checkbox" checked={entiendo} onChange={e => setEntiendo(e.target.checked)} />
              <span>Entiendo que esta acción no se puede deshacer.</span>
            </label>
            <div className="pg-danger-actions">
              <button type="button" className="pg-btn-danger" disabled={!puedeBorrar} onClick={handleVaciar}>
                {borrando ? 'Borrando...' : 'Borrar todas las personas'}
              </button>
              <button type="button" className="btn-clear-filtros" disabled={borrando} onClick={() => setPeligro(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseGeneralPanel;
