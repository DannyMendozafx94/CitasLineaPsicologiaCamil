const {
  createSession,
  clearSession,
  getSessionByToken,
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

    res.setHeader('Set-Cookie', serializeSessionCookie(session));
    return res.json({
      message: 'Inicio de sesion exitoso.',
      user: session.user,
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
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
