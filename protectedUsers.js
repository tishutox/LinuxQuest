const PROTECTED_EMAILS = Object.freeze([
  'armand.patrick.asztalos@tha.de'
]);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isProtectedEmail(email) {
  return PROTECTED_EMAILS.includes(normalizeEmail(email));
}

module.exports = {
  PROTECTED_EMAILS,
  isProtectedEmail,
  normalizeEmail
};