const express = require('express');
const pacientesRoutes = require('./pacientesRoutes');
const citasRoutes = require('./citasRoutes');
const recordatoriosRoutes = require('./recordatoriosRoutes');
const dashboardRoutes = require('./dashboardRoutes');

const router = express.Router();

router.use('/pacientes', pacientesRoutes);
router.use('/citas', citasRoutes);
router.use('/recordatorios', recordatoriosRoutes);
router.use('/dashboard', dashboardRoutes);

router.get('/status', (req, res) => {
  res.json({ message: 'API de citas funcionando' });
});

module.exports = router;
