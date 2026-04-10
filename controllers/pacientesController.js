const {
  createPaciente,
  deletePaciente,
  listPacientes,
} = require('../services/pacientesService');

const getPacientes = async (req, res) => {
  try {
    res.json(await listPacientes());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const postPaciente = async (req, res) => {
  try {
    const paciente = await createPaciente(req.body);
    res.status(201).json(paciente);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removePaciente = async (req, res) => {
  try {
    const result = await deletePaciente(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getPacientes, postPaciente, removePaciente };
