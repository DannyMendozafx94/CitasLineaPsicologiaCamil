const { randomUUID } = require('crypto');
const {
  REMINDER_WINDOWS_HOURS,
  REMINDER_CHECK_INTERVAL_MS,
} = require('../config/server');
const { ensureDataFile, readData, writeData } = require('./dataStore');
const { DATABASE_CONFIGURED, query } = require('./database');

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

const toIsoString = (value) => {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const mapRecordatorioJoinRow = (row) => {
  return {
    id: row.id,
    citaId: row.cita_id,
    pacienteId: row.paciente_id,
    tipo: row.tipo,
    horasAntes: row.horas_antes,
    mensaje: row.mensaje,
    programadoPara: toIsoString(row.programado_para),
    estado: row.estado,
    canal: row.canal,
    enviadoEn: row.enviado_en ? toIsoString(row.enviado_en) : null,
    createdAt: toIsoString(row.created_at),
    pacienteNombre: row.paciente_nombre || 'Paciente no encontrado',
    fechaCita: row.fecha_cita ? toIsoString(row.fecha_cita) : null,
  };
};

const listRecordatorios = async () => {
  if (DATABASE_CONFIGURED) {
    const { rows } = await query(`
      SELECT
        r.*,
        p.nombre_completo AS paciente_nombre,
        c.fecha_hora AS fecha_cita
      FROM recordatorios r
      LEFT JOIN pacientes p ON p.id = r.paciente_id
      LEFT JOIN citas c ON c.id = r.cita_id
      WHERE r.estado = 'programado'
      ORDER BY r.programado_para ASC
    `);

    return rows.map(mapRecordatorioJoinRow);
  }

  const data = readData();

  return data.recordatorios
    .filter((recordatorio) => recordatorio.estado === 'programado')
    .slice()
    .sort((a, b) => new Date(a.programadoPara) - new Date(b.programadoPara))
    .map((recordatorio) =>
      enrichRecordatorio(recordatorio, data.pacientes, data.citas)
    );
};

const pruneOmittedReminders = async () => {
  if (DATABASE_CONFIGURED) {
    await query(`
      DELETE FROM recordatorios
      WHERE estado = 'omitido'
    `);
    return;
  }

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

const processDueReminders = async () => {
  if (DATABASE_CONFIGURED) {
    const { rows } = await query(`
      UPDATE recordatorios
      SET
        estado = 'enviado',
        enviado_en = NOW()
      WHERE estado = 'programado'
        AND programado_para <= NOW()
      RETURNING tipo, paciente_id
    `);

    rows.forEach((recordatorio) => {
      console.log(
        `[Recordatorio interno] ${recordatorio.tipo} enviado para paciente ${recordatorio.paciente_id}`
      );
    });

    return;
  }

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

const getDashboardData = async () => {
  if (DATABASE_CONFIGURED) {
    const now = new Date();
    const [pacientes, citas, recordatorios, resumenResult] = await Promise.all([
      query(`
        SELECT *
        FROM pacientes
        ORDER BY created_at DESC
      `),
      query(`
        SELECT
          c.*,
          p.nombre_completo AS paciente_nombre
        FROM citas c
        LEFT JOIN pacientes p ON p.id = c.paciente_id
        ORDER BY c.fecha_hora ASC
      `),
      listRecordatorios(),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'programado')::int AS total_programados,
          COUNT(*) FILTER (WHERE estado = 'enviado')::int AS total_enviados
        FROM recordatorios
      `),
    ]);

    const pacientesMap = pacientes.rows.map((row) => ({
      id: row.id,
      nombreCompleto: row.nombre_completo,
      telefono: row.telefono,
      email: row.email || '',
      fechaNacimiento: row.fecha_nacimiento || '',
      motivoConsulta: row.motivo_consulta || '',
      notas: row.notas || '',
      createdAt: toIsoString(row.created_at),
    }));

    const recordatoriosPorCita = recordatorios.reduce((accumulator, recordatorio) => {
      if (!accumulator[recordatorio.citaId]) {
        accumulator[recordatorio.citaId] = [];
      }

      accumulator[recordatorio.citaId].push(recordatorio);
      return accumulator;
    }, {});

    const citasMap = citas.rows
      .map((row) => ({
        id: row.id,
        pacienteId: row.paciente_id,
        pacienteNombre: row.paciente_nombre || 'Paciente no encontrado',
        fechaHora: toIsoString(row.fecha_hora),
        modalidad: row.modalidad,
        motivo: row.motivo || '',
        notas: row.notas || '',
        createdAt: toIsoString(row.created_at),
        recordatorios: recordatoriosPorCita[row.id] || [],
      }))
      .filter((cita) => new Date(cita.fechaHora) >= now);

    return {
      resumen: {
        totalPacientes: pacientesMap.length,
        totalCitasFuturas: citasMap.length,
        totalRecordatoriosProgramados: resumenResult.rows[0].total_programados,
        totalRecordatoriosEnviados: resumenResult.rows[0].total_enviados,
      },
      pacientes: pacientesMap.slice(0, 6),
      citas: citasMap.slice(0, 6),
      recordatorios: recordatorios.slice(0, 8),
      todosLosPacientes: [...pacientesMap].sort((a, b) =>
        a.nombreCompleto.localeCompare(b.nombreCompleto)
      ),
    };
  }

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

const initializeReminderWorker = async () => {
  if (!DATABASE_CONFIGURED) {
    ensureDataFile();
  }

  await pruneOmittedReminders();
  await processDueReminders();

  if (workerStarted) {
    return;
  }

  workerStarted = true;
  setInterval(() => {
    processDueReminders().catch((error) => {
      console.error('Error procesando recordatorios:', error.message);
    });
  }, REMINDER_CHECK_INTERVAL_MS);
};

module.exports = {
  buildReminderEntries,
  getDashboardData,
  initializeReminderWorker,
  listRecordatorios,
  pruneOmittedReminders,
};
