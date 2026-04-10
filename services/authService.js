const { randomBytes } = require('crypto');
const {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  SESSION_COOKIE_NAME,
} = require('../config/admin');

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const REMEMBER_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const parseCookies = (cookieHeader) => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, item) => {
      const separatorIndex = item.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = item.slice(0, separatorIndex);
      const value = item.slice(separatorIndex + 1);
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
};

const readCookieToken = (cookieHeader) => {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
};

const getSessionByToken = (token) => {
  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
};

const validateAdminCredentials = ({ email, password }) => {
  const normalizedEmail = normalizeValue(email).toLowerCase();
  const normalizedPassword = normalizeValue(password);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Debes ingresar correo y contrasena.');
  }

  if (
    normalizedEmail !== ADMIN_EMAIL.toLowerCase() ||
    normalizedPassword !== ADMIN_PASSWORD
  ) {
    throw new Error('Correo o contrasena incorrectos.');
  }
};

const createSession = ({ email, password, rememberMe }) => {
  validateAdminCredentials({ email, password });

  const token = randomBytes(24).toString('hex');
  const durationMs = rememberMe ? REMEMBER_DURATION_MS : SESSION_DURATION_MS;
  const expiresAt = Date.now() + durationMs;

  const session = {
    token,
    rememberMe: Boolean(rememberMe),
    expiresAt,
    user: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
    },
  };

  sessions.set(token, session);
  return session;
};

const clearSession = (token) => {
  sessions.delete(token);
};

const serializeSessionCookie = (session) => {
  if (!session) {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }

  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
};

module.exports = {
  clearSession,
  createSession,
  getSessionByToken,
  parseCookies,
  readCookieToken,
  serializeSessionCookie,
};
