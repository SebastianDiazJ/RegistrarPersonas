import { useState, useEffect } from 'react';
import { getAllPersons, deletePerson } from '../services/personService';
import PersonCard from './PersonCard';

const PersonList = ({ refresh, onEdit }) => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    onEdit(person); // 🔥 ENVÍA PERSONA COMPLETA
  };

  useEffect(() => {
    loadPersons();
  }, [refresh]);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="person-list">
      {persons.map(person => (
        <PersonCard
          key={person.id}
          person={person}
          onDelete={() => handleDelete(person.id)}
          onEdit={() => handleEdit(person)}
        />
      ))}
    </div>
  );
};

export default PersonList;
