const fs = require('fs');
const path = require('path');
const { DATA_FILE } = require('../config/server');

const EMPTY_DATA = {
  pacientes: [],
  citas: [],
  recordatorios: [],
};

const ensureDataFile = () => {
  const folder = path.dirname(DATA_FILE);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DATA, null, 2));
  }
};

const readData = () => {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');

  if (!raw.trim()) {
    return { ...EMPTY_DATA };
  }

  const parsed = JSON.parse(raw);

  return {
    pacientes: parsed.pacientes || [],
    citas: parsed.citas || [],
    recordatorios: parsed.recordatorios || [],
  };
};

const writeData = (data) => {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

module.exports = { ensureDataFile, readData, writeData };
