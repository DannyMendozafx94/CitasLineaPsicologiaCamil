const { getSessionByToken, readCookieToken } = require('../services/authService');

const getSessionFromRequest = (req) => {
  const token = readCookieToken(req.headers.cookie || '');

  if (!token) {
    return null;
  }

  return getSessionByToken(token);
};

const requireApiAuth = (req, res, next) => {
  const session = getSessionFromRequest(req);

  if (!session) {
    return res.status(401).json({ error: 'Sesion no valida. Inicia sesion.' });
  }

  req.session = session;
  return next();
};

const requirePageAuth = (req, res, next) => {
  const session = getSessionFromRequest(req);

  if (!session) {
    return res.redirect('/login');
  }

  req.session = session;
  return next();
};

const redirectIfAuthenticated = (req, res, next) => {
  const session = getSessionFromRequest(req);

  if (session) {
    return res.redirect('/dashboard');
  }

  return next();
};

module.exports = {
  requireApiAuth,
  requirePageAuth,
  redirectIfAuthenticated,
};
