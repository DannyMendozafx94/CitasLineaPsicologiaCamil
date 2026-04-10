const { listRecordatorios } = require('../services/recordatoriosService');

const getRecordatorios = async (req, res) => {
  try {
    res.json(await listRecordatorios());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getRecordatorios };
