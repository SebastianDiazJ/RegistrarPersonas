import { useState, useEffect } from 'react';
import { addPerson, updatePerson } from '../services/personService';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const diasPorMes = (mes) => {
  const dias30 = [4, 6, 9, 11];
  if (mes === 2) return 29;
  if (dias30.includes(mes)) return 30;
  return 31;
};

const RegisterForm = ({ red, selectedPerson, onFinish }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    edad: '',
    email: '',
    telefono: '',
    mesCumple: '',
    diaCumple: '',
    aCargoDe: ''
  });

  useEffect(() => {
    if (selectedPerson) {
      let mes = '';
      let dia = '';
      if (selectedPerson.fechaNacimiento) {
        const parts = selectedPerson.fechaNacimiento.split('-');
        if (parts.length >= 2) {
          mes = String(parseInt(parts[1]));
          dia = String(parseInt(parts[2] || parts[1]));
          if (parts.length === 2) { mes = parts[0]; dia = parts[1]; }
        }
      }
      if (selectedPerson.mesCumple) mes = selectedPerson.mesCumple;
      if (selectedPerson.diaCumple) dia = selectedPerson.diaCumple;

      setForm({
        nombre: selectedPerson.nombre || '',
        apellido: selectedPerson.apellido || '',
        edad: selectedPerson.edad || '',
        email: selectedPerson.email || '',
        telefono: selectedPerson.telefono || '',
        mesCumple: mes,
        diaCumple: dia,
        aCargoDe: selectedPerson.aCargoDe || ''
      });
    }
  }, [selectedPerson]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { mesCumple, diaCumple, ...rest } = form;

    const personData = {
      ...rest,
      mesCumple,
      diaCumple,
      fechaNacimiento: mesCumple && diaCumple
        ? `2000-${String(mesCumple).padStart(2,'0')}-${String(diaCumple).padStart(2,'0')}`
        : ''
    };

    if (selectedPerson) {
      await updatePerson(red, selectedPerson.id, personData);
    } else {
      await addPerson(red, personData);
    }
    onFinish();
    setForm({ nombre: '', apellido: '', edad: '', email: '', telefono: '', mesCumple: '', diaCumple: '', aCargoDe: '' });
  };

  const diasDisponibles = form.mesCumple ? diasPorMes(parseInt(form.mesCumple)) : 31;

  return (
    <div className="register-form">
      <h2>{selectedPerson ? 'Editar persona' : 'Registrar persona'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre</label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>Apellido</label>
          <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>Correo electrónico</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>Edad</label>
          <input type="number" value={form.edad} onChange={e => setForm({ ...form, edad: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>Cumpleaños</label>
          <div className="cumple-row">
            <select
              value={form.mesCumple}
              onChange={e => setForm({ ...form, mesCumple: e.target.value, diaCumple: '' })}
              required
            >
              <option value="">Mes</option>
              {MESES.map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
            <select
              value={form.diaCumple}
              onChange={e => setForm({ ...form, diaCumple: e.target.value })}
              required
              disabled={!form.mesCumple}
            >
              <option value="">Día</option>
              {Array.from({ length: diasDisponibles }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>A cargo de</label>
          <input
            value={form.aCargoDe}
            onChange={e => setForm({ ...form, aCargoDe: e.target.value })}
            placeholder="Nombre del responsable"
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
