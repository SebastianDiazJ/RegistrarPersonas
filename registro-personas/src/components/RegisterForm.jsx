import { useState, useEffect } from 'react';
import { addPerson, updatePerson } from '../services/personService';

const RegisterForm = ({ selectedPerson, onFinish }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    edad: '',
    email: '',
    telefono: ''
  });

  useEffect(() => {
    if (selectedPerson) {
      console.log('Datos de la persona seleccionada:', selectedPerson);
      setForm({
        nombre: selectedPerson.nombre || '',
        apellido: selectedPerson.apellido || '',
        edad: selectedPerson.edad || '',
        email: selectedPerson.email || '',
        telefono: selectedPerson.telefono || ''
      });
    }
  }, [selectedPerson]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedPerson) {
      await updatePerson(selectedPerson.id, form);
    } else {
      await addPerson(form);
    }

    onFinish();
    setForm({ nombre: '', apellido: '', edad: '', email: '', telefono: '' });
  };

  return (
    <div className="register-form">
      <h2>{selectedPerson ? 'Editar persona' : 'Registrar persona'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Apellido</label>
          <input
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Edad</label>
          <input
            type="number"
            value={form.edad}
            onChange={(e) => setForm({ ...form, edad: e.target.value })}
            required
          />
        </div>

        <button className="btn-submit">
          {selectedPerson ? 'Actualizar' : 'Registrar'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
