const express = require('express');
const {
  getSession,
  loginAdmin,
  logoutAdmin,
} = require('../controllers/authController');
const { loginRateLimit } = require('../middleware/loginRateLimitMiddleware');

const router = express.Router();

router.get('/session', getSession);
router.post('/login', loginRateLimit, loginAdmin);
router.post('/logout', logoutAdmin);

module.exports = router;
