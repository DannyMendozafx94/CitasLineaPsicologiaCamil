const { getLoginRateState } = require('../services/loginRateLimitService');

const loginRateLimit = (req, res, next) => {
  const email = req.body?.email || '';
  const state = getLoginRateState(req, email);

  if (!state.isBlocked) {
    return next();
  }

  res.setHeader('Retry-After', String(state.retryAfterSeconds));
  return res.status(429).json({
    error: `Demasiados intentos. Intenta de nuevo en ${state.retryAfterSeconds} segundos.`,
  });
};

module.exports = { loginRateLimit };
