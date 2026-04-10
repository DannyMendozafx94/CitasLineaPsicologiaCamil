const { randomUUID } = require('crypto');
const { readData, writeData } = require('./dataStore');
const { buildReminderEntries } = require('./recordatoriosService');

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const hasCompleteDateTime = (value) => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
};

const enrichCita = (cita, pacientes, recordatorios) => {
  const paciente = pacientes.find((item) => item.id === cita.pacienteId);
  const reminders = recordatorios
    .filter((item) => item.citaId === cita.id && item.estado === 'programado')
    .sort((a, b) => new Date(a.programadoPara) - new Date(b.programadoPara));

  return {
    ...cita,
    pacienteNombre: paciente ? paciente.nombreCompleto : 'Paciente no encontrado',
    recordatorios: reminders,
  };
};

const listCitas = () => {
  const data = readData();

  return data.citas
    .slice()
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
    .map((cita) => enrichCita(cita, data.pacientes, data.recordatorios));
};

const createCita = (payload) => {
  const pacienteId = normalizeValue(payload.pacienteId);
  const fechaHora = normalizeValue(payload.fechaHora);
  const modalidad = normalizeValue(payload.modalidad) || 'Presencial';
  const motivo = normalizeValue(payload.motivo);
  const notas = normalizeValue(payload.notas);

  if (!pacienteId) {
    throw new Error('Debes seleccionar un paciente.');
  }

  if (!fechaHora) {
    throw new Error('Debes indicar la fecha y hora de la cita.');
  }

  if (!hasCompleteDateTime(fechaHora)) {
    throw new Error('Debes ingresar una fecha y hora completas para la cita.');
  }

  const fechaCita = new Date(fechaHora);

  if (Number.isNaN(fechaCita.getTime())) {
    throw new Error('La fecha de la cita no es valida.');
  }

  if (fechaCita <= new Date()) {
    throw new Error('La cita debe programarse en una fecha futura.');
  }

  const data = readData();
  const paciente = data.pacientes.find((item) => item.id === pacienteId);

  if (!paciente) {
    throw new Error('El paciente seleccionado no existe.');
  }

  const cita = {
    id: randomUUID(),
    pacienteId,
    fechaHora: fechaCita.toISOString(),
    modalidad,
    motivo,
    notas,
    createdAt: new Date().toISOString(),
  };

  const nuevosRecordatorios = buildReminderEntries(cita, paciente);

  data.citas.push(cita);
  data.recordatorios.push(...nuevosRecordatorios);
  writeData(data);

  return enrichCita(cita, data.pacientes, data.recordatorios);
};

const deleteCita = (citaId) => {
  const id = normalizeValue(citaId);

  if (!id) {
    throw new Error('Debes indicar la cita a eliminar.');
  }

  const data = readData();
  const cita = data.citas.find((item) => item.id === id);

  if (!cita) {
    throw new Error('La cita no existe.');
  }

  const deletedReminders = data.recordatorios.filter(
    (recordatorio) => recordatorio.citaId === id
  ).length;

  data.citas = data.citas.filter((item) => item.id !== id);
  data.recordatorios = data.recordatorios.filter(
    (recordatorio) => recordatorio.citaId !== id
  );

  writeData(data);

  return {
    deletedCitaId: id,
    deletedRecordatorios: deletedReminders,
  };
};

module.exports = { createCita, deleteCita, listCitas };
