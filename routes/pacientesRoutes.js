const express = require('express');
const {
  getPacientes,
  postPaciente,
  removePaciente,
} = require('../controllers/pacientesController');

const router = express.Router();

router.get('/', getPacientes);
router.post('/', postPaciente);
router.delete('/:id', removePaciente);

module.exports = router;
