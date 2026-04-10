const { randomUUID } = require('crypto');
const { readData, writeData } = require('./dataStore');

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const listPacientes = () => {
  const data = readData();

  return data.pacientes
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createPaciente = (payload) => {
  const nombreCompleto = normalizeValue(payload.nombreCompleto);
  const telefono = normalizeValue(payload.telefono);
  const email = normalizeValue(payload.email);
  const fechaNacimiento = normalizeValue(payload.fechaNacimiento);
  const motivoConsulta = normalizeValue(payload.motivoConsulta);
  const notas = normalizeValue(payload.notas);

  if (!nombreCompleto) {
    throw new Error('El nombre completo del paciente es obligatorio.');
  }

  if (!telefono) {
    throw new Error('El telefono del paciente es obligatorio.');
  }

  const data = readData();

  const paciente = {
    id: randomUUID(),
    nombreCompleto,
    telefono,
    email,
    fechaNacimiento,
    motivoConsulta,
    notas,
    createdAt: new Date().toISOString(),
  };

  data.pacientes.push(paciente);
  writeData(data);

  return paciente;
};

const deletePaciente = (pacienteId) => {
  const id = normalizeValue(pacienteId);

  if (!id) {
    throw new Error('Debes indicar el paciente a eliminar.');
  }

  const data = readData();
  const paciente = data.pacientes.find((item) => item.id === id);

  if (!paciente) {
    throw new Error('El paciente no existe.');
  }

  const citaIds = data.citas
    .filter((cita) => cita.pacienteId === id)
    .map((cita) => cita.id);

  data.pacientes = data.pacientes.filter((item) => item.id !== id);
  data.citas = data.citas.filter((cita) => cita.pacienteId !== id);
  data.recordatorios = data.recordatorios.filter(
    (recordatorio) =>
      recordatorio.pacienteId !== id && !citaIds.includes(recordatorio.citaId)
  );

  writeData(data);

  return {
    deletedPacienteId: id,
    deletedCitas: citaIds.length,
  };
};

module.exports = { createPaciente, deletePaciente, listPacientes };
