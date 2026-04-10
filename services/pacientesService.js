const { randomUUID } = require('crypto');
const { readData, writeData } = require('./dataStore');
const { DATABASE_CONFIGURED, query, withTransaction } = require('./database');

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const mapPacienteRow = (row) => {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    telefono: row.telefono,
    email: row.email || '',
    fechaNacimiento: row.fecha_nacimiento || '',
    motivoConsulta: row.motivo_consulta || '',
    notas: row.notas || '',
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
};

const listPacientes = async () => {
  if (DATABASE_CONFIGURED) {
    const { rows } = await query(`
      SELECT *
      FROM pacientes
      ORDER BY created_at DESC
    `);

    return rows.map(mapPacienteRow);
  }

  const data = readData();

  return data.pacientes
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createPaciente = async (payload) => {
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

  if (DATABASE_CONFIGURED) {
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

    await query(
      `
        INSERT INTO pacientes (
          id,
          nombre_completo,
          telefono,
          email,
          fecha_nacimiento,
          motivo_consulta,
          notas,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        paciente.id,
        paciente.nombreCompleto,
        paciente.telefono,
        paciente.email || null,
        paciente.fechaNacimiento || null,
        paciente.motivoConsulta || null,
        paciente.notas || null,
        paciente.createdAt,
      ]
    );

    return paciente;
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

const refreshPatientReminderMessages = async (updater, paciente) => {
  const citasResult = await updater.query(
    `
      SELECT id, fecha_hora
      FROM citas
      WHERE paciente_id = $1
    `,
    [paciente.id]
  );

  for (const cita of citasResult.rows) {
    const citaTexto = new Date(cita.fecha_hora).toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await updater.query(
      `
        UPDATE recordatorios
        SET mensaje = CONCAT(
          'Avisar a ',
          $1,
          ' ',
          horas_antes,
          ' horas antes de la cita del ',
          $2,
          '.'
        )
        WHERE cita_id = $3
      `,
      [paciente.nombreCompleto, citaTexto, cita.id]
    );
  }
};

const updatePaciente = async (pacienteId, payload) => {
  const id = normalizeValue(pacienteId);
  const nombreCompleto = normalizeValue(payload.nombreCompleto);
  const telefono = normalizeValue(payload.telefono);
  const email = normalizeValue(payload.email);
  const fechaNacimiento = normalizeValue(payload.fechaNacimiento);
  const motivoConsulta = normalizeValue(payload.motivoConsulta);
  const notas = normalizeValue(payload.notas);

  if (!id) {
    throw new Error('Debes indicar el paciente a editar.');
  }

  if (!nombreCompleto) {
    throw new Error('El nombre completo del paciente es obligatorio.');
  }

  if (!telefono) {
    throw new Error('El telefono del paciente es obligatorio.');
  }

  if (DATABASE_CONFIGURED) {
    return withTransaction(async (client) => {
      const existingResult = await client.query(
        'SELECT id, created_at FROM pacientes WHERE id = $1',
        [id]
      );

      if (!existingResult.rowCount) {
        throw new Error('El paciente no existe.');
      }

      await client.query(
        `
          UPDATE pacientes
          SET
            nombre_completo = $2,
            telefono = $3,
            email = $4,
            fecha_nacimiento = $5,
            motivo_consulta = $6,
            notas = $7
          WHERE id = $1
        `,
        [
          id,
          nombreCompleto,
          telefono,
          email || null,
          fechaNacimiento || null,
          motivoConsulta || null,
          notas || null,
        ]
      );

      const paciente = {
        id,
        nombreCompleto,
        telefono,
        email,
        fechaNacimiento,
        motivoConsulta,
        notas,
        createdAt: existingResult.rows[0].created_at.toISOString(),
      };

      await refreshPatientReminderMessages(client, paciente);
      return paciente;
    });
  }

  const data = readData();
  const index = data.pacientes.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error('El paciente no existe.');
  }

  const updatedPaciente = {
    ...data.pacientes[index],
    nombreCompleto,
    telefono,
    email,
    fechaNacimiento,
    motivoConsulta,
    notas,
  };

  data.pacientes[index] = updatedPaciente;

  data.recordatorios = data.recordatorios.map((recordatorio) => {
    if (recordatorio.pacienteId !== id) {
      return recordatorio;
    }

    const cita = data.citas.find((item) => item.id === recordatorio.citaId);
    const citaTexto = cita
      ? new Date(cita.fechaHora).toLocaleString('es-EC', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';

    return {
      ...recordatorio,
      mensaje: `Avisar a ${nombreCompleto} ${recordatorio.horasAntes} horas antes de la cita del ${citaTexto}.`,
    };
  });

  writeData(data);
  return updatedPaciente;
};

const deletePaciente = async (pacienteId) => {
  const id = normalizeValue(pacienteId);

  if (!id) {
    throw new Error('Debes indicar el paciente a eliminar.');
  }

  if (DATABASE_CONFIGURED) {
    return withTransaction(async (client) => {
      const pacienteResult = await client.query(
        'SELECT id FROM pacientes WHERE id = $1',
        [id]
      );

      if (!pacienteResult.rowCount) {
        throw new Error('El paciente no existe.');
      }

      const citasResult = await client.query(
        'SELECT id FROM citas WHERE paciente_id = $1',
        [id]
      );

      await client.query('DELETE FROM pacientes WHERE id = $1', [id]);

      return {
        deletedPacienteId: id,
        deletedCitas: citasResult.rowCount,
      };
    });
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

module.exports = {
  createPaciente,
  deletePaciente,
  listPacientes,
  updatePaciente,
};
