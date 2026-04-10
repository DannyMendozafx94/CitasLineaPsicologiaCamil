const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
const DATABASE_CONFIGURED = Boolean(DATABASE_URL);

const pool = DATABASE_CONFIGURED
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null;

const query = async (text, params = []) => {
  if (!pool) {
    throw new Error('DATABASE_URL no esta configurada.');
  }

  return pool.query(text, params);
};

const withTransaction = async (callback) => {
  if (!pool) {
    throw new Error('DATABASE_URL no esta configurada.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const initializeDatabase = async () => {
  if (!DATABASE_CONFIGURED) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id TEXT PRIMARY KEY,
      nombre_completo TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT,
      fecha_nacimiento DATE,
      motivo_consulta TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS citas (
      id TEXT PRIMARY KEY,
      paciente_id TEXT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
      fecha_hora TIMESTAMPTZ NOT NULL,
      modalidad TEXT NOT NULL,
      motivo TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS recordatorios (
      id TEXT PRIMARY KEY,
      cita_id TEXT NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
      paciente_id TEXT NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      horas_antes INTEGER NOT NULL,
      mensaje TEXT NOT NULL,
      programado_para TIMESTAMPTZ NOT NULL,
      estado TEXT NOT NULL,
      canal TEXT NOT NULL,
      enviado_en TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);
};

module.exports = {
  DATABASE_CONFIGURED,
  initializeDatabase,
  query,
  withTransaction,
};
