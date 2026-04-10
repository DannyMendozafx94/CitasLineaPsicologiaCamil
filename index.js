const path = require('path');
const express = require('express');
const { PORT } = require('./config/server');
const apiRoutes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const {
  requireApiAuth,
  requirePageAuth,
  redirectIfAuthenticated,
} = require('./middleware/authMiddleware');
const { initializeDatabase } = require('./services/database');
const { importLegacyDataIfNeeded } = require('./services/bootstrapDataService');
const { initializeReminderWorker } = require('./services/recordatoriosService');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api', requireApiAuth, apiRoutes);

const startServer = async () => {
  await initializeDatabase();
  await importLegacyDataIfNeeded();
  await initializeReminderWorker();

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('No se pudo iniciar la aplicacion:', error.message);
  process.exit(1);
});
