const express = require('express');
const { getRecordatorios } = require('../controllers/recordatoriosController');

const router = express.Router();

router.get('/', getRecordatorios);

module.exports = router;
