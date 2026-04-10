const express = require('express');
const {
  getPacientes,
  postPaciente,
  putPaciente,
  removePaciente,
} = require('../controllers/pacientesController');

const router = express.Router();

router.get('/', getPacientes);
router.post('/', postPaciente);
router.put('/:id', putPaciente);
router.delete('/:id', removePaciente);

module.exports = router;
