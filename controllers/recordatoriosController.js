const { listRecordatorios } = require('../services/recordatoriosService');

const getRecordatorios = (req, res) => {
  res.json(listRecordatorios());
};

module.exports = { getRecordatorios };
