import { useState, useEffect } from 'react';
import { addPerson, updatePerson } from '../services/personService';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const METODOS_INVITACION = [
  'Publicidad', 'Volante', 'Familiar', 'Amigo', 'Redes sociales', 'Otro'
];

const diasPorMes = (mes) => {
  const dias30 = [4, 6, 9, 11];
  if (mes === 2) return 29;
  if (dias30.includes(mes)) return 30;
  return 31;
};

const todayISO = () => new Date().toISOString().split('T')[0];

const RegisterForm = ({ red, selectedPerson, onFinish }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    edad: '',
    email: '',
    telefono: '',
    mesCumple: '',
    diaCumple: '',
    aCargoDe: '',
    metodoInvitacion: '',
    fechaIngreso: todayISO(),
    prayerRequest: ''
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
        aCargoDe: selectedPerson.aCargoDe || '',
        metodoInvitacion: selectedPerson.metodoInvitacion || '',
        fechaIngreso: selectedPerson.fechaIngreso || todayISO(),
        prayerRequest: selectedPerson.prayerRequest || ''
      });
    } else {
      setForm(f => ({ ...f, fechaIngreso: todayISO() }));
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
    setForm({
      nombre: '', apellido: '', edad: '', email: '', telefono: '',
      mesCumple: '', diaCumple: '', aCargoDe: '',
      metodoInvitacion: '', fechaIngreso: todayISO(), prayerRequest: ''
    });
  };

  const diasDisponibles = form.mesCumple ? diasPorMes(parseInt(form.mesCumple)) : 31;
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="register-form">
      <h2>{selectedPerson ? 'Editar persona' : 'Registrar persona'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre</label>
          <input value={form.nombre} onChange={set('nombre')} required placeholder="Nombre" />
        </div>

        <div className="form-group">
          <label>Apellido</label>
          <input value={form.apellido} onChange={set('apellido')} required placeholder="Apellido" />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input value={form.telefono} onChange={set('telefono')} required placeholder="+57 300 000 0000" type="tel" />
        </div>

        <div className="form-group">
          <label>Correo electrónico</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
        </div>

        <div className="form-group">
          <label>Edad</label>
          <input type="number" value={form.edad} onChange={set('edad')} required min="1" max="120" placeholder="25" />
        </div>

        <div className="form-group">
          <label>Cumpleaños</label>
          <div className="cumple-row">
            <select value={form.mesCumple} onChange={e => setForm(f => ({ ...f, mesCumple: e.target.value, diaCumple: '' }))} required>
              <option value="">Mes</option>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={form.diaCumple} onChange={set('diaCumple')} required disabled={!form.mesCumple}>
              <option value="">Día</option>
              {Array.from({ length: diasDisponibles }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Fecha de ingreso</label>
          <input type="date" value={form.fechaIngreso} onChange={set('fechaIngreso')} />
        </div>

        <div className="form-group">
          <label>Método de invitación</label>
          <select value={form.metodoInvitacion} onChange={set('metodoInvitacion')}>
            <option value="">Seleccionar...</option>
            {METODOS_INVITACION.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>A cargo de</label>
          <input value={form.aCargoDe} onChange={set('aCargoDe')} placeholder="Nombre del responsable" />
        </div>

        <div className="form-group">
          <label>Petición de oración</label>
          <textarea value={form.prayerRequest} onChange={set('prayerRequest')} rows="2" placeholder="(opcional)" />
        </div>

        <button className="btn-submit">
          {selectedPerson ? 'Actualizar' : 'Registrar'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
