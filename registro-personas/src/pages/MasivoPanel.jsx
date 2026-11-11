import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { REDES } from '../config/redes';
import { METODOS_INVITACION, MESES, diasPorMes, ESTADOS_CIVILES, HABEAS_DATA_TEXTO } from '../config/opciones';
import { onlyLetters, onlyDigits } from '../utils/validacion';
import { buscarPorCedula, registrarPersona, unirParejas } from '../services/masivoService';
import PersonasGeneralTable from '../components/PersonasGeneralTable';

const todayISO = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = () => ({
  cedula: '', nombre: '', apellido: '', telefono: '', email: '',
  mesCumple: '', diaCumple: '', estadoCivil: '',
  tienePareja: 'no', parejaCedula: '',
  asiste: 'no', redAsignada: '', aCargoDe: '', metodoInvitacion: '',
  fechaIngreso: todayISO(),
  tienePeticion: 'no', prayerRequest: '',
  habeasData: false
});

const SiNo = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)}>
    <option value="no">No</option>
    <option value="si">Sí</option>
  </select>
);

const FieldError = ({ msg }) => (msg ? <span className="masivo-field-error">{msg}</span> : null);

const MasivoPanel = () => {
  const navigate = useNavigate();
  const { masivoNombre, logoutMasivo } = useAuth();

  const [tab, setTab]               = useState('registrar');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [feedback, setFeedback]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sesion, setSesion]         = useState([]);   // personas registradas en esta sesión

  // Consulta de cédulas (solo cédula exacta; nunca se listan personas)
  const [cedulaInfo, setCedulaInfo]   = useState(null);
  const [parejaInfo, setParejaInfo]   = useState(null);

  // Unir parejas
  const [uneA, setUneA] = useState('');
  const [uneB, setUneB] = useState('');
  const [uneMsg, setUneMsg] = useState(null);
  const [uniendo, setUniendo] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setVal = (field) => (v) => setForm(f => ({ ...f, [field]: v }));
  const setFiltered = (field, filter) => (e) => setForm(f => ({ ...f, [field]: filter(e.target.value) }));

  const verificarCedula = async () => {
    setCedulaInfo({ loading: true });
    setCedulaInfo(await buscarPorCedula(form.cedula));
  };

  const buscarPareja = async () => {
    setParejaInfo({ loading: true });
    setParejaInfo(await buscarPorCedula(form.parejaCedula));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setErrors({});
    const result = await registrarPersona(form, masivoNombre);
    if (result.success) {
      setSesion(s => [result.persona, ...s]);
      setFeedback({ type: 'success', msg: `${result.persona.nombre} ${result.persona.apellido} registrado/a${result.persona.asiste ? ` y asignado/a a ${REDES.find(r => r.id === result.persona.redAsignada)?.nombre}` : ' (no asiste: sin red asignada)'}.` });
      setForm(EMPTY_FORM());
      setCedulaInfo(null);
      setParejaInfo(null);
    } else {
      setErrors(result.errors || {});
      setFeedback({ type: 'error', msg: result.error || 'Revisa los campos marcados.' });
    }
    setSubmitting(false);
  };

  const handleUnir = async (e) => {
    e.preventDefault();
    setUniendo(true);
    setUneMsg(null);
    const result = await unirParejas(onlyDigits(uneA), onlyDigits(uneB), masivoNombre);
    if (result.success) {
      setUneMsg({ type: 'success', msg: `Pareja unida: ${result.a.nombreCorto} y ${result.b.nombreCorto}.` });
      setUneA(''); setUneB('');
    } else {
      setUneMsg({ type: 'error', msg: result.error });
    }
    setUniendo(false);
  };

  const handleSalir = async () => { await logoutMasivo(); navigate('/'); };

  const diasDisponibles = form.mesCumple ? diasPorMes(parseInt(form.mesCumple)) : 31;
  const estadoCedula = cedulaInfo && !cedulaInfo.loading
    ? (cedulaInfo.success
        ? (cedulaInfo.found ? { ok: false, msg: `Ya registrada (${cedulaInfo.nombreCorto})` } : { ok: true, msg: 'Cédula disponible' })
        : { ok: false, msg: cedulaInfo.error })
    : null;
  const estadoPareja = parejaInfo && !parejaInfo.loading
    ? (parejaInfo.success
        ? (!parejaInfo.found
            ? { ok: false, msg: 'Esa cédula no está registrada' }
            : parejaInfo.tienePareja
              ? { ok: false, msg: `${parejaInfo.nombreCorto} ya tiene pareja asignada` }
              : { ok: true, msg: `Se unirá con ${parejaInfo.nombreCorto}` })
        : { ok: false, msg: parejaInfo.error })
    : null;

  return (
    <div className="consol-panel">
      <div className="consol-header">
        <div className="consol-header-left">
          <h1 className="consol-title">Ingreso masivo</h1>
          <p className="consol-subtitle">Diligenciando: <strong>{masivoNombre}</strong></p>
        </div>
        <div className="consol-header-right">
          <button className="btn-lobby" onClick={() => navigate('/')}>Lobby</button>
          <button className="btn-cerrar-sesion" onClick={handleSalir}>Salir</button>
        </div>
      </div>

      <div className="consol-body">
        <div className="consol-main-tabs">
          {[
            { id: 'registrar', label: 'Registrar persona' },
            { id: 'parejas',   label: 'Unir con la pareja' },
            { id: 'sesion',    label: `Registrados en esta sesión (${sesion.length})` }
          ].map(t => (
            <button key={t.id} className={`consol-main-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Registrar ── */}
        {tab === 'registrar' && (
          <div className="consol-register-card">
            <h2 className="consol-card-title">Registrar por cédula</h2>
            <form onSubmit={handleSubmit} noValidate className="consol-form" style={{ '--c1': '#1B2D45' }}>
              <div className="consol-fields-grid">
                <div className="form-group">
                  <label>Cédula <span className="req">*</span></label>
                  <div className="masivo-inline">
                    <input value={form.cedula} onChange={e => { setForm(f => ({ ...f, cedula: onlyDigits(e.target.value).slice(0, 12) })); setCedulaInfo(null); }} placeholder="Número de cédula" inputMode="numeric" autoComplete="off" />
                    <button type="button" className="btn-clear-filtros" onClick={verificarCedula} disabled={cedulaInfo?.loading}>Verificar</button>
                  </div>
                  {estadoCedula && <span className={estadoCedula.ok ? 'masivo-field-ok' : 'masivo-field-error'}>{estadoCedula.msg}</span>}
                  <FieldError msg={errors.cedula} />
                </div>
                <div className="form-group">
                  <label>Fecha de ingreso <span className="req">*</span></label>
                  <input type="date" value={form.fechaIngreso} onChange={set('fechaIngreso')} />
                  <FieldError msg={errors.fechaIngreso} />
                </div>
                <div className="form-group">
                  <label>Nombre <span className="req">*</span></label>
                  <input value={form.nombre} onChange={setFiltered('nombre', v => onlyLetters(v).slice(0, 60))} placeholder="Nombre" autoComplete="off" />
                  <FieldError msg={errors.nombre} />
                </div>
                <div className="form-group">
                  <label>Apellido <span className="req">*</span></label>
                  <input value={form.apellido} onChange={setFiltered('apellido', v => onlyLetters(v).slice(0, 60))} placeholder="Apellido" autoComplete="off" />
                  <FieldError msg={errors.apellido} />
                </div>
                <div className="form-group">
                  <label>Teléfono <span className="req">*</span></label>
                  <input value={form.telefono} onChange={setFiltered('telefono', v => onlyDigits(v).slice(0, 15))} placeholder="3001234567" type="tel" inputMode="numeric" autoComplete="off" />
                  <FieldError msg={errors.telefono} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={form.email} onChange={setFiltered('email', v => v.slice(0, 100))} placeholder="correo@ejemplo.com" type="email" autoComplete="off" />
                  <span className="masivo-aviso" style={{ margin: 0 }}>Con correo, la persona recibe una bienvenida y una felicitación de cumpleaños.</span>
                  <FieldError msg={errors.email} />
                </div>
                <div className="form-group">
                  <label>Cumpleaños</label>
                  <div className="cumple-row">
                    <select value={form.mesCumple} onChange={e => setForm(f => ({ ...f, mesCumple: e.target.value, diaCumple: '' }))}>
                      <option value="">Mes</option>
                      {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={form.diaCumple} onChange={set('diaCumple')} disabled={!form.mesCumple}>
                      <option value="">Día</option>
                      {Array.from({ length: diasDisponibles }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <FieldError msg={errors.cumple} />
                </div>
                <div className="form-group">
                  <label>Estado civil</label>
                  <select value={form.estadoCivil} onChange={set('estadoCivil')}>
                    <option value="">Seleccionar...</option>
                    {ESTADOS_CIVILES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>

                {/* ¿Tiene pareja ya registrada? → se despliega la cédula */}
                <div className="form-group">
                  <label>¿Su pareja ya está registrada?</label>
                  <SiNo value={form.tienePareja} onChange={v => { setVal('tienePareja')(v); setParejaInfo(null); }} />
                </div>
                {form.tienePareja === 'si' && (
                  <div className="form-group masivo-desplegable">
                    <label>Cédula de la pareja</label>
                    <div className="masivo-inline">
                      <input value={form.parejaCedula} onChange={e => { setForm(f => ({ ...f, parejaCedula: onlyDigits(e.target.value).slice(0, 12) })); setParejaInfo(null); }} placeholder="Cédula de la pareja" inputMode="numeric" autoComplete="off" />
                      <button type="button" className="btn-clear-filtros" onClick={buscarPareja} disabled={parejaInfo?.loading}>Buscar</button>
                    </div>
                    {estadoPareja && <span className={estadoPareja.ok ? 'masivo-field-ok' : 'masivo-field-error'}>{estadoPareja.msg}</span>}
                    <FieldError msg={errors.parejaCedula} />
                  </div>
                )}

                {/* ¿Asiste? → se despliega lo necesario para asignarlo a una red */}
                <div className="form-group">
                  <label>¿Asiste a la iglesia?</label>
                  <SiNo value={form.asiste} onChange={setVal('asiste')} />
                </div>
                {form.asiste === 'si' && (
                  <>
                    <div className="form-group masivo-desplegable">
                      <label>Red a la que se asigna <span className="req">*</span></label>
                      <select value={form.redAsignada} onChange={set('redAsignada')}>
                        <option value="">Seleccionar...</option>
                        {REDES.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                      <FieldError msg={errors.redAsignada} />
                    </div>
                    <div className="form-group masivo-desplegable">
                      <label>A cargo de <span className="req">*</span></label>
                      <input value={form.aCargoDe} onChange={setFiltered('aCargoDe', v => onlyLetters(v).slice(0, 60))} placeholder="Líder responsable" autoComplete="off" />
                      <FieldError msg={errors.aCargoDe} />
                    </div>
                    <div className="form-group masivo-desplegable">
                      <label>Método de invitación</label>
                      <select value={form.metodoInvitacion} onChange={set('metodoInvitacion')}>
                        <option value="">Seleccionar...</option>
                        {METODOS_INVITACION.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* ¿Petición de oración? → se despliega el texto */}
                <div className="form-group">
                  <label>¿Tiene una petición de oración?</label>
                  <SiNo value={form.tienePeticion} onChange={setVal('tienePeticion')} />
                </div>
                {form.tienePeticion === 'si' && (
                  <div className="form-group masivo-desplegable" style={{ gridColumn: '1 / -1' }}>
                    <label>Petición de oración</label>
                    <textarea value={form.prayerRequest} onChange={set('prayerRequest')} rows="2" maxLength={500} autoComplete="off" />
                  </div>
                )}

                {/* Habeas Data */}
                <div className="form-group masivo-habeas" style={{ gridColumn: '1 / -1' }}>
                  <details>
                    <summary>Política de tratamiento de datos personales (Habeas Data)</summary>
                    <p>{HABEAS_DATA_TEXTO}</p>
                  </details>
                  <label className="masivo-check">
                    <input type="checkbox" checked={form.habeasData} onChange={e => setForm(f => ({ ...f, habeasData: e.target.checked }))} />
                    <span>La persona acepta la política de tratamiento de datos personales (Habeas Data).</span>
                  </label>
                  <FieldError msg={errors.habeasData} />
                </div>
              </div>

              {feedback && (
                <div className={feedback.type === 'success' ? 'consol-feedback-ok' : 'login-error'}>{feedback.msg}</div>
              )}
              <button className="btn-submit" style={{ background: '#1B2D45' }} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Registrar persona'}
              </button>
            </form>
          </div>
        )}

        {/* ── Unir con la pareja ── */}
        {tab === 'parejas' && (
          <div className="consol-register-card">
            <h2 className="consol-card-title">Unir con la pareja</h2>
            <p className="masivo-aviso">
              Escribe la cédula de cada persona (ambas deben estar registradas y sin pareja asignada).
            </p>
            <form onSubmit={handleUnir} noValidate className="consol-form" style={{ '--c1': '#1B2D45' }}>
              <div className="consol-fields-grid">
                <div className="form-group">
                  <label>Cédula de la primera persona</label>
                  <input value={uneA} onChange={e => setUneA(onlyDigits(e.target.value).slice(0, 12))} inputMode="numeric" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Cédula de su pareja</label>
                  <input value={uneB} onChange={e => setUneB(onlyDigits(e.target.value).slice(0, 12))} inputMode="numeric" autoComplete="off" />
                </div>
              </div>
              {uneMsg && <div className={uneMsg.type === 'success' ? 'consol-feedback-ok' : 'login-error'}>{uneMsg.msg}</div>}
              <button className="btn-submit" style={{ background: '#1B2D45' }} disabled={uniendo}>
                {uniendo ? 'Uniendo...' : 'Unir pareja'}
              </button>
            </form>
          </div>
        )}

        {/* ── Registrados en esta sesión ── */}
        {tab === 'sesion' && (
          <div className="consol-consulta-card">
            <p className="masivo-aviso">
              Por seguridad, este modo no puede consultar la base completa: aquí solo ves (y exportas) lo que registraste en esta sesión.
              La base general completa la consultan admin y pastor.
            </p>
            <PersonasGeneralTable personas={sesion} nombreArchivo="ingreso-masivo" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MasivoPanel;
