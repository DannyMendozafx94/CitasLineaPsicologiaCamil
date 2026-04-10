const express = require('express');
const { getCitas, postCita } = require('../controllers/citasController');

const router = express.Router();

router.get('/', getCitas);
router.post('/', postCita);

module.exports = router;
