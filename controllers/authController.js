const {
  clearLoginRateLimit,
  createSession,
  clearSession,
  getSessionByToken,
  registerFailedLogin,
  readCookieToken,
  serializeSessionCookie,
} = require('../services/authService');
const { ADMIN_EMAIL, ADMIN_NAME } = require('../config/admin');

const getSession = (req, res) => {
  const token = readCookieToken(req.headers.cookie || '');
  const session = token ? getSessionByToken(token) : null;

  if (!session) {
    return res.status(401).json({ error: 'Sesion no activa.' });
  }

  return res.json({
    authenticated: true,
    user: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
    },
  });
};

const loginAdmin = (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const session = createSession({ email, password, rememberMe });
    clearLoginRateLimit(req, email);

    res.setHeader('Set-Cookie', serializeSessionCookie(session));
    return res.json({
      message: 'Inicio de sesion exitoso.',
      user: session.user,
    });
  } catch (error) {
    const state = registerFailedLogin(req, req.body?.email || '');

    if (state.isBlocked) {
      res.setHeader('Retry-After', String(state.retryAfterSeconds));
      return res.status(429).json({
        error: `Demasiados intentos. Intenta de nuevo en ${state.retryAfterSeconds} segundos.`,
      });
    }

    return res.status(401).json({
      error: `${error.message} Te quedan ${state.remainingAttempts} intentos antes del bloqueo temporal.`,
    });
  }
};

const logoutAdmin = (req, res) => {
  const token = readCookieToken(req.headers.cookie || '');

  if (token) {
    clearSession(token);
  }

  res.setHeader('Set-Cookie', serializeSessionCookie(null));
  return res.json({ message: 'Sesion cerrada.' });
};

module.exports = { getSession, loginAdmin, logoutAdmin };
