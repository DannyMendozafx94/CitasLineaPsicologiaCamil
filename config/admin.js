const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@psicologa.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Psicologa Administradora';
const SESSION_COOKIE_NAME = 'admin_session';

module.exports = {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  SESSION_COOKIE_NAME,
};
