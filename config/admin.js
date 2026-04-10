const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'camilazampon@psicologa.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Holacami123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Psicologa Camila Zambrano Ponce';
const SESSION_COOKIE_NAME = 'admin_session';

module.exports = {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
  SESSION_COOKIE_NAME,
};
