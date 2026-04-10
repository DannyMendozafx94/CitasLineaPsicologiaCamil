const {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  LOGIN_LOCKOUT_MS,
} = require('../config/security');

const loginAttempts = new Map();

const normalizeValue = (value) => {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const buildAttemptKey = (req, email = '') => {
  return `${getClientIp(req)}::${normalizeValue(email) || 'anonymous'}`;
};

const clearExpiredEntries = () => {
  const now = Date.now();

  for (const [key, entry] of loginAttempts.entries()) {
    const windowExpired = now - entry.firstAttemptAt > LOGIN_WINDOW_MS;
    const lockExpired = !entry.lockedUntil || entry.lockedUntil <= now;

    if (windowExpired && lockExpired) {
      loginAttempts.delete(key);
    }
  }
};

const getLoginRateState = (req, email = '') => {
  clearExpiredEntries();

  const key = buildAttemptKey(req, email);
  const entry = loginAttempts.get(key);
  const now = Date.now();

  if (!entry) {
    return {
      key,
      isBlocked: false,
      remainingAttempts: LOGIN_MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  const windowExpired = now - entry.firstAttemptAt > LOGIN_WINDOW_MS;

  if (windowExpired && (!entry.lockedUntil || entry.lockedUntil <= now)) {
    loginAttempts.delete(key);
    return {
      key,
      isBlocked: false,
      remainingAttempts: LOGIN_MAX_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  const isBlocked = Boolean(entry.lockedUntil && entry.lockedUntil > now);
  const retryAfterSeconds = isBlocked
    ? Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000))
    : 0;

  return {
    key,
    isBlocked,
    remainingAttempts: Math.max(0, LOGIN_MAX_ATTEMPTS - entry.count),
    retryAfterSeconds,
  };
};

const registerFailedLogin = (req, email = '') => {
  clearExpiredEntries();

  const key = buildAttemptKey(req, email);
  const now = Date.now();
  const currentEntry = loginAttempts.get(key);
  const shouldResetWindow =
    !currentEntry || now - currentEntry.firstAttemptAt > LOGIN_WINDOW_MS;

  const entry = shouldResetWindow
    ? {
        count: 0,
        firstAttemptAt: now,
        lockedUntil: null,
      }
    : currentEntry;

  entry.count += 1;

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }

  loginAttempts.set(key, entry);
  return getLoginRateState(req, email);
};

const clearLoginRateLimit = (req, email = '') => {
  const key = buildAttemptKey(req, email);
  loginAttempts.delete(key);
};

module.exports = {
  clearLoginRateLimit,
  getLoginRateState,
  registerFailedLogin,
};
