const { randomUUID } = require('crypto');
const { readData, writeData } = require('./dataStore');
const { buildReminderEntries } = require('./recordatoriosService');
const { DATABASE_CONFIGURED, query, withTransaction } = require('./database');

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const hasCompleteDateTime = (value) => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
};

const toIsoString = (value) => {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const mapCitaRow = (row) => {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    fechaHora: toIsoString(row.fecha_hora),
    modalidad: row.modalidad,
    motivo: row.motivo || '',
    notas: row.notas || '',
    createdAt: toIsoString(row.created_at),
  };
};

const mapRecordatorioRow = (row) => {
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
  };
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

const listCitas = async () => {
  if (DATABASE_CONFIGURED) {
    const [citasResult, pacientesResult, recordatoriosResult] = await Promise.all([
      query('SELECT * FROM citas ORDER BY fecha_hora ASC'),
      query('SELECT * FROM pacientes'),
      query(`
        SELECT *
        FROM recordatorios
        WHERE estado = 'programado'
        ORDER BY programado_para ASC
      `),
    ]);

    const pacientes = pacientesResult.rows.map((row) => ({
      id: row.id,
      nombreCompleto: row.nombre_completo,
    }));
    const recordatorios = recordatoriosResult.rows.map(mapRecordatorioRow);

    return citasResult.rows
      .map(mapCitaRow)
      .map((cita) => enrichCita(cita, pacientes, recordatorios));
  }

  const data = readData();

  return data.citas
    .slice()
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
    .map((cita) => enrichCita(cita, data.pacientes, data.recordatorios));
};

const createCita = async (payload) => {
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

  if (DATABASE_CONFIGURED) {
    return withTransaction(async (client) => {
      const pacienteResult = await client.query(
        'SELECT id, nombre_completo FROM pacientes WHERE id = $1',
        [pacienteId]
      );

      if (!pacienteResult.rowCount) {
        throw new Error('El paciente seleccionado no existe.');
      }

      const paciente = {
        id: pacienteResult.rows[0].id,
        nombreCompleto: pacienteResult.rows[0].nombre_completo,
      };

      const cita = {
        id: randomUUID(),
        pacienteId,
        fechaHora: fechaCita.toISOString(),
        modalidad,
        motivo,
        notas,
        createdAt: new Date().toISOString(),
      };

      await client.query(
        `
          INSERT INTO citas (
            id,
            paciente_id,
            fecha_hora,
            modalidad,
            motivo,
            notas,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          cita.id,
          cita.pacienteId,
          cita.fechaHora,
          cita.modalidad,
          cita.motivo || null,
          cita.notas || null,
          cita.createdAt,
        ]
      );

      const nuevosRecordatorios = buildReminderEntries(cita, paciente);

      for (const recordatorio of nuevosRecordatorios) {
        await client.query(
          `
            INSERT INTO recordatorios (
              id,
              cita_id,
              paciente_id,
              tipo,
              horas_antes,
              mensaje,
              programado_para,
              estado,
              canal,
              enviado_en,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            recordatorio.id,
            recordatorio.citaId,
            recordatorio.pacienteId,
            recordatorio.tipo,
            recordatorio.horasAntes,
            recordatorio.mensaje,
            recordatorio.programadoPara,
            recordatorio.estado,
            recordatorio.canal,
            recordatorio.enviadoEn,
            recordatorio.createdAt,
          ]
        );
      }

      return {
        ...cita,
        pacienteNombre: paciente.nombreCompleto,
        recordatorios: nuevosRecordatorios,
      };
    });
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

const deleteCita = async (citaId) => {
  const id = normalizeValue(citaId);

  if (!id) {
    throw new Error('Debes indicar la cita a eliminar.');
  }

  if (DATABASE_CONFIGURED) {
    return withTransaction(async (client) => {
      const citaResult = await client.query('SELECT id FROM citas WHERE id = $1', [id]);

      if (!citaResult.rowCount) {
        throw new Error('La cita no existe.');
      }

      const recordatoriosResult = await client.query(
        'SELECT id FROM recordatorios WHERE cita_id = $1',
        [id]
      );

      await client.query('DELETE FROM citas WHERE id = $1', [id]);

      return {
        deletedCitaId: id,
        deletedRecordatorios: recordatoriosResult.rowCount,
      };
    });
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
