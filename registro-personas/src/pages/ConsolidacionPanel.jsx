import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCountByRed, addPerson, getAllPersons } from '../services/personService';
import PersonasTable from '../components/PersonasTable';

const REDES = [
  { id: 'xtreme',  nombre: 'XTREME',  color: '#4338CA' },
  { id: 'parejas', nombre: 'PAREJAS', color: '#BE185D' },
  { id: '360',     nombre: '360',     color: '#0369A1' },
  { id: 'senior',  nombre: 'SENIOR',  color: '#B45309' }
];

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const EMPTY_FORM = { nombre: '', apellido: '', telefono: '', aCargoDe: '', email: '', prayerRequest: '' };

const ConsolidacionPanel = () => {
  const navigate = useNavigate();
  const { logoutAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('registrar');
  const [counts, setCounts]           = useState({ xtreme: 0, parejas: 0, '360': 0, senior: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [selectedRed, setSelectedRed] = useState('xtreme');
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [feedback, setFeedback]       = useState(null);

  const [redConsulta, setRedConsulta]           = useState('xtreme');
  const [personas, setPersonas]                 = useState([]);
  const [loadingPersonas, setLoadingPersonas]   = useState(false);
  const [busqueda, setBusqueda]                 = useState('');

  useEffect(() => { loadCounts(); }, []);

  useEffect(() => {
    if (activeTab === 'consultar') loadPersonas(redConsulta);
  }, [activeTab, redConsulta]);

  const loadCounts = async () => {
    setLoadingCounts(true);
    const results = await Promise.all(REDES.map(r => getCountByRed(r.id)));
    const newCounts = {};
    REDES.forEach((r, i) => { newCounts[r.id] = results[i].count; });
    setCounts(newCounts);
    setLoadingCounts(false);
  };

  const loadPersonas = async (red) => {
    setLoadingPersonas(true);
    setPersonas([]);
    const result = await getAllPersons(red);
    if (result.success) setPersonas(result.data);
    setLoadingPersonas(false);
  };

  const handleChange = (field) => (e) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const result = await addPerson(selectedRed, {
      nombre:    form.nombre.trim(),
      apellido:  form.apellido.trim(),
      telefono:  form.telefono.trim(),
      aCargoDe:  form.aCargoDe.trim(),
      email:     form.email.trim(),
      prayerRequest: form.prayerRequest.trim(),
      edad: '', mesCumple: '', diaCumple: '', ausencias: 0,
      lastCallDate: null,
      callConfirmed: false
    });
    if (result.success) {
      const redNombre = REDES.find(r => r.id === selectedRed).nombre;
      setFeedback({ type: 'success', msg: `${form.nombre} registrado/a en ${redNombre}` });
      setForm(EMPTY_FORM);
      loadCounts();
    } else {
      setFeedback({ type: 'error', msg: result.error });
    }
    setSubmitting(false);
  };

  const handleLogout = () => { logoutAdmin(); navigate('/'); };

  const total     = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const redConfig = REDES.find(r => r.id === selectedRed);
  const redConsultaConfig = REDES.find(r => r.id === redConsulta);

  const personasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return personas;
    return personas.filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.telefono  || '').includes(q) ||
      (p.email     || '').toLowerCase().includes(q) ||
      (p.aCargoDe  || '').toLowerCase().includes(q) ||
      (p.prayerRequest || '').toLowerCase().includes(q)
    );
  }, [personas, busqueda]);

  return (
    <div className="consol-panel">
      <div className="consol-header">
        <div className="consol-header-left">
          <h1 className="consol-title">Consolidacion</h1>
          <p className="consol-subtitle">Panel de administracion</p>
        </div>
        <div className="consol-header-right">
          <button className="btn-lobby" onClick={() => navigate('/')}>Lobby</button>
          <button className="btn-cerrar-sesion" onClick={handleLogout}>Cerrar sesion</button>
        </div>
      </div>

      <div className="consol-body">
        {/* Stats */}
        <div className="consol-stats-row">
          <div className="consol-total-card">
            <span className="consol-total-num">{loadingCounts ? '—' : total}</span>
            <span className="consol-total-label">Total personas</span>
          </div>
          {REDES.map(red => (
            <div
              key={red.id}
              className="consol-net-stat"
              style={{ '--c1': red.color }}
            >
              <span className="consol-net-count-big">
                {loadingCounts ? '—' : counts[red.id]}
              </span>
              <span className="consol-net-name">{red.nombre}</span>
            </div>
          ))}
        </div>

        {/* Tabs principales */}
        <div className="consol-main-tabs">
          <button
            className={`consol-main-tab ${activeTab === 'registrar' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrar')}
          >
            Registrar persona
          </button>
          <button
            className={`consol-main-tab ${activeTab === 'consultar' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultar')}
          >
            Ver personas
          </button>
        </div>

        {/* Vista: Registrar */}
        {activeTab === 'registrar' && (
          <div className="consol-register-card">
            <h2 className="consol-card-title">Registrar nueva persona</h2>

            <div className="consol-red-tabs">
              {REDES.map(red => (
                <button
                  key={red.id}
                  type="button"
                  className={`consol-red-tab ${selectedRed === red.id ? 'active' : ''}`}
                  style={{ '--c1': red.color }}
                  onClick={() => { setSelectedRed(red.id); setFeedback(null); }}
                >
                  {red.nombre}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="consol-form"
              style={{ '--c1': redConfig.color }}
            >
              <div className="consol-fields-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={handleChange('nombre')} placeholder="Nombre" required autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input value={form.apellido} onChange={handleChange('apellido')} placeholder="Apellido" required autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Telefono *</label>
                  <input value={form.telefono} onChange={handleChange('telefono')} placeholder="+57 300 000 0000" type="tel" required autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input value={form.email} onChange={handleChange('email')} placeholder="correo@ejemplo.com" type="email" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>A cargo de</label>
                  <input value={form.aCargoDe} onChange={handleChange('aCargoDe')} placeholder="Lider responsable" autoComplete="off" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Peticion de oracion</label>
                  <textarea value={form.prayerRequest} onChange={handleChange('prayerRequest')} placeholder="Escribe una peticion de oracion (visible para todos los lideres)" rows="3" autoComplete="off" />
                </div>
              </div>

              {feedback && (
                <div className={feedback.type === 'success' ? 'consol-feedback-ok' : 'login-error'}>
                  {feedback.msg}
                </div>
              )}

              <button className="btn-submit" style={{ background: redConfig.color }} disabled={submitting}>
                {submitting ? 'Registrando...' : `Registrar en ${redConfig.nombre}`}
              </button>
            </form>
          </div>
        )}

        {/* Vista: Consultar */}
        {activeTab === 'consultar' && (
          <div className="consol-consulta-card">
            <div className="consol-red-tabs">
              {REDES.map(red => (
                <button
                  key={red.id}
                  type="button"
                  className={`consol-red-tab ${redConsulta === red.id ? 'active' : ''}`}
                  style={{ '--c1': red.color }}
                  onClick={() => { setRedConsulta(red.id); setBusqueda(''); }}
                >
                  {red.nombre}
                  {!loadingCounts && (
                    <span className="consol-tab-badge">{counts[red.id]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="form-group">
              <input
                className="search-input"
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, telefono, email..."
                style={{ '--c1': redConsultaConfig.color }}
              />
            </div>

            {loadingPersonas ? (
              <div className="loading">Cargando personas...</div>
            ) : (
              <PersonasTable
                personas={personas}
                red={redConsulta}
                redConfig={redConsultaConfig}
                busqueda={busqueda}
                onRefresh={() => loadPersonas(redConsulta)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsolidacionPanel;
