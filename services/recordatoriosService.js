const { randomUUID } = require('crypto');
const {
  REMINDER_WINDOWS_HOURS,
  REMINDER_CHECK_INTERVAL_MS,
} = require('../config/server');
const { ensureDataFile, readData, writeData } = require('./dataStore');

let workerStarted = false;

const buildReminderMessage = (paciente, cita, hoursBefore) => {
  const citaTexto = new Date(cita.fechaHora).toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `Avisar a ${paciente.nombreCompleto} ${hoursBefore} horas antes de la cita del ${citaTexto}.`;
};

const buildReminderEntries = (cita, paciente) => {
  return REMINDER_WINDOWS_HOURS.map((hoursBefore) => {
    const reminderDate = new Date(
      new Date(cita.fechaHora).getTime() - hoursBefore * 60 * 60 * 1000
    );

    return {
      id: randomUUID(),
      citaId: cita.id,
      pacienteId: paciente.id,
      tipo: `${hoursBefore}h`,
      horasAntes: hoursBefore,
      mensaje: buildReminderMessage(paciente, cita, hoursBefore),
      programadoPara: reminderDate.toISOString(),
      estado: 'programado',
      canal: 'interno',
      enviadoEn: null,
      createdAt: new Date().toISOString(),
    };
  }).filter((recordatorio) => new Date(recordatorio.programadoPara) > new Date());
};

const enrichRecordatorio = (recordatorio, pacientes, citas) => {
  const paciente = pacientes.find((item) => item.id === recordatorio.pacienteId);
  const cita = citas.find((item) => item.id === recordatorio.citaId);

  return {
    ...recordatorio,
    pacienteNombre: paciente ? paciente.nombreCompleto : 'Paciente no encontrado',
    fechaCita: cita ? cita.fechaHora : null,
  };
};

const listRecordatorios = () => {
  const data = readData();

  return data.recordatorios
    .filter((recordatorio) => recordatorio.estado === 'programado')
    .slice()
    .sort((a, b) => new Date(a.programadoPara) - new Date(b.programadoPara))
    .map((recordatorio) =>
      enrichRecordatorio(recordatorio, data.pacientes, data.citas)
    );
};

const pruneOmittedReminders = () => {
  const data = readData();
  const filteredRecordatorios = data.recordatorios.filter(
    (recordatorio) => recordatorio.estado !== 'omitido'
  );

  if (filteredRecordatorios.length === data.recordatorios.length) {
    return;
  }

  writeData({
    ...data,
    recordatorios: filteredRecordatorios,
  });
};

const processDueReminders = () => {
  const data = readData();
  const now = new Date();
  let changed = false;

  data.recordatorios = data.recordatorios.map((recordatorio) => {
    if (recordatorio.estado !== 'programado') {
      return recordatorio;
    }

    if (new Date(recordatorio.programadoPara) > now) {
      return recordatorio;
    }

    changed = true;
    console.log(
      `[Recordatorio interno] ${recordatorio.tipo} enviado para paciente ${recordatorio.pacienteId}`
    );

    return {
      ...recordatorio,
      estado: 'enviado',
      enviadoEn: now.toISOString(),
    };
  });

  if (changed) {
    writeData(data);
  }
};

const getDashboardData = () => {
  const data = readData();
  const now = new Date();
  const citasEnriquecidas = data.citas
    .map((cita) => ({
      ...cita,
      pacienteNombre:
        data.pacientes.find((item) => item.id === cita.pacienteId)?.nombreCompleto ||
        'Paciente no encontrado',
      recordatorios: data.recordatorios.filter(
        (item) => item.citaId === cita.id && item.estado === 'programado'
      ),
    }))
    .filter((cita) => new Date(cita.fechaHora) >= now)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

  const recordatoriosEnriquecidos = data.recordatorios
    .filter((recordatorio) => recordatorio.estado === 'programado')
    .map((recordatorio) =>
      enrichRecordatorio(recordatorio, data.pacientes, data.citas)
    )
    .sort((a, b) => new Date(a.programadoPara) - new Date(b.programadoPara));

  return {
    resumen: {
      totalPacientes: data.pacientes.length,
      totalCitasFuturas: citasEnriquecidas.length,
      totalRecordatoriosProgramados: data.recordatorios.filter(
        (item) => item.estado === 'programado'
      ).length,
      totalRecordatoriosEnviados: data.recordatorios.filter(
        (item) => item.estado === 'enviado'
      ).length,
    },
    pacientes: data.pacientes
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6),
    citas: citasEnriquecidas.slice(0, 6),
    recordatorios: recordatoriosEnriquecidos.slice(0, 8),
    todosLosPacientes: data.pacientes
      .slice()
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)),
  };
};

const initializeReminderWorker = () => {
  ensureDataFile();
  pruneOmittedReminders();
  processDueReminders();

  if (workerStarted) {
    return;
  }

  workerStarted = true;
  setInterval(processDueReminders, REMINDER_CHECK_INTERVAL_MS);
};

module.exports = {
  buildReminderEntries,
  getDashboardData,
  initializeReminderWorker,
  listRecordatorios,
  pruneOmittedReminders,
};
