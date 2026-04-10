const express = require('express');
const {
  getSession,
  loginAdmin,
  logoutAdmin,
} = require('../controllers/authController');

const router = express.Router();

router.get('/session', getSession);
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);

module.exports = router;
