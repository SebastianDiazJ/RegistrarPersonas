import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCountByRed, addPerson, getAllPersons } from '../services/personService';

const REDES = [
  { id: 'xtreme',  nombre: 'XTREME',  emoji: '🔥', color1: '#667eea', color2: '#764ba2' },
  { id: 'parejas', nombre: 'PAREJAS', emoji: '💑', color1: '#f093fb', color2: '#f5576c' },
  { id: '360',     nombre: '360',     emoji: '🌐', color1: '#4facfe', color2: '#00f2fe' },
];

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const EMPTY_FORM = { nombre: '', apellido: '', telefono: '', aCargoDe: '' };

const ConsolidacionPanel = () => {
  const navigate = useNavigate();
  const { logoutAdmin } = useAuth();

  // vista principal
  const [activeTab, setActiveTab] = useState('registrar');

  // stats
  const [counts, setCounts]           = useState({ xtreme: 0, parejas: 0, '360': 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  // registro
  const [selectedRed, setSelectedRed] = useState('xtreme');
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [feedback, setFeedback]       = useState(null);

  // consulta
  const [redConsulta, setRedConsulta]       = useState('xtreme');
  const [personas, setPersonas]             = useState([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [busqueda, setBusqueda]             = useState('');

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
      email: '', edad: '', mesCumple: '', diaCumple: '', ausencias: 0,
    });
    if (result.success) {
      const redNombre = REDES.find(r => r.id === selectedRed).nombre;
      setFeedback({ type: 'success', msg: `¡${form.nombre} registrado/a en ${redNombre}!` });
      setForm(EMPTY_FORM);
      loadCounts();
    } else {
      setFeedback({ type: 'error', msg: result.error });
    }
    setSubmitting(false);
  };

  const handleLogout = () => { logoutAdmin(); navigate('/'); };

  const total      = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const redConfig  = REDES.find(r => r.id === selectedRed);
  const redConsultaConfig = REDES.find(r => r.id === redConsulta);

  const personasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return personas;
    return personas.filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.telefono  || '').includes(q) ||
      (p.email     || '').toLowerCase().includes(q) ||
      (p.aCargoDe  || '').toLowerCase().includes(q)
    );
  }, [personas, busqueda]);

  return (
    <div className="consol-panel">
      {/* Header */}
      <div className="consol-header">
        <div className="consol-header-left">
          <h1 className="consol-title">⚙️ Consolidación</h1>
          <p className="consol-subtitle">Panel de administración</p>
        </div>
        <div className="consol-header-right">
          <button className="btn-lobby" onClick={() => navigate('/')}>← Lobby</button>
          <button className="btn-cerrar-sesion" onClick={handleLogout}>Cerrar sesión</button>
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
              style={{ '--c1': red.color1, '--c2': red.color2 }}
            >
              <span className="consol-net-emoji">{red.emoji}</span>
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
            ✏️ Registrar persona
          </button>
          <button
            className={`consol-main-tab ${activeTab === 'consultar' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultar')}
          >
            👥 Ver personas
          </button>
        </div>

        {/* ── Vista: Registrar ── */}
        {activeTab === 'registrar' && (
          <div className="consol-register-card">
            <h2 className="consol-card-title">Registrar nueva persona</h2>

            <div className="consol-red-tabs">
              {REDES.map(red => (
                <button
                  key={red.id}
                  type="button"
                  className={`consol-red-tab ${selectedRed === red.id ? 'active' : ''}`}
                  style={{ '--c1': red.color1, '--c2': red.color2 }}
                  onClick={() => { setSelectedRed(red.id); setFeedback(null); }}
                >
                  {red.emoji} {red.nombre}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="consol-form"
              style={{ '--c1': redConfig.color1, '--c2': redConfig.color2 }}
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
                  <label>Teléfono *</label>
                  <input value={form.telefono} onChange={handleChange('telefono')} placeholder="+57 300 000 0000" type="tel" required autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>A cargo de</label>
                  <input value={form.aCargoDe} onChange={handleChange('aCargoDe')} placeholder="Líder responsable" autoComplete="off" />
                </div>
              </div>

              {feedback && (
                <div className={feedback.type === 'success' ? 'consol-feedback-ok' : 'login-error'}>
                  {feedback.type === 'success' ? '✅ ' : '❌ '}{feedback.msg}
                </div>
              )}

              <button className="btn-submit" disabled={submitting}>
                {submitting ? 'Registrando...' : `Registrar en ${redConfig.nombre} ${redConfig.emoji}`}
              </button>
            </form>
          </div>
        )}

        {/* ── Vista: Consultar ── */}
        {activeTab === 'consultar' && (
          <div className="consol-consulta-card">
            {/* Selector de red */}
            <div className="consol-red-tabs" style={{ marginBottom: '1.25rem' }}>
              {REDES.map(red => (
                <button
                  key={red.id}
                  type="button"
                  className={`consol-red-tab ${redConsulta === red.id ? 'active' : ''}`}
                  style={{ '--c1': red.color1, '--c2': red.color2 }}
                  onClick={() => { setRedConsulta(red.id); setBusqueda(''); }}
                >
                  {red.emoji} {red.nombre}
                  {!loadingCounts && (
                    <span className="consol-tab-badge">{counts[red.id]}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <input
                className="search-input"
                style={{ '--c1': redConsultaConfig.color1 }}
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, teléfono, email o líder…"
              />
            </div>

            {/* Contador */}
            {!loadingPersonas && (
              <p className="consol-lista-meta">
                {personasFiltradas.length === personas.length
                  ? `${personas.length} persona${personas.length !== 1 ? 's' : ''} en ${redConsultaConfig.nombre}`
                  : `${personasFiltradas.length} resultado${personasFiltradas.length !== 1 ? 's' : ''} de ${personas.length}`}
              </p>
            )}

            {/* Lista */}
            {loadingPersonas ? (
              <div className="loading">Cargando personas…</div>
            ) : personasFiltradas.length === 0 ? (
              <div className="consol-empty">
                {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay personas en esta red.'}
              </div>
            ) : (
              <div className="consol-personas-list">
                {personasFiltradas.map(p => (
                  <PersonaRow key={p.id} persona={p} redConfig={redConsultaConfig} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PersonaRow = ({ persona: p, redConfig }) => {
  const [expanded, setExpanded] = useState(false);

  const cumple = p.mesCumple && p.diaCumple
    ? `${p.diaCumple} ${MESES[parseInt(p.mesCumple, 10) - 1]}`
    : null;

  const ausencias = p.ausencias || 0;
  const ausenciaClass = ausencias === 0
    ? 'consol-badge-ok'
    : ausencias <= 2
      ? 'consol-badge-warn'
      : 'consol-badge-danger';

  return (
    <div
      className="consol-persona-row"
      style={{ '--c1': redConfig.color1, '--c2': redConfig.color2 }}
    >
      <button
        className="consol-persona-summary"
        onClick={() => setExpanded(e => !e)}
        type="button"
      >
        <div className="consol-persona-main">
          <span className="consol-persona-nombre">{p.nombre} {p.apellido}</span>
          {p.aCargoDe && (
            <span className="consol-persona-cargo">A cargo de: {p.aCargoDe}</span>
          )}
        </div>
        <div className="consol-persona-right">
          {ausencias > 0 && (
            <span className={`consol-ausencia-badge ${ausenciaClass}`}>
              {ausencias} aus.
            </span>
          )}
          <span className="consol-expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="consol-persona-detail">
          {p.telefono  && <DetailRow icon="📞" text={p.telefono} href={`tel:${p.telefono}`} />}
          {p.email     && <DetailRow icon="✉️" text={p.email}    href={`mailto:${p.email}`} />}
          {p.edad      && <DetailRow icon="🎂" text={`${p.edad} años`} />}
          {cumple      && <DetailRow icon="🎉" text={`Cumpleaños: ${cumple}`} />}
          {p.aCargoDe  && <DetailRow icon="👤" text={`Líder: ${p.aCargoDe}`} />}
          <DetailRow
            icon="📊"
            text={`Ausencias: ${ausencias}`}
            badge={ausenciaClass}
          />
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon, text, href, badge }) => (
  <div className={`consol-detail-row ${badge ? badge : ''}`}>
    <span>{icon}</span>
    {href
      ? <a href={href} className="consol-detail-link">{text}</a>
      : <span>{text}</span>
    }
  </div>
);

export default ConsolidacionPanel;
