const { readData } = require('./dataStore');
const { DATABASE_CONFIGURED, query, withTransaction } = require('./database');

const importLegacyDataIfNeeded = async () => {
  if (!DATABASE_CONFIGURED) {
    return;
  }

  const { rows } = await query('SELECT COUNT(*)::int AS count FROM pacientes');

  if (rows[0].count > 0) {
    return;
  }

  const data = readData();

  if (!data.pacientes.length && !data.citas.length && !data.recordatorios.length) {
    return;
  }

  await withTransaction(async (client) => {
    for (const paciente of data.pacientes) {
      await client.query(
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
    }

    for (const cita of data.citas) {
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
    }

    for (const recordatorio of data.recordatorios) {
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
  });
};

module.exports = { importLegacyDataIfNeeded };
