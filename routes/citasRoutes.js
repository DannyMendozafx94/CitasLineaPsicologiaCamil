const express = require('express');
const {
  getCitas,
  postCita,
  putCita,
  removeCita,
} = require('../controllers/citasController');

const router = express.Router();

router.get('/', getCitas);
router.post('/', postCita);
router.put('/:id', putCita);
router.delete('/:id', removeCita);

module.exports = router;
