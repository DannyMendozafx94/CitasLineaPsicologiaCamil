const express = require('express');
const { getPacientes, postPaciente } = require('../controllers/pacientesController');

const router = express.Router();

router.get('/', getPacientes);
router.post('/', postPaciente);

module.exports = router;
