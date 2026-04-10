const {
  createCita,
  deleteCita,
  listCitas,
  updateCita,
} = require('../services/citasService');

const getCitas = async (req, res) => {
  try {
    res.json(await listCitas());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const postCita = async (req, res) => {
  try {
    const cita = await createCita(req.body);
    res.status(201).json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removeCita = async (req, res) => {
  try {
    const result = await deleteCita(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const putCita = async (req, res) => {
  try {
    const cita = await updateCita(req.params.id, req.body);
    res.json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { getCitas, postCita, putCita, removeCita };
