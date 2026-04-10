const { getDashboardData } = require('../services/recordatoriosService');

const getDashboard = async (req, res) => {
  try {
    res.json(await getDashboardData());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboard };
