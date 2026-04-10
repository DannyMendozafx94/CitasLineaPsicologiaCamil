const {
  createPaciente,
  deletePaciente,
  listPacientes,
} = require('../services/pacientesService');

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

const removePaciente = (req, res) => {
  try {
    const result = deletePaciente(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getPacientes, postPaciente, removePaciente };
