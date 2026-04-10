const { createCita, deleteCita, listCitas } = require('../services/citasService');

const getCitas = (req, res) => {
  res.json(listCitas());
};

const postCita = (req, res) => {
  try {
    const cita = createCita(req.body);
    res.status(201).json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removeCita = (req, res) => {
  try {
    const result = deleteCita(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getCitas, postCita, removeCita };
