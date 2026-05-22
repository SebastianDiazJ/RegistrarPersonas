import { useState, useEffect, useMemo } from 'react';
import { getAllPersons, deletePerson, markAbsence, resetAbsences } from '../services/personService';
import PersonCard from './PersonCard';

const MESES = [
  '','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const AUSENCIAS_ALERTA = 3;

const PersonList = ({ red, refresh, onEdit }) => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [alertOpen, setAlertOpen] = useState(true);

  const loadPersons = async () => {
    setLoading(true);
    const result = await getAllPersons(red);
    if (result.success) {
      setPersons(result.data);
      setError('');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta persona?')) return;
    const result = await deletePerson(red, id);
    if (result.success) setPersons(prev => prev.filter(p => p.id !== id));
  };

  const handleAbsence = async (id) => {
    const result = await markAbsence(red, id);
    if (result.success) {
      setPersons(prev => prev.map(p =>
        p.id === id ? { ...p, ausencias: (p.ausencias || 0) + 1 } : p
      ));
    }
  };

  const handleResetAbsences = async (id) => {
    if (!window.confirm('¿Reiniciar el contador de ausencias?')) return;
    const result = await resetAbsences(red, id);
    if (result.success) {
      setPersons(prev => prev.map(p =>
        p.id === id ? { ...p, ausencias: 0 } : p
      ));
    }
  };

  const opcionesCargo = useMemo(() => {
    const nombres = persons
      .map(p => p.aCargoDe?.trim())
      .filter(Boolean);
    return [...new Set(nombres)].sort();
  }, [persons]);

  const filteredPersons = useMemo(() => {
    return persons.filter(person => {
      const matchSearch =
        !search ||
        person.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        person.apellido?.toLowerCase().includes(search.toLowerCase()) ||
        person.email?.toLowerCase().includes(search.toLowerCase()) ||
        person.telefono?.toLowerCase().includes(search.toLowerCase()) ||
        String(person.edad)?.includes(search);

      const matchCargo =
        !filtroCargo ||
        person.aCargoDe?.toLowerCase() === filtroCargo.toLowerCase();

      return matchSearch && matchCargo;
    });
  }, [search, filtroCargo, persons]);

  const getBirthdayLabel = (person) => {
    if (person.mesCumple && person.diaCumple) {
      return { mes: parseInt(person.mesCumple), dia: parseInt(person.diaCumple) };
    }
    if (person.fechaNacimiento) {
      const parts = person.fechaNacimiento.split('-');
      return { mes: parseInt(parts[1]), dia: parseInt(parts[2]) };
    }
    return null;
  };

  const birthdaysToday = useMemo(() => {
    const today = new Date();
    return persons.filter(p => {
      const b = getBirthdayLabel(p);
      if (!b) return false;
      return b.mes === today.getMonth() + 1 && b.dia === today.getDate();
    });
  }, [persons]);

  const birthdaysThisWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return persons.filter(p => {
      const b = getBirthdayLabel(p);
      if (!b) return false;
      const thisYear = new Date(today.getFullYear(), b.mes - 1, b.dia);
      return thisYear >= monday && thisYear <= sunday;
    });
  }, [persons]);

  const personasAusentes = useMemo(() =>
    persons.filter(p => (p.ausencias || 0) >= AUSENCIAS_ALERTA)
  , [persons]);

  useEffect(() => {
    loadPersons();
  }, [refresh, red]);

  if (loading) return <p className="loading">Cargando...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div>
      <div className="form-group">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {opcionesCargo.length > 0 && (
        <div className="form-group">
          <select
            className="filtro-cargo-select"
            value={filtroCargo}
            onChange={e => setFiltroCargo(e.target.value)}
          >
            <option value="">👤 Todos — A cargo de</option>
            {opcionesCargo.map(nombre => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
        </div>
      )}

      <p className="person-counter">
        Mostrando {filteredPersons.length} de {persons.length} personas
      </p>

      {/* Alerta de ausencias */}
      {personasAusentes.length > 0 && (
        <div className="ausentes-alert">
          <button
            className="ausentes-alert-header"
            onClick={() => setAlertOpen(o => !o)}
          >
            <span>📵 {personasAusentes.length} persona{personasAusentes.length > 1 ? 's' : ''} con {AUSENCIAS_ALERTA}+ ausencias — ¡Llámalas!</span>
            <span className="alert-toggle">{alertOpen ? '▲' : '▼'}</span>
          </button>
          {alertOpen && (
            <div className="ausentes-list">
              {personasAusentes.map(p => (
                <div key={p.id} className="ausente-item">
                  <div className="ausente-info">
                    <span className="ausente-nombre">{p.nombre} {p.apellido}</span>
                    {p.aCargoDe && <span className="ausente-cargo">A cargo de: {p.aCargoDe}</span>}
                  </div>
                  <div className="ausente-right">
                    <span className="ausente-count">{p.ausencias} aus.</span>
                    {p.telefono && (
                      <a className="ausente-tel" href={`tel:${p.telefono}`}>
                        📱 {p.telefono}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cumpleaños hoy */}
      {birthdaysToday.length > 0 && (
        <p className="birthday-counter">
          🎂 Cumpleaños HOY: {birthdaysToday.map(p => p.nombre).join(', ')}
        </p>
      )}

      {/* Cumpleaños semana */}
      <p className="birthday-counter">
        🎂 Cumpleaños esta semana: {birthdaysThisWeek.length}
      </p>

      {birthdaysThisWeek.length > 0 && (
        <div className="birthday-box">
          <h4 className="nameBirthday">🎉 Cumpleaños de esta semana:</h4>
          {birthdaysThisWeek.map(p => {
            const b = getBirthdayLabel(p);
            const mesLabel = b ? MESES[b.mes] : '';
            return (
              <p className="nameBirthday" key={p.id}>
                {p.nombre} {p.apellido} — {b?.dia} de {mesLabel}
              </p>
            );
          })}
        </div>
      )}

      <div className="person-list">
        {filteredPersons.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            onDelete={() => handleDelete(person.id)}
            onEdit={() => onEdit(person)}
            onAbsence={handleAbsence}
            onResetAbsences={handleResetAbsences}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonList;
