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
      person.edad?.toLowerCase().includes(search.toLowerCase()) 
    );
  }, [search, persons]);

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