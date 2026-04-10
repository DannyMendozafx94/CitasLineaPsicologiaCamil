const { createPaciente, listPacientes } = require('../services/pacientesService');

const getPacientes = (req, res) => {
  res.json(listPacientes());
};

const postPaciente = (req, res) => {
  try {
    const paciente = createPaciente(req.body);
    res.status(201).json(paciente);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getPacientes, postPaciente };
