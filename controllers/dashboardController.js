const { getDashboardData } = require('../services/recordatoriosService');

const getDashboard = (req, res) => {
  res.json(getDashboardData());
};

module.exports = { getDashboard };
