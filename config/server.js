const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, '..', 'data', 'app-data.json');
const REMINDER_WINDOWS_HOURS = [24, 2];
const REMINDER_CHECK_INTERVAL_MS = 60 * 1000;

module.exports = {
  PORT,
  DATA_FILE,
  REMINDER_WINDOWS_HOURS,
  REMINDER_CHECK_INTERVAL_MS,
};
