const express = require('express');
const { getCitas, postCita, removeCita } = require('../controllers/citasController');

const router = express.Router();

router.get('/', getCitas);
router.post('/', postCita);
router.delete('/:id', removeCita);

module.exports = router;
