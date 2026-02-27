import { useState, useEffect, useMemo } from 'react';
import { getAllPersons, deletePerson } from '../services/personService';
import PersonCard from './PersonCard';

const PersonList = ({ refresh, onEdit }) => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadPersons = async () => {
    setLoading(true);
    const result = await getAllPersons();

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

    const result = await deletePerson(id);

    if (result.success) {
      setPersons(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleEdit = (person) => {
    onEdit(person);
  };

  const filteredPersons = useMemo(() => {
    return persons.filter(person =>
      person.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      person.apellido?.toLowerCase().includes(search.toLowerCase()) ||
      person.email?.toLowerCase().includes(search.toLowerCase()) ||
      person.telefono?.toLowerCase().includes(search.toLowerCase()) ||
      person.edad?.toLowerCase().includes(search.toLowerCase()) ||
      person.fechaNacimiento?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, persons]);

  const getBirthdaysToday = () => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return persons.filter(person => {
      if (!person.fechaNacimiento) return false;

      const birthDate = new Date(person.fechaNacimiento);
      return (
        birthDate.getMonth() === todayMonth &&
        birthDate.getDate() === todayDay
      );
    });
  };

  const birthdaysToday = getBirthdaysToday();

  const birthdaysThisWeek = useMemo(() => {
    const today = new Date();

    // Obtener lunes de esta semana
    const firstDayOfWeek = new Date(today);
    const day = today.getDay(); // 0 domingo, 1 lunes...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    firstDayOfWeek.setDate(today.getDate() + diffToMonday);

    // Obtener domingo de esta semana
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);

    return persons.filter(person => {
      if (!person.fechaNacimiento) return false;

      const birthDate = new Date(person.fechaNacimiento);

      // Crear fecha de cumpleaños en el año actual
      const birthdayThisYear = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      return (
        birthdayThisYear >= firstDayOfWeek &&
        birthdayThisYear <= lastDayOfWeek
      );
    });

  }, [persons]);

  useEffect(() => {
    loadPersons();
  }, [refresh]);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>

      <div className="form-group">
        <input
          type="text"
          placeholder="Buscar persona..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <p className="person-counter">
        Mostrando {filteredPersons.length} de {persons.length} personas
      </p>

      <p className="birthday-counter">
        🎂 Cumpleaños esta semana: {birthdaysThisWeek.length}
      </p>

      {birthdaysThisWeek.length > 0 && (
        <div className="birthday-box">
          <h4  className='nameBirthday'> 🎉 Cumpleaños de esta semana:</h4>
          {birthdaysThisWeek.map(p => {
            const birthDate = new Date(p.fechaNacimiento);
            const age = new Date().getFullYear() - birthDate.getFullYear();

            return (
              <p className='nameBirthday' key={p.id}>
                {p.nombre} {p.apellido} ({age} años)
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
            onEdit={() => handleEdit(person)}
          />
        ))}
      </div>

    </div>
  );
};

export default PersonList;